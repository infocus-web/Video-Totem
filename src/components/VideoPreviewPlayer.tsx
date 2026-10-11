import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { FilePreparationProgress, PhotoFraming, SequenceConfig, SequenceSlide } from '../types';
import { PreparationProgress } from './PreparationProgress';
import { PhotoFramingControls } from './PhotoFramingControls';
import { EditorPropertyRow } from './EditorPropertyRow';
import { drawFrame, loadImages, sceneAtTime, type ImageMap } from '../utils/canvasRenderer';
import { normalizeFraming, photoGeometry, photoSlots } from '../utils/photoFraming';
import { recordVideo, recordingFormat } from '../utils/videoRecorder';
import { audioEngine } from '../utils/audioSynthesizer';
import { downloadBlob } from '../utils/download';
import { saveVideoAs } from '../utils/saveVideo';
import { supportsBackgroundExport } from '../utils/videoRecorder';
import { videoOutput } from '../utils/videoOutput';
import { Pause, Play, PlusCircle, RotateCcw, Volume2, VolumeX } from 'lucide-react';

export interface PreviewHandle { record: (chooseLocation?: boolean) => void }
interface Props { slides: SequenceSlide[]; config: SequenceConfig; busy: boolean; importing: boolean; onBusy: (value: boolean) => void; onReadyChange: (value: boolean) => void; onError: (message: string) => void; onPhotoFramingChange: (scene: number, photo: number, framing: PhotoFraming) => void; onPhotoRotate: (ids: string[], direction: -90 | 90) => void; musicRevision: number; libraryCount: number; framingControlsTarget: HTMLElement | null }
interface FramingDrag { pointer: number; scene: number; photo: number; sceneId: string; photoId: string; x: number; y: number; horizontalSpace: number; verticalSpace: number; framing: PhotoFraming }
export const VideoPreviewPlayer = forwardRef<PreviewHandle, Props>(function VideoPreviewPlayer({ slides, config, busy, importing, onBusy, onReadyChange, onError, onPhotoFramingChange, onPhotoRotate, musicRevision, libraryCount, framingControlsTarget }, ref) {
  const output = videoOutput(config);
  const canvas = useRef<HTMLCanvasElement>(null);
  const media = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = media.current;
    if (!element) return;
    const resize = () => element.style.setProperty('--preview-media-height', Math.max(90, element.getBoundingClientRect().height - 28) + 'px');
    resize();
    const observer = new ResizeObserver(resize); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [images, setImages] = useState<ImageMap>(() => new Map());
  const imageCache = useRef<ImageMap>(new Map());
  const time = useRef(0), playing = useRef(false), abort = useRef<AbortController | null>(null);
  const [displayTime, setDisplayTime] = useState(0), [isPlaying, setPlaying] = useState(false);
  const [ready, setReady] = useState(false), [progress, setProgress] = useState(0), [muted, setMuted] = useState(false);
  const [imageError, setImageError] = useState('');
  const [recordPhase, setRecordPhase] = useState('Grabando video');
  const [preparationProgress, setPreparationProgress] = useState<FilePreparationProgress | null>(null);
  const [framingMode, setFramingMode] = useState(false), [selectedPhoto, setSelectedPhoto] = useState(0);
  const resumeAfterFraming = useRef(false), drag = useRef<FramingDrag | null>(null);
  const [pendingVideo, setPendingVideo] = useState<{ blob: Blob; filename: string } | null>(null);
  const [savingVideo, setSavingVideo] = useState(false), [saveMessage, setSaveMessage] = useState('');
  const total = slides.reduce((sum, slide) => sum + slide.duration, 0);
  const format = recordingFormat();
  const disabled = busy || importing || savingVideo;
  const scene = sceneAtTime(slides, displayTime), currentSlide = slides[scene.index];
  const photoIndex = Math.min(selectedPhoto, Math.max(0, (currentSlide?.photos.length || 1) - 1));
  const selectedSlot = photoSlots(currentSlide?.photos.length || 1, config.width, config.height, config.splitGapSize)[photoIndex];
  useEffect(() => {
    const photos = new Map(slides.flatMap(slide => slide.photos.map(photo => [photo.id, photo] as const)));
    if (photos.size === imageCache.current.size && [...photos.values()].every(photo => photo.previewUrl && imageCache.current.get(photo.id)?.src === photo.previewUrl)) {
      setReady(true); onReadyChange(photos.size > 0);
      return;
    }
    const controller = new AbortController();
    setReady(false); onReadyChange(false); setImageError(''); playing.current = false; setPlaying(false); audioEngine.stop();
    time.current = 0; setDisplayTime(0); setImages(new Map());
    setPreparationProgress(null);
    loadImages(slides, controller.signal, value => { if (!controller.signal.aborted) setPreparationProgress(value); }, imageCache.current).then(map => {
      if (!controller.signal.aborted) { imageCache.current = map; setImages(map); setReady(true); onReadyChange(map.size > 0); }
    }).catch(error => {
      if (!controller.signal.aborted) setImageError(error instanceof Error ? error.message : 'No se pudieron cargar las fotos.');
    });
    return () => controller.abort();
  }, [slides, onReadyChange]);
  useEffect(() => {
    audioEngine.setStyle(config.musicTrack);
    if (playing.current) audioEngine.play(time.current);
  }, [config.musicTrack, musicRevision]);
  useEffect(() => { audioEngine.setVolume(muted ? 0 : config.musicVolume); }, [config.musicVolume, muted]);
  useEffect(() => {
    time.current = Math.min(time.current, total);
    if (canvas.current && !isPlaying) drawFrame(canvas.current, slides, config, images, time.current, framingMode);
  }, [slides, config, images, ready, isPlaying, displayTime, total, framingMode]);
  useEffect(() => {
    if (disabled) { playing.current = false; setPlaying(false); audioEngine.stop(); }
  }, [disabled]);
  useEffect(() => {
    if (disabled || !ready || !slides.length) { setFramingMode(false); drag.current = null; resumeAfterFraming.current = false; }
  }, [disabled, ready, slides.length]);
  useEffect(() => {
    if (!isPlaying || !ready || disabled || !total) return;
    let frame = 0, last = performance.now(), lastUi = 0, lastDraw = 0;
    const tick = (now: number) => {
      time.current += (now - last) / 1000;
      if (time.current >= total) { time.current %= total; audioEngine.play(time.current); }
      last = now;
      if (canvas.current && now - lastDraw >= 1000 / config.fps) {
        drawFrame(canvas.current, slides, config, images, time.current); lastDraw = now;
      }
      if (now - lastUi > 100) { setDisplayTime(time.current); lastUi = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const hidden = () => { if (document.hidden) { playing.current = false; setPlaying(false); audioEngine.stop(); } };
    document.addEventListener('visibilitychange', hidden);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', hidden); };
  }, [slides, config, total, ready, images, isPlaying, disabled]);
  useEffect(() => () => { abort.current?.abort(); audioEngine.stop(); }, []);
  const toggle = async () => {
    if (!ready || !total || disabled) return;
    setFramingMode(false); drag.current = null; resumeAfterFraming.current = false;
    try {
      if (playing.current) { playing.current = false; setDisplayTime(time.current); audioEngine.stop(); }
      else { await audioEngine.resume(); playing.current = true; audioEngine.setVolume(muted ? 0 : config.musicVolume); audioEngine.play(time.current); }
      setPlaying(playing.current);
    } catch (error) { onError(error instanceof Error ? error.message : 'No se pudo iniciar el audio.'); }
  };
  const toggleFraming = () => {
    if (framingMode) {
      const resume = resumeAfterFraming.current;
      setFramingMode(false); drag.current = null; resumeAfterFraming.current = false;
      if (resume) void toggle();
      return;
    }
    resumeAfterFraming.current = playing.current;
    playing.current = false; setPlaying(false); audioEngine.stop();
    const current = sceneAtTime(slides, time.current);
    time.current = slides.slice(0, current.index).reduce((sum, slide) => sum + slide.duration, 0);
    setDisplayTime(time.current); setSelectedPhoto(0); setFramingMode(true);
  };
  const startFramingDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!framingMode || disabled || !ready || event.button !== 0 || drag.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const width = event.currentTarget.width, height = event.currentTarget.height;
    const x = (event.clientX - bounds.left) * width / bounds.width, y = (event.clientY - bounds.top) * height / bounds.height;
    const current = sceneAtTime(slides, time.current), slide = slides[current.index];
    if (!slide) return;
    const slots = photoSlots(slide.photos.length, width, height, config.splitGapSize * width / config.width);
    const index = slots.findIndex(slot => x >= slot.x && x < slot.x + slot.width && y >= slot.y && y < slot.y + slot.height);
    if (index < 0) return;
    const photo = slide.photos[index], image = images.get(photo.id), slot = slots[index];
    if (!image) return;
    const geometry = photoGeometry(photo, image.naturalWidth, image.naturalHeight, slot.width, slot.height, config.photoFit, current.progress);
    setSelectedPhoto(index);
    drag.current = { pointer: event.pointerId, scene: current.index, photo: index, sceneId: slide.id, photoId: photo.id, x: event.clientX, y: event.clientY,
      horizontalSpace: (slot.width - geometry.width) * bounds.width / width, verticalSpace: (slot.height - geometry.height) * bounds.height / height,
      framing: normalizeFraming(photo.framing) };
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
  };
  const selectFramingPhoto = (index: number, photo = 0) => {
    drag.current = null;
    time.current = slides.slice(0, index).reduce((sum, slide) => sum + slide.duration, 0);
    setDisplayTime(time.current); setSelectedPhoto(photo);
  };
  const moveFramingDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId || !framingMode || disabled) return;
    if (slides[active.scene]?.id !== active.sceneId || slides[active.scene]?.photos[active.photo]?.id !== active.photoId) { drag.current = null; return; }
    event.preventDefault();
    onPhotoFramingChange(active.scene, active.photo, normalizeFraming({ ...active.framing,
      x: active.framing.x + (Math.abs(active.horizontalSpace) > 0.5 ? (event.clientX - active.x) / active.horizontalSpace : 0),
      y: active.framing.y + (Math.abs(active.verticalSpace) > 0.5 ? (event.clientY - active.y) / active.verticalSpace : 0) }));
  };
  const stopFramingDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const frameWithKeyboard = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (!framingMode || disabled || !currentSlide || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const photo = currentSlide.photos[photoIndex], image = images.get(photo.id);
    if (!image) return;
    const geometry = photoGeometry(photo, image.naturalWidth, image.naturalHeight, selectedSlot.width, selectedSlot.height, config.photoFit, scene.progress);
    const framing = normalizeFraming(photo.framing), step = event.shiftKey ? 0.1 : 0.02;
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    const delta = (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? step : -step) * Math.sign(horizontal ? selectedSlot.width - geometry.width : selectedSlot.height - geometry.height);
    onPhotoFramingChange(scene.index, photoIndex, normalizeFraming({ ...framing, [horizontal ? 'x' : 'y']: framing[horizontal ? 'x' : 'y'] + delta }));
  };
  const record = async (chooseLocation = false) => {
    if (!ready || !total || disabled || abort.current) { onError('Conectá las fotos y esperá a que termine la carga.'); return; }
    playing.current = false; setPlaying(false); audioEngine.stop();
    abort.current = new AbortController(); onBusy(true); setProgress(0); setPendingVideo(null); setSaveMessage('');
    try {
      const result = await recordVideo(slides, config, images, abort.current.signal, setProgress, setRecordPhase);
      const filename = (config.name || 'AutoReel') + '.' + result.extension;
      if (chooseLocation) setPendingVideo({ blob: result.blob, filename });
      else downloadBlob(result.blob, filename);
      if (result.extension !== format?.extension) onError('Chrome no pudo completar el MP4. Se generó un video WebM verificado.' + (chooseLocation ? ' Elegí dónde guardarlo.' : ' Se inició su descarga.'));
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) onError(error instanceof Error ? error.message : 'No se pudo grabar el video.');
    } finally { abort.current = null; onBusy(false); setProgress(0); }
  };
  const savePendingVideo = async () => {
    if (!pendingVideo || savingVideo) return;
    setSavingVideo(true); onBusy(true); setSaveMessage('');
    try {
      const result = await saveVideoAs(pendingVideo.blob, pendingVideo.filename);
      if (result === 'cancelled') setSaveMessage('Guardado cancelado. El video sigue listo para volver a intentarlo.');
      else { setPendingVideo(null); setSaveMessage(result === 'saved' ? 'Video guardado en la ubicación elegida.' : 'Se inició la descarga con la configuración de tu navegador.'); }
    } catch (error) { setSaveMessage(error instanceof Error ? error.message + ' El video sigue listo para reintentar o descargar.' : 'No se pudo guardar. El video sigue listo para reintentar.'); }
    finally { setSavingVideo(false); onBusy(false); }
  };
  useImperativeHandle(ref, () => ({ record: chooseLocation => { void record(chooseLocation); } }));
  const framingControls = <fieldset disabled={disabled || !ready || !slides.length} className="space-y-3">
    <EditorPropertyRow label="Edición manual"><button type="button" aria-pressed={framingMode} onClick={toggleFraming} className="quick-button">{framingMode ? 'Listo, volver a la vista previa' : 'Encuadrar foto'}</button></EditorPropertyRow>
    {framingMode && <PhotoFramingControls slides={slides} sceneIndex={scene.index} photoIndex={photoIndex} onPhotoChange={setSelectedPhoto} cover={config.photoFit === 'cover'}
      onSceneChange={selectFramingPhoto} onNavigatePhoto={selectFramingPhoto}
      onChange={framing => onPhotoFramingChange(scene.index, photoIndex, framing)} onRotate={onPhotoRotate} />}
  </fieldset>;
  return <>
  {framingControlsTarget && createPortal(framingControls, framingControlsTarget)}
  <section className="panel preview-panel">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-indigo-500" />Previsualización {config.aspectRatio} en Vivo</h2><span className="font-mono text-[11px] text-neutral-400">{config.width} × {config.height} · {config.fps} FPS</span></div>
    {output.rotation !== 0 && <p className="text-xs text-indigo-300">Tótem TV · Vista derecha como en tu TV vertical. Archivo final: {output.width} × {output.height}, girado 90° a la {output.rotation === 90 ? 'derecha' : 'izquierda'}.</p>}
    <div ref={media} className="preview-media">
    <div className="preview-device" style={{ width: `min(100%, calc(var(--preview-screen-height) * ${config.width / config.height} + 28px))` }}>
      <div aria-hidden="true" className="preview-notch"><span className="h-2.5 w-2.5 rounded-full border border-neutral-700 bg-neutral-950" /><span className="h-1 w-10 rounded-full bg-neutral-800" /></div>
      <div className="preview-screen" style={{ aspectRatio: config.width / config.height }}>
        <canvas ref={canvas} width={Math.min(720,config.width)} height={Math.round(config.height * Math.min(720,config.width) / config.width)} aria-label="Vista previa del montaje" role="img" tabIndex={framingMode ? 0 : undefined} aria-describedby={framingMode ? 'photo-framing-help' : undefined}
          onPointerDown={startFramingDrag} onPointerMove={moveFramingDrag} onPointerUp={stopFramingDrag} onPointerCancel={stopFramingDrag} onLostPointerCapture={stopFramingDrag} onKeyDown={frameWithKeyboard}
          style={framingMode ? { touchAction: 'none', cursor: 'grab' } : undefined} className="block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400" />
        {framingMode && currentSlide && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-2 border-indigo-400/80" style={{ top: selectedSlot.y / config.height * 100 + '%', height: selectedSlot.height / config.height * 100 + '%' }} />}
        {!slides.length && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <span aria-hidden="true" className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4"><PlusCircle className="h-8 w-8 text-indigo-400" /></span>
          <div><p className="text-sm font-semibold text-neutral-200">Tu próximo reel empieza acá</p><p className="mt-2 text-xs leading-relaxed text-neutral-400">{libraryCount ? 'En el editor, aplicá una selección o elegí «Usar todas las fotos».' : 'Conectá tus fotos y aplicá una selección para empezar.'}</p></div>
        </div>}
        {slides.length > 0 && !ready && !imageError && <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4"><PreparationProgress title="Preparando vista previa" progress={preparationProgress} /></div>}
        {ready && total > 0 && !disabled && !framingMode && <button aria-label={isPlaying ? 'Pausar vista previa' : 'Reproducir vista previa'} onClick={() => void toggle()}
          className={'absolute inset-0 flex items-center justify-center transition ' + (isPlaying ? 'opacity-0 hover:opacity-100 focus-visible:opacity-100' : 'bg-black/20 backdrop-blur-[2px]')}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600/90 text-white shadow-xl shadow-indigo-600/40">{isPlaying ? <Pause aria-hidden="true" className="h-7 w-7 fill-current" /> : <Play aria-hidden="true" className="ml-1 h-8 w-8 fill-current" />}</span>
        </button>}
        {busy && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 p-6 text-center"><span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /><p className="text-sm font-bold">{savingVideo ? 'Guardando video' : recordPhase}…</p>{!savingVideo && <p className="font-mono text-xs text-indigo-300">{progress}%</p>}</div>}
      </div>
    </div>
    </div>
    <div className="preview-tools space-y-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400" role="region" aria-label="Controles de vista previa" tabIndex={0}>
    {!framingControlsTarget && framingControls}
    {imageError && <p role="alert" className="text-sm text-amber-300">{imageError}</p>}
    <div className="mx-auto max-w-[350px] space-y-2">
      <input aria-label="Posición del video" type="range" min="0" max={total || 1} step="0.05" value={Math.min(displayTime,total)} disabled={disabled || !ready} onChange={e => { time.current = Number(e.target.value); setDisplayTime(time.current); if (playing.current) audioEngine.play(time.current); }} className="w-full accent-indigo-500" />
      <div className="flex justify-between gap-2 font-mono text-[11px] text-neutral-400"><span>{displayTime.toFixed(1)}s</span><span className="text-neutral-500">{slides.length} escenas · {total.toFixed(1)}s</span><span>{total.toFixed(1)}s</span></div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-2 py-2">
        <div className="flex gap-1">
          <button aria-label={isPlaying ? 'Pausar' : 'Reproducir'} title={isPlaying ? 'Pausar' : 'Reproducir'} onClick={() => void toggle()} disabled={disabled || !ready || !total} className="preview-control !bg-neutral-800 !text-neutral-200">{isPlaying ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4 fill-current" />}</button>
          <button aria-label="Reiniciar reproducción" title="Reiniciar reproducción" disabled={disabled || !total} onClick={() => { time.current = 0; setDisplayTime(0); if (playing.current) audioEngine.play(0); }} className="preview-control"><RotateCcw aria-hidden="true" className="h-4 w-4" /></button>
          <button aria-label={muted ? 'Activar sonido' : 'Silenciar'} title={muted ? 'Activar sonido' : 'Silenciar'} onClick={() => setMuted(value => !value)} disabled={disabled} className="preview-control">{muted ? <VolumeX aria-hidden="true" className="h-4 w-4" /> : <Volume2 aria-hidden="true" className="h-4 w-4 text-indigo-400" />}</button>
        </div>
        <span className="text-[11px] text-neutral-400">Descargá desde Exportar</span>
      </div>
    </div>
    {busy && !savingVideo && <div role="status" className="space-y-2"><p className="text-sm">{recordPhase} · {progress}% · {supportsBackgroundExport(recordingFormat()?.extension) ? 'Podés cambiar de pestaña; dejá la app abierta.' : 'Dejá esta pestaña visible. Al volver, la grabación continúa.'}</p><progress aria-label="Avance de exportación" value={progress} max={100} className="w-full" /><button className="control" onClick={() => abort.current?.abort()}>Cancelar grabación</button></div>}
    {pendingVideo && <div className="space-y-3 rounded-xl border border-emerald-700 bg-emerald-950/20 p-3"><p role="status" className="text-sm text-emerald-200">Video listo: {pendingVideo.filename}</p><p className="text-xs text-neutral-400">Elegí la carpeta y el nombre. Guardalo antes de recargar o cerrar la página.</p><div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled} onClick={() => void savePendingVideo()} className="control">Elegir ubicación y guardar video</button>
      <button type="button" disabled={disabled} onClick={() => { downloadBlob(pendingVideo.blob, pendingVideo.filename); setPendingVideo(null); setSaveMessage('Se inició la descarga con la configuración de tu navegador.'); }} className="quick-button">Descargar sin elegir ubicación</button>
    </div></div>}
    {saveMessage && <p role="status" className="text-xs text-emerald-200">{saveMessage}</p>}
    <p className="preview-export-note text-xs text-neutral-500">Exportación local, hasta 5 minutos. En Chrome/Edge compatibles se genera cuadro por cuadro, sin saltear imágenes. {format?.extension === 'webm' ? 'Tu navegador ofrece WebM; para MP4 probá Chrome o Edge actualizado.' : 'El video incluye los textos, fondos, movimientos y audio del editor.'}</p>
    </div>
  </section></>;
});

