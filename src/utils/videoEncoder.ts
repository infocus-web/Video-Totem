import type { SequenceConfig, SequenceSlide } from '../types';
import { audioEngine } from './audioSynthesizer';
import type { ImageMap } from './canvasRenderer';
import { sequenceDuration, validateEntrance } from './entrance';
import { musicRange } from './musicTrim';
import type { EncoderMessage, EncoderRequest } from './videoEncoder.worker';

// The frames are drawn and encoded in a worker so the export keeps going while the tab is hidden.
// The page only renders the audio chunks the worker asks for, because the song lives in its AudioContext.
export async function encodeVideo(slides: SequenceSlide[], config: SequenceConfig, _images: ImageMap, signal: AbortSignal, bitrate: number, progress: (value: number) => void, phase: (message: string) => void) {
  if (signal.aborted) throw new DOMException('Exportación cancelada', 'AbortError');
  validateEntrance(config, audioEngine.getTrack()?.duration ?? null, slides);
  const duration = sequenceDuration(slides, config);
  if (!Number.isFinite(duration) || duration <= 0 || (!config.entrance?.enabled && duration > 300)) throw new Error('La exportación admite montajes de hasta 5 minutos; Entrada usa el tramo de música seleccionado.');
  const range = musicRange(config, audioEngine.getTrack()?.duration ?? 0);
  const renderAudio = audioEngine.createAudioRenderer(config.musicTrack, config.musicVolume, range.start, !config.entrance?.enabled, range.end || null);
  const fontUrl = new URL(import.meta.env.BASE_URL + 'fonts/plus-jakarta-sans-latin.woff2', location.href).href;
  const worker = new Worker(new URL('./videoEncoder.worker.ts', import.meta.url), { type: 'module', name: 'Exportación de video' });
  const send = (message: EncoderRequest, transfer: Transferable[] = []) => worker.postMessage(message, transfer);
  try {
    return await new Promise<{ blob: Blob; extension: string } | null>((resolve, reject) => {
      const abort = () => { send({ type: 'abort' }); reject(new DOMException('Exportación cancelada', 'AbortError')); };
      signal.addEventListener('abort', abort, { once: true });
      const finish = (action: () => void) => { signal.removeEventListener('abort', abort); action(); };
      worker.onerror = event => { event.preventDefault(); finish(() => reject(new Error('No se pudo iniciar la exportación: ' + (event.message || 'error del navegador') + '.'))); };
      worker.onmessage = (event: MessageEvent<EncoderMessage>) => {
        const message = event.data;
        if (message.type === 'phase') phase(message.message);
        else if (message.type === 'progress') progress(message.value);
        else if (message.type === 'audio') {
          renderAudio(message.start, message.duration).then(buffer => {
            const channels = Array.from({ length: Math.min(2, buffer.numberOfChannels) }, (_, channel) => buffer.getChannelData(channel).slice());
            send({ type: 'audio', id: message.id, channels }, channels.map(channel => channel.buffer));
          }).catch(error => { send({ type: 'abort' }); finish(() => reject(error instanceof Error ? error : new Error('No se pudo preparar el audio.'))); });
        } else if (message.type === 'unsupported') finish(() => resolve(null));
        else if (message.type === 'done') finish(() => resolve({ blob: new Blob([message.buffer], { type: 'video/mp4' }), extension: 'mp4' }));
        else if (message.type === 'aborted') finish(() => reject(new DOMException('Exportación cancelada', 'AbortError')));
        else if (message.type === 'error') finish(() => reject(new Error(message.message)));
      };
      send({ type: 'start', slides, config, bitrate, fontUrl });
    });
  } finally { worker.terminate(); }
}
