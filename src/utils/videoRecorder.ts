import type { SequenceConfig, SequenceSlide } from '../types';
import { drawVideoFrame, sceneAtTime, type ImageMap } from './canvasRenderer';
import { videoOutput } from './videoOutput';
import { prepareTextFonts } from './textOverlay';
import { audioEngine } from './audioSynthesizer';
import { RecordingImages } from './recordingImages';
import { createRecordingSource, supportsBackgroundRecording } from './recordingSource';
import { supportsFrameEncoding } from './frameEncodingSupport';

export function supportsBackgroundExport(extension?: string) {
  return supportsFrameEncoding() || supportsBackgroundRecording(extension);
}

export function recordingBitrate(config: Pick<SequenceConfig, 'width' | 'height' | 'fps'>) {
  return Math.max(4000000, Math.min(40000000, Math.round(config.width * config.height * config.fps * 0.25)));
}

export function recordingFormat(preference?: 'webm') {
  if (!preference && supportsFrameEncoding()) return { mime: 'video/mp4', extension: 'mp4' };
  return nativeRecordingFormat(preference);
}

function nativeRecordingFormat(preference?: 'webm') {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['video/mp4;codecs=avc1.424028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mime = candidates.find(candidate => (!preference || candidate.startsWith('video/' + preference)) && MediaRecorder.isTypeSupported(candidate));
  return mime ? { mime, extension: mime.startsWith('video/mp4') ? 'mp4' : 'webm' } : null;
}

export async function recordVideo(slides: SequenceSlide[], config: SequenceConfig, images: ImageMap, signal: AbortSignal, progress: (value: number) => void, onPhase: (message: string) => void = () => {}) {
  if (supportsFrameEncoding()) {
    const { encodeVideo } = await import('./videoEncoder');
    const result = await encodeVideo(slides, config, images, signal, recordingBitrate(config), progress, onPhase);
    if (result) { progress(100); return result; }
  }
  const format = nativeRecordingFormat();
  if (!format || (!supportsBackgroundRecording() && !HTMLCanvasElement.prototype.captureStream)) throw new Error('Este navegador no permite grabar video. Probá con Chrome o Edge actualizado.');
  onPhase('Grabando video');
  let result = await recordWithFormat(slides, config, images, signal, progress, format, onPhase);
  if (document.hidden) onPhase('Grabación completa: volvé a esta pestaña para verificar y guardar');
  await waitForVisible(signal);
  onPhase('Verificando archivo');
  if (!await hasVideoTrack(result.blob, config, signal)) {
    const fallback = format.extension === 'mp4' ? nativeRecordingFormat('webm') : null;
    if (!fallback) throw new Error('El navegador generó un archivo sin imagen. Probá de nuevo en Chrome o Edge.');
    onPhase('Reintentando video en WebM'); progress(0);
    result = await recordWithFormat(slides, config, images, signal, progress, fallback, onPhase);
    if (document.hidden) onPhase('Grabación completa: volvé a esta pestaña para verificar y guardar');
    await waitForVisible(signal);
    onPhase('Verificando archivo');
    if (!await hasVideoTrack(result.blob, config, signal)) throw new Error('El navegador no pudo generar la pista de video. Probá en otro navegador.');
  }
  progress(100); return result;
}

function waitForVisible(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new DOMException('Cancelado', 'AbortError'));
  if (!document.hidden) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => { document.removeEventListener('visibilitychange', changed); signal.removeEventListener('abort', abort); };
    const changed = () => { if (!document.hidden) { cleanup(); resolve(); } };
    const abort = () => { cleanup(); reject(new DOMException('Cancelado', 'AbortError')); };
    document.addEventListener('visibilitychange', changed); signal.addEventListener('abort', abort, { once: true });
  });
}

function hasVideoTrack(blob: Blob, config: SequenceConfig, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.reject(new DOMException('Cancelado', 'AbortError'));
  return new Promise((resolve, reject) => {
    const video = document.createElement('video'), url = URL.createObjectURL(blob);
    const cleanup = () => { window.clearTimeout(timeout); signal.removeEventListener('abort', abort); video.onloadedmetadata = null; video.onerror = null; video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); };
    const finish = (valid: boolean) => { cleanup(); resolve(valid); };
    const abort = () => { cleanup(); reject(new DOMException('Cancelado', 'AbortError')); };
    const timeout = window.setTimeout(() => finish(false), 5000);
    const output = videoOutput(config);
    video.onloadedmetadata = () => finish(video.videoWidth === output.width && video.videoHeight === output.height);
    video.onerror = () => finish(false);
    signal.addEventListener('abort', abort, { once: true });
    video.preload = 'metadata'; video.src = url;
  });
}

async function recordWithFormat(slides: SequenceSlide[], config: SequenceConfig, images: ImageMap, signal: AbortSignal, progress: (value: number) => void, format: { mime: string; extension: string }, onPhase: (message: string) => void) {
  const duration = slides.reduce((sum, slide) => sum + slide.duration, 0);
  if (!duration || duration > 300) throw new Error('La grabación admite montajes de hasta 5 minutos.');
  if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
  const originals = new RecordingImages(slides, images, signal);
  onPhase('Preparando originales');
  try { await originals.prepare(0); } catch (error) { originals.clear(); throw error; }
  const canvas = document.createElement('canvas');
  const output = videoOutput(config);
  canvas.width = output.width; canvas.height = output.height;
  const composition = output.rotation ? document.createElement('canvas') : canvas;
  composition.width = config.width; composition.height = config.height;
  try {
    await prepareTextFonts(config); await audioEngine.resume();
    if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
  } catch (error) { originals.clear(); throw error; }
  let source: ReturnType<typeof createRecordingSource>;
  // Native WebM capture stays visible to avoid dropped frames in Chrome's background encoder.
  try { source = createRecordingSource(canvas, format.extension); } catch (error) { originals.clear(); throw error; }
  const stream = source.stream;
  const stopCaptureClock = audioEngine.startCaptureClock();
  const audioTrack = audioEngine.getCaptureStream().getAudioTracks()[0];
  // A silent audio track keeps the encoder clock running even without music.
  if (audioTrack) stream.addTrack(audioTrack.clone());
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: recordingBitrate(config), audioBitsPerSecond: 192000 });
  } catch (error) {
    stopCaptureClock(); originals.clear(); source.close(); stream.getTracks().forEach(track => track.stop()); throw error;
  }
  audioEngine.setStyle(config.musicTrack); audioEngine.setVolume(config.musicVolume);
  let clock: Worker | undefined;
  let stopFrameClock: (() => void) | null = null;
  let tickHandler = () => {};
  try {
    onPhase('Preparando reloj de grabación');
    stopFrameClock = await audioEngine.startRecordingClock(config.fps, () => tickHandler());
    if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
    return await new Promise<{ blob: Blob; extension: string }>((resolve, reject) => {
      const chunks: Blob[] = [];
      let failure: Error | null = null, settled = false;
      const started = performance.now();
      let lastCapture = -1, pausedMs = 0, loading = false, finishing = false, pauseStarted: number | null = null;
      const cleanup = () => {
        clock?.terminate();
        stopFrameClock?.();
        signal.removeEventListener('abort', abort);
        document.removeEventListener('visibilitychange', visibilityChanged);
      };
      const fail = (error: Error) => {
        if (settled) return;
        failure = error;
        if (recorder.state !== 'inactive') recorder.stop();
        else { cleanup(); settled = true; reject(error); }
      };
      const abort = () => fail(new DOMException('Grabación cancelada', 'AbortError'));
      const pauseRecording = () => {
        if (recorder.state !== 'recording') return;
        pauseStarted = performance.now(); recorder.pause(); audioEngine.pause();
      };
      const resumeRecording = () => {
        if (settled || signal.aborted || recorder.state !== 'paused') return;
        if (!source.background && document.hidden) { onPhase('Grabación en pausa: volvé a esta pestaña para continuar'); return; }
        if (pauseStarted !== null) pausedMs += performance.now() - pauseStarted;
        pauseStarted = null; recorder.resume();
        audioEngine.play((performance.now() - started - pausedMs) / 1000, false); onPhase('Grabando video');
      };
      const visibilityChanged = () => {
        if (source.background) return;
        if (document.hidden) { pauseRecording(); onPhase('Grabación en pausa: volvé a esta pestaña para continuar'); }
        else resumeRecording();
      };
      signal.addEventListener('abort', abort, { once: true });
      document.addEventListener('visibilitychange', visibilityChanged);
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => fail(new Error('El navegador no pudo codificar el video.'));
      recorder.onstop = () => {
        if (settled) return;
        cleanup(); settled = true;
        if (failure) { reject(failure); return; }
        const blob = new Blob(chunks, { type: recorder.mimeType || format.mime });
        if (!blob.size) { reject(new Error('El navegador generó un archivo vacío.')); return; }
        resolve({ blob, extension: format.extension });
      };
      const tick = () => {
        if (recorder.state !== 'recording' || finishing) return;
        const captureTime = performance.now() / 1000;
        const elapsed = Math.min(duration, captureTime - (started + pausedMs) / 1000);
        const scene = sceneAtTime(slides, elapsed).index;
        if (!originals.isReady(scene) && !loading) {
          loading = true;
          onPhase('Preparando escena ' + (scene + 1) + ' de ' + slides.length);
          void originals.prepare(scene).then(() => {
            if (signal.aborted || settled) return;
            loading = false; onPhase('Grabando video');
          }).catch(error => fail(error instanceof Error ? error : new Error('Falló la preparación del original.')));
        }
        try {
          audioEngine.tick();
          const current = slides[scene], position = sceneAtTime(slides, elapsed);
          const transitionWindow = Math.min(0.35, current.duration / 2);
          const needsNext = !!slides[scene + 1] && current.transition !== 'none' && position.progress * current.duration > current.duration - transitionWindow;
          // Keep capture and audio continuous while the next original loads.
          if (!originals.hasScene(scene) || (needsNext && !originals.hasScene(scene + 1))) { progress(Math.min(99, Math.round(elapsed / duration * 100))); return; }
          if (lastCapture < 0 || captureTime - lastCapture >= 1 / config.fps - 0.002) {
            drawVideoFrame(canvas, composition, slides, config, originals.images, elapsed);
            // Static photos need an explicit frame request as well as canvas updates.
            void source.capture().catch(error => fail(error instanceof Error ? error : new Error('No se pudo capturar el fotograma.'))); lastCapture = captureTime;
          }
        } catch (error) { fail(error instanceof Error ? error : new Error('Falló el dibujo del video.')); return; }
        progress(Math.min(99, Math.round(elapsed / duration * 100)));
        if (elapsed >= duration) {
          finishing = true; onPhase('Finalizando video');
          void source.finish().then(() => { if (!settled && recorder.state !== 'inactive') recorder.stop(); })
            .catch(error => fail(error instanceof Error ? error : new Error('No se pudo completar el último fotograma.')));
        }
      };
      tickHandler = tick;
      try {
        onPhase('Grabando video');
        recorder.start(1000); audioEngine.play(0, false);
        drawVideoFrame(canvas, composition, slides, config, originals.images, 0);
        void source.capture().catch(error => fail(error instanceof Error ? error : new Error('No se pudo capturar el fotograma.')));
        if (!source.background && document.hidden) visibilityChanged();
        // The audio rendering clock avoids background timer throttling; older browsers keep a worker fallback.
        if (!stopFrameClock) {
          clock = new Worker(new URL('./recordingClock.worker.ts', import.meta.url), { type: 'module' });
          clock.onmessage = tick;
          clock.onerror = () => fail(new Error('No se pudo mantener el reloj de grabación. Volvé a intentarlo.'));
          clock.postMessage(config.fps);
        }
      }
      catch (error) { fail(error instanceof Error ? error : new Error('No se pudo iniciar la grabación.')); }
    });
  } finally {
    clock?.terminate(); stopFrameClock?.(); stopCaptureClock(); source.close(); originals.clear(); audioEngine.stop(); stream.getTracks().forEach(track => track.stop());
  }
}

