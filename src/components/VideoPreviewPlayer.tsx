import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { SequenceConfig, SequenceSlide } from '../types';
import { drawFrame, loadImages, type ImageMap } from '../utils/canvasRenderer';
import { recordVideo, recordingFormat } from '../utils/videoRecorder';
import { audioEngine } from '../utils/audioSynthesizer';
import { downloadBlob } from '../utils/download';

export interface PreviewHandle { record: () => void }
interface Props { slides: SequenceSlide[]; config: SequenceConfig; busy: boolean; onBusy: (value: boolean) => void; onError: (message: string) => void; musicRevision: number }
export const VideoPreviewPlayer = forwardRef<PreviewHandle, Props>(function VideoPreviewPlayer({ slides, config, busy, onBusy, onError, musicRevision }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null), images = useRef<ImageMap>(new Map());
  const time = useRef(0), playing = useRef(false), abort = useRef<AbortController | null>(null);
  const [displayTime, setDisplayTime] = useState(0), [isPlaying, setPlaying] = useState(false);
  const [ready, setReady] = useState(false), [progress, setProgress] = useState(0), [muted, setMuted] = useState(false);
  const [imageError, setImageError] = useState('');
  const total = slides.reduce((sum, slide) => sum + slide.duration, 0);
  const format = recordingFormat();
  useEffect(() => {
    const controller = new AbortController();
    setReady(false); setImageError(''); playing.current = false; setPlaying(false); audioEngine.stop();
    time.current = 0; setDisplayTime(0); images.current = new Map();
    loadImages(slides, controller.signal).then(map => {
      if (!controller.signal.aborted) { images.current = map; setReady(true); }
    }).catch(error => {
      if (!controller.signal.aborted) setImageError(error instanceof Error ? error.message : 'No se pudieron cargar las fotos.');
    });
    return () => controller.abort();
  }, [slides]);
  useEffect(() => {
    audioEngine.setStyle(config.musicTrack); audioEngine.setVolume(muted ? 0 : config.musicVolume);
    if (playing.current) audioEngine.play(time.current);
  }, [config.musicTrack, config.musicVolume, muted, musicRevision]);
  useEffect(() => {
    let frame = 0, last = performance.now(), lastUi = 0, lastDraw = -1;
    const tick = (now: number) => {
      if (playing.current) {
        time.current += (now - last) / 1000;
        if (time.current >= total) { time.current = 0; audioEngine.play(0); }
      }
      last = now;
      if (canvas.current && (playing.current || lastDraw !== time.current)) {
        drawFrame(canvas.current, slides, config, images.current, time.current); lastDraw = time.current;
      }
      if (now - lastUi > 100) { setDisplayTime(time.current); lastUi = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const hidden = () => { if (document.hidden) { playing.current = false; setPlaying(false); audioEngine.stop(); } };
    document.addEventListener('visibilitychange', hidden);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', hidden); };
  }, [slides, config, total, ready]);
  useEffect(() => () => { abort.current?.abort(); audioEngine.stop(); }, []);
  const toggle = async () => {
    if (!ready || !total || busy) return;
    try {
      if (playing.current) { playing.current = false; audioEngine.stop(); }
      else { await audioEngine.resume(); playing.current = true; audioEngine.setVolume(muted ? 0 : config.musicVolume); audioEngine.play(time.current); }
      setPlaying(playing.current);
    } catch (error) { onError(error instanceof Error ? error.message : 'No se pudo iniciar el audio.'); }
  };
  const record = async () => {
    if (!ready || !total || busy || abort.current) { onError('Conectá las fotos y esperá a que termine la carga.'); return; }
    playing.current = false; setPlaying(false); audioEngine.stop();
    abort.current = new AbortController(); onBusy(true); setProgress(0);
    try {
      const result = await recordVideo(slides, config, images.current, abort.current.signal, setProgress);
      downloadBlob(result.blob, (config.name || 'AutoReel') + '.' + result.extension);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) onError(error instanceof Error ? error.message : 'No se pudo grabar el video.');
    } finally { abort.current = null; onBusy(false); setProgress(0); }
  };
  useImperativeHandle(ref, () => ({ record: () => { void record(); } }));
  return <section className="panel space-y-4">
    <div className="flex justify-between gap-3"><h2 className="font-bold">Vista previa</h2><span className="text-xs text-neutral-400">{config.width} × {config.height} · {config.fps} FPS</span></div>
    <div className="relative mx-auto max-h-[65vh] max-w-full overflow-hidden rounded-2xl border border-neutral-700 bg-black" style={{ aspectRatio: config.width / config.height, width: config.width >= config.height ? '100%' : 'min(100%,340px)' }}>
      <canvas ref={canvas} width={Math.min(720,config.width)} height={Math.round(config.height * Math.min(720,config.width) / config.width)} aria-label="Vista previa del montaje" className="h-full w-full" />
      {!slides.length && <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-neutral-400">Conectá tus fotos y aplicá una selección para empezar.</div>}
    </div>
    {imageError && <p role="alert" className="text-sm text-amber-300">{imageError}</p>}
    <label className="block text-xs text-neutral-400">Posición · {displayTime.toFixed(1)} / {total.toFixed(1)} s
      <input aria-label="Posición del video" type="range" min="0" max={total || 1} step="0.05" value={Math.min(displayTime,total)} disabled={busy || !ready} onChange={e => { time.current = Number(e.target.value); setDisplayTime(time.current); if (playing.current) audioEngine.play(time.current); }} className="mt-2 w-full accent-indigo-500" /></label>
    <div className="flex flex-wrap gap-2">
      <button onClick={() => void toggle()} disabled={busy || !ready || !total} className="control">{isPlaying ? 'Pausar' : 'Reproducir'}</button>
      <button onClick={() => setMuted(value => !value)} disabled={busy} className="control">{muted ? 'Activar sonido' : 'Silenciar'}</button>
      <button onClick={() => void record()} disabled={busy || !ready || !total || !format} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">Grabar {format?.extension.toUpperCase() ?? 'video'}</button>
    </div>
    {busy && <div role="status" className="space-y-2"><p className="text-sm">Grabando · {progress}% · Mantené esta pestaña visible.</p><progress value={progress} max={100} className="w-full" /><button className="control" onClick={() => abort.current?.abort()}>Cancelar grabación</button></div>}
    <p className="text-xs text-neutral-500">Se graba en tiempo real, hasta 5 minutos. {format?.extension === 'webm' ? 'Tu navegador ofrece WebM; para MP4 probá Chrome o Edge actualizado.' : 'El video incluye los textos, fondos, movimientos y audio del editor.'}</p>
  </section>;
});

