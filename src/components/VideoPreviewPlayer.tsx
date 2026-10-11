import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { SequenceConfig, SequenceSlide } from '../types';
import { drawFrame, loadImages, type ImageMap } from '../utils/canvasRenderer';
import { recordVideo, recordingFormat } from '../utils/videoRecorder';
import { audioEngine } from '../utils/audioSynthesizer';
import { downloadBlob } from '../utils/download';
import { Download, Pause, Play, PlusCircle, RotateCcw, Volume2, VolumeX } from 'lucide-react';

export interface PreviewHandle { record: () => void }
interface Props { slides: SequenceSlide[]; config: SequenceConfig; busy: boolean; onBusy: (value: boolean) => void; onError: (message: string) => void; musicRevision: number; libraryCount: number; onUseAll: () => void }
export const VideoPreviewPlayer = forwardRef<PreviewHandle, Props>(function VideoPreviewPlayer({ slides, config, busy, onBusy, onError, musicRevision, libraryCount, onUseAll }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<ImageMap>(() => new Map());
  const time = useRef(0), playing = useRef(false), abort = useRef<AbortController | null>(null);
  const [displayTime, setDisplayTime] = useState(0), [isPlaying, setPlaying] = useState(false);
  const [ready, setReady] = useState(false), [progress, setProgress] = useState(0), [muted, setMuted] = useState(false);
  const [imageError, setImageError] = useState('');
  const total = slides.reduce((sum, slide) => sum + slide.duration, 0);
  const format = recordingFormat();
  useEffect(() => {
    const controller = new AbortController();
    setReady(false); setImageError(''); playing.current = false; setPlaying(false); audioEngine.stop();
    time.current = 0; setDisplayTime(0); setImages(new Map());
    loadImages(slides, controller.signal).then(map => {
      if (!controller.signal.aborted) { setImages(map); setReady(true); }
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
        drawFrame(canvas.current, slides, config, images, time.current); lastDraw = time.current;
      }
      if (now - lastUi > 100) { setDisplayTime(time.current); lastUi = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const hidden = () => { if (document.hidden) { playing.current = false; setPlaying(false); audioEngine.stop(); } };
    document.addEventListener('visibilitychange', hidden);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', hidden); };
  }, [slides, config, total, ready, images]);
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
      const result = await recordVideo(slides, config, images, abort.current.signal, setProgress);
      downloadBlob(result.blob, (config.name || 'AutoReel') + '.' + result.extension);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) onError(error instanceof Error ? error.message : 'No se pudo grabar el video.');
    } finally { abort.current = null; onBusy(false); setProgress(0); }
  };
  useImperativeHandle(ref, () => ({ record: () => { void record(); } }));
  return <section className="panel space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-indigo-500" />Previsualización {config.aspectRatio} en Vivo</h2><span className="font-mono text-[11px] text-neutral-400">{config.width} × {config.height} · {config.fps} FPS</span></div>
    <div className="preview-device" style={config.width >= config.height ? { width: '100%' } : undefined}>
      <div aria-hidden="true" className="preview-notch"><span className="h-2.5 w-2.5 rounded-full border border-neutral-700 bg-neutral-950" /><span className="h-1 w-10 rounded-full bg-neutral-800" /></div>
      <div className="preview-screen" style={{ aspectRatio: config.width / config.height }}>
        <canvas ref={canvas} width={Math.min(720,config.width)} height={Math.round(config.height * Math.min(720,config.width) / config.width)} aria-label="Vista previa del montaje" className="block h-full w-full" />
        {!slides.length && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <span aria-hidden="true" className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4"><PlusCircle className="h-8 w-8 text-indigo-400" /></span>
          <div><p className="text-sm font-semibold text-neutral-200">Tu próximo reel empieza acá</p><p className="mt-2 text-xs leading-relaxed text-neutral-400">{libraryCount ? 'Ya conectaste tus fotos. Agregalas al montaje para verlas acá.' : 'Conectá tus fotos y aplicá una selección para empezar.'}</p></div>
          {libraryCount > 0 && <button className="primary-button" disabled={busy} onClick={onUseAll}>Armar reel con todas las fotos</button>}
        </div>}
        {slides.length > 0 && !ready && !imageError && <div role="status" className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-indigo-300">Preparando vista previa…</div>}
        {ready && total > 0 && !busy && <button aria-label={isPlaying ? 'Pausar vista previa' : 'Reproducir vista previa'} onClick={() => void toggle()}
          className={'absolute inset-0 flex items-center justify-center transition ' + (isPlaying ? 'opacity-0 hover:opacity-100 focus-visible:opacity-100' : 'bg-black/20 backdrop-blur-[2px]')}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600/90 text-white shadow-xl shadow-indigo-600/40">{isPlaying ? <Pause aria-hidden="true" className="h-7 w-7 fill-current" /> : <Play aria-hidden="true" className="ml-1 h-8 w-8 fill-current" />}</span>
        </button>}
        {busy && progress > 0 && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 p-6 text-center"><span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /><p className="text-sm font-bold">Grabando tu video…</p><p className="font-mono text-xs text-indigo-300">{progress}%</p></div>}
      </div>
    </div>
    {imageError && <p role="alert" className="text-sm text-amber-300">{imageError}</p>}
    <div className="mx-auto max-w-[350px] space-y-2">
      <input aria-label="Posición del video" type="range" min="0" max={total || 1} step="0.05" value={Math.min(displayTime,total)} disabled={busy || !ready} onChange={e => { time.current = Number(e.target.value); setDisplayTime(time.current); if (playing.current) audioEngine.play(time.current); }} className="w-full accent-indigo-500" />
      <div className="flex justify-between gap-2 font-mono text-[11px] text-neutral-400"><span>{displayTime.toFixed(1)}s</span><span className="text-neutral-500">{slides.length} escenas · {total.toFixed(1)}s</span><span>{total.toFixed(1)}s</span></div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-2 py-2">
        <div className="flex gap-1">
          <button aria-label={isPlaying ? 'Pausar' : 'Reproducir'} title={isPlaying ? 'Pausar' : 'Reproducir'} onClick={() => void toggle()} disabled={busy || !ready || !total} className="preview-control !bg-neutral-800 !text-neutral-200">{isPlaying ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4 fill-current" />}</button>
          <button aria-label="Reiniciar reproducción" title="Reiniciar reproducción" disabled={busy || !total} onClick={() => { time.current = 0; setDisplayTime(0); if (playing.current) audioEngine.play(0); }} className="preview-control"><RotateCcw aria-hidden="true" className="h-4 w-4" /></button>
          <button aria-label={muted ? 'Activar sonido' : 'Silenciar'} title={muted ? 'Activar sonido' : 'Silenciar'} onClick={() => setMuted(value => !value)} disabled={busy} className="preview-control">{muted ? <VolumeX aria-hidden="true" className="h-4 w-4" /> : <Volume2 aria-hidden="true" className="h-4 w-4 text-indigo-400" />}</button>
        </div>
        <button onClick={() => void record()} disabled={busy || !ready || !total || !format} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50"><Download aria-hidden="true" className="h-3.5 w-3.5" />Grabar {format?.extension.toUpperCase() ?? 'video'}</button>
      </div>
    </div>
    {busy && <div role="status" className="space-y-2"><p className="text-sm">Grabando · {progress}% · Mantené esta pestaña visible.</p><progress value={progress} max={100} className="w-full" /><button className="control" onClick={() => abort.current?.abort()}>Cancelar grabación</button></div>}
    <p className="text-xs text-neutral-500">Se graba en tiempo real, hasta 5 minutos. {format?.extension === 'webm' ? 'Tu navegador ofrece WebM; para MP4 probá Chrome o Edge actualizado.' : 'El video incluye los textos, fondos, movimientos y audio del editor.'}</p>
  </section>;
});

