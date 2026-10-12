import type { PhotoItem } from '../types';
import { photoFileInfo } from './photoFiles.ts';
import { localPath } from './config.ts';

export async function importClip(file: File, config: import('../types').SequenceConfig, signal: AbortSignal) {
  const url = URL.createObjectURL(file), video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.preload = 'auto';
  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); video.onloadeddata = null; video.onerror = null; };
      const finish = (error?: Error) => { cleanup(); error ? reject(error) : resolve(); };
      const abort = () => finish(new DOMException('Cancelado', 'AbortError'));
      const timer = setTimeout(() => finish(new Error('El clip no se pudo abrir en este navegador.')), 20000);
      signal.addEventListener('abort', abort, { once: true }); video.onloadeddata = () => finish(); video.onerror = () => finish(new Error('Clip no compatible: ' + file.name)); video.src = url;
    });
    signal.throwIfAborted();
    const width = video.videoWidth, height = video.videoHeight;
    if (!width || !height || !Number.isFinite(video.duration) || video.duration <= 0) throw new Error('Clip inválido: ' + file.name);
    const canvas = document.createElement('canvas'), scale = Math.min(1, 1920 / Math.max(width, height));
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale); canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo preparar el clip.')), 'image/jpeg', 0.94));
    signal.throwIfAborted();
    const info = photoFileInfo(file);
    return { ...info, fullLocalPath: localPath(config.localBasePath, info.relativePath), previewUrl: URL.createObjectURL(blob), sourceUrl: url,
      width, height, mediaType: 'video', mediaDuration: video.duration, clipStart: 0, orientation: width > height ? 'horizontal' : width < height ? 'vertical' : 'square',
      duration: config.defaultDuration, transition: config.defaultTransition, kenBurns: 'static' } satisfies PhotoItem;
  } catch (error) { URL.revokeObjectURL(url); throw error; }
  finally { video.pause(); video.removeAttribute('src'); video.load(); }
}

export function clipTime(photo: PhotoItem, elapsed: number) {
  const duration = photo.mediaDuration || 1, start = Math.max(0, Math.min(duration - 0.001, photo.clipStart || 0));
  return start + Math.max(0, elapsed) % Math.max(0.001, duration - start);
}
