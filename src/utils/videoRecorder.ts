import type { SequenceConfig, SequenceSlide } from '../types';
import { drawFrame, type ImageMap } from './canvasRenderer';
import { audioEngine } from './audioSynthesizer';

export function recordingFormat(preference?: 'webm') {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['video/mp4;codecs=avc1.424028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mime = candidates.find(candidate => (!preference || candidate.startsWith('video/' + preference)) && MediaRecorder.isTypeSupported(candidate));
  return mime ? { mime, extension: mime.startsWith('video/mp4') ? 'mp4' : 'webm' } : null;
}

export async function recordVideo(slides: SequenceSlide[], config: SequenceConfig, images: ImageMap, signal: AbortSignal, progress: (value: number) => void, onPhase: (message: string) => void = () => {}) {
  const format = recordingFormat();
  if (!format || !HTMLCanvasElement.prototype.captureStream) throw new Error('Este navegador no permite grabar video. Probá con Chrome o Edge actualizado.');
  onPhase('Grabando video');
  let result = await recordWithFormat(slides, config, images, signal, progress, format);
  onPhase('Verificando archivo');
  if (!await hasVideoTrack(result.blob, config, signal)) {
    const fallback = format.extension === 'mp4' ? recordingFormat('webm') : null;
    if (!fallback) throw new Error('El navegador generó un archivo sin imagen. Probá de nuevo en Chrome o Edge.');
    onPhase('Reintentando video en WebM'); progress(0);
    result = await recordWithFormat(slides, config, images, signal, progress, fallback);
    onPhase('Verificando archivo');
    if (!await hasVideoTrack(result.blob, config, signal)) throw new Error('El navegador no pudo generar la pista de video. Probá en otro navegador.');
  }
  progress(100); return result;
}

function hasVideoTrack(blob: Blob, config: SequenceConfig, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.reject(new DOMException('Cancelado', 'AbortError'));
  return new Promise((resolve, reject) => {
    const video = document.createElement('video'), url = URL.createObjectURL(blob);
    const cleanup = () => { window.clearTimeout(timeout); signal.removeEventListener('abort', abort); video.onloadedmetadata = null; video.onerror = null; video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); };
    const finish = (valid: boolean) => { cleanup(); resolve(valid); };
    const abort = () => { cleanup(); reject(new DOMException('Cancelado', 'AbortError')); };
    const timeout = window.setTimeout(() => finish(false), 5000);
    video.onloadedmetadata = () => finish(video.videoWidth === config.width && video.videoHeight === config.height);
    video.onerror = () => finish(false);
    signal.addEventListener('abort', abort, { once: true });
    video.preload = 'metadata'; video.src = url;
  });
}

async function recordWithFormat(slides: SequenceSlide[], config: SequenceConfig, images: ImageMap, signal: AbortSignal, progress: (value: number) => void, format: { mime: string; extension: string }) {
  const duration = slides.reduce((sum, slide) => sum + slide.duration, 0);
  if (!duration || duration > 300) throw new Error('La grabación admite montajes de hasta 5 minutos.');
  if (signal.aborted || document.hidden) throw new Error('Dejá esta pestaña visible para grabar.');
  const canvas = document.createElement('canvas');
  canvas.width = config.width; canvas.height = config.height;
  await document.fonts.ready;
  await audioEngine.resume();
  if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
  const stream = canvas.captureStream(0);
  const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
  const audioTrack = audioEngine.getCaptureStream().getAudioTracks()[0];
  // A silent audio track keeps the encoder clock running even without music.
  if (audioTrack) stream.addTrack(audioTrack.clone());
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: 8000000, audioBitsPerSecond: 192000 });
  } catch (error) {
    stream.getTracks().forEach(track => track.stop()); throw error;
  }
  audioEngine.setStyle(config.musicTrack); audioEngine.setVolume(config.musicVolume);
  let frame = 0;
  try {
    return await new Promise<{ blob: Blob; extension: string }>((resolve, reject) => {
      const chunks: Blob[] = [];
      let failure: Error | null = null, settled = false;
      const started = performance.now();
      let lastCapture = -1;
      const cleanup = () => {
        cancelAnimationFrame(frame); window.clearTimeout(deadline);
        signal.removeEventListener('abort', abort); document.removeEventListener('visibilitychange', hidden);
      };
      const fail = (error: Error) => {
        failure = error;
        if (recorder.state !== 'inactive') recorder.stop();
        else { cleanup(); settled = true; reject(error); }
      };
      const abort = () => fail(new DOMException('Grabación cancelada', 'AbortError'));
      const hidden = () => { if (document.hidden) fail(new Error('Se canceló la grabación porque la pestaña dejó de estar visible.')); };
      const deadline = window.setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, duration * 1000);
      signal.addEventListener('abort', abort, { once: true }); document.addEventListener('visibilitychange', hidden);
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
        if (recorder.state === 'inactive') return;
        const captureTime = performance.now() / 1000;
        const elapsed = Math.min(duration, captureTime - started / 1000);
        try {
          if (lastCapture < 0 || captureTime - lastCapture >= 1 / config.fps) {
            drawFrame(canvas, slides, config, images, elapsed);
            // Static photos need an explicit frame request as well as canvas updates.
            videoTrack?.requestFrame?.(); lastCapture = captureTime;
          }
        } catch (error) { fail(error instanceof Error ? error : new Error('Falló el dibujo del video.')); return; }
        progress(Math.min(99, Math.round(elapsed / duration * 100)));
        frame = requestAnimationFrame(tick);
      };
      try {
        recorder.start(1000); audioEngine.play(0, false);
        drawFrame(canvas, slides, config, images, 0); videoTrack?.requestFrame?.();
        frame = requestAnimationFrame(tick);
      }
      catch (error) { fail(error instanceof Error ? error : new Error('No se pudo iniciar la grabación.')); }
    });
  } finally {
    cancelAnimationFrame(frame); audioEngine.stop(); stream.getTracks().forEach(track => track.stop());
  }
}

