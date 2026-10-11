import type { FilePreparationProgress, PhotoItem, SequenceConfig } from '../types';
import { localPath } from './config';
export async function importPhotos(files: File[], config: SequenceConfig, signal: AbortSignal, onProgress?: (progress: FilePreparationProgress) => void): Promise<PhotoItem[]> {
  const candidates = files.filter(file => /\.(jpe?g|png|webp|avif)$/i.test(file.name));
  if (!candidates.length) throw new Error('No hay fotos compatibles. Convertí RAW o HEIC a JPG antes de cargarlas.');
  if (candidates.length > 400) throw new Error('Elegí hasta 400 fotos por sesión.');
  if (candidates.some(file => file.size > 50 * 1024 * 1024)) throw new Error('Cada foto debe pesar hasta 50 MB.');
  candidates.sort((a,b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, { numeric: true }));
  const result: PhotoItem[] = new Array(candidates.length);
  const created: string[] = [];
  let index = 0, completed = 0;
  onProgress?.({ completed, total: candidates.length });
  try {
    const workers = await Promise.allSettled(Array.from({ length: Math.min(3,candidates.length) }, async () => {
      while (index < candidates.length) {
        const position = index++, file = candidates[position];
        if (signal.aborted) throw new DOMException('Cancelado','AbortError');
        const original = URL.createObjectURL(file);
        created.push(original);
        const image = new Image();
        try {
          image.src = original; await image.decode();
          if (signal.aborted) throw new DOMException('Cancelado','AbortError');
          const width = image.naturalWidth, height = image.naturalHeight;
          if (!width || !height || width * height > 100000000) throw new Error('Imagen demasiado grande o inválida: ' + file.name);
          const scale = Math.min(1,1920 / Math.max(width,height));
          const canvas = document.createElement('canvas'); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas 2D no disponible.');
          context.drawImage(image,0,0,canvas.width,canvas.height);
          const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo preparar ' + file.name)), file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.94));
          if (signal.aborted) throw new DOMException('Cancelado','AbortError');
          const previewUrl = URL.createObjectURL(blob); created.push(previewUrl);
          const relativePath = file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(1).join('/') : file.name;
          result[position] = { id: relativePath.toLowerCase(), filename: file.name, relativePath, fullLocalPath: localPath(config.localBasePath,relativePath),
            previewUrl, sourceUrl: original, width, height, number: file.name.replace(/\.[^.]+$/,'').match(/\d+$/)?.[0] ?? file.name,
            orientation: width > height ? 'horizontal' : width < height ? 'vertical' : 'square',
            duration: config.defaultDuration, transition: config.defaultTransition, kenBurns: 'zoom-in' };
          onProgress?.({ completed: ++completed, total: candidates.length });
          // Give the browser a chance to paint progress before preparing another photo.
          await new Promise<void>(resolve => window.setTimeout(resolve, 0));
        } catch (error) { throw new Error('No se pudo cargar ' + file.name + ': ' + (error instanceof Error ? error.message : 'archivo inválido')); }
        finally { image.removeAttribute('src'); }
      }
    }));
    const failure = workers.find(worker => worker.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    return result;
  } catch (error) {
    // Workers finish their current file before URLs are released.
    created.forEach(url => URL.revokeObjectURL(url));
    throw error;
  }
}

