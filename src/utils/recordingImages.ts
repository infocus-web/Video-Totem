import type { SequenceSlide } from '../types';
import type { ImageMap } from './canvasRenderer';

// Only the current scene and its transition target keep decoded originals in memory.
export class RecordingImages {
  readonly images: ImageMap = new Map();
  private prepared = -1;
  constructor(private slides: SequenceSlide[], private previews: ImageMap, private signal: AbortSignal) {}
  isReady(scene: number) { return this.prepared === scene; }
  hasScene(scene: number) { return !!this.slides[scene]?.photos.every(photo => this.images.has(photo.id)); }
  async prepare(scene: number) {
    if (this.signal.aborted) throw new DOMException('Cancelado', 'AbortError');
    const photos = [...new Map(this.slides.slice(scene, scene + 2).flatMap(slide => slide.photos).map(photo => [photo.id, photo])).values()];
    const needed = new Set(photos.map(photo => photo.id));
    for (const [id, image] of this.images) if (!needed.has(id)) {
      if (image !== this.previews.get(id)) image.removeAttribute('src');
      this.images.delete(id);
    }
    let index = 0;
    const workers = await Promise.allSettled(Array.from({ length: Math.min(2, photos.length) }, async () => {
      while (index < photos.length) {
        const photo = photos[index++];
        if (this.signal.aborted) throw new DOMException('Cancelado', 'AbortError');
        if (this.images.has(photo.id)) continue;
        if (!photo.sourceUrl && this.previews.has(photo.id)) { this.images.set(photo.id, this.previews.get(photo.id)!); continue; }
        const image = new Image();
        const abort = () => image.removeAttribute('src');
        this.signal.addEventListener('abort', abort, { once: true });
        try {
          image.src = photo.sourceUrl || photo.previewUrl; await image.decode();
          if (this.signal.aborted) throw new DOMException('Cancelado', 'AbortError');
          this.images.set(photo.id, image);
        } catch {
          image.removeAttribute('src');
          if (this.signal.aborted) throw new DOMException('Cancelado', 'AbortError');
          throw new Error('No se pudo preparar el original de ' + photo.filename + '. Volvé a conectar la foto.');
        } finally { this.signal.removeEventListener('abort', abort); }
      }
    }));
    const failure = workers.find(worker => worker.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    this.prepared = scene;
  }
  clear() {
    for (const [id, image] of this.images) if (image !== this.previews.get(id)) image.removeAttribute('src');
    this.images.clear(); this.prepared = -1;
  }
}
