import type { SequenceConfig, SequenceSlide, PhotoItem, FilePreparationProgress } from '../types';
import { normalizeFraming, photoGeometry, photoSlots } from './photoFraming.ts';
import { videoOutput } from './videoOutput.ts';
import { drawTextOverlay } from './textOverlay.ts';
export type ImageMap = Map<string, HTMLImageElement>;

export function drawVideoFrame(canvas: HTMLCanvasElement, composition: HTMLCanvasElement, slides: SequenceSlide[], config: SequenceConfig, images: ImageMap, time: number) {
  drawFrame(composition, slides, config, images, time);
  if (canvas === composition) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no ofrece Canvas 2D.');
  const { rotation } = videoOutput(config);
  ctx.resetTransform(); ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(rotation * Math.PI / 180);
  ctx.drawImage(composition, -composition.width / 2, -composition.height / 2); ctx.restore();
}
const transitionBuffers = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

export async function loadImages(slides: SequenceSlide[], signal: AbortSignal, onProgress?: (progress: FilePreparationProgress) => void, cached: ImageMap = new Map()): Promise<ImageMap> {
  const photos = [...new Map(slides.flatMap(slide => slide.photos).map(photo => [photo.id, photo])).values()];
  const images = new Map<string, HTMLImageElement>();
  const pending = photos.filter(photo => {
    const image = cached.get(photo.id);
    if (image && photo.previewUrl && image.src === photo.previewUrl) { images.set(photo.id, image); return false; }
    return true;
  });
  onProgress?.({ completed: images.size, total: photos.length });
  // Limit concurrent decoding to avoid a memory spike on large folders.
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
    while (index < pending.length) {
      const photo = pending[index++];
      if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
      if (!photo.previewUrl) throw new Error('Volvé a conectar la foto ' + photo.filename);
      const image = new Image();
      image.src = photo.previewUrl;
      await image.decode();
      if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
      images.set(photo.id, image);
      onProgress?.({ completed: images.size, total: photos.length });
    }
  }));
  return images;
}

export function sceneAtTime(slides: SequenceSlide[], time: number) {
  let accumulated = 0;
  for (let index = 0; index < slides.length; index++) {
    if (time < accumulated + slides[index].duration || index === slides.length - 1)
      return { index, progress: Math.max(0, Math.min(1, (time - accumulated) / slides[index].duration)) };
    accumulated += slides[index].duration;
  }
  return { index: 0, progress: 0 };
}

export function drawFrame(canvas: HTMLCanvasElement, slides: SequenceSlide[], config: SequenceConfig, images: ImageMap, time: number, editing = false) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no ofrece Canvas 2D.');
  const width = canvas.width, height = canvas.height;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.resetTransform(); ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#09090b'; ctx.fillRect(0, 0, width, height);
  const scene = sceneAtTime(slides, time), current = slides[scene.index];
  if (!current) return;
  const drawImage = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, photo: PhotoItem, x: number, y: number, w: number, h: number, progress: number) => {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const rotation = normalizeFraming(photo.framing).rotation || 0;
    const quarterTurn = rotation === 90 || rotation === 270;
    const imageWidth = quarterTurn ? image.naturalHeight : image.naturalWidth;
    const imageHeight = quarterTurn ? image.naturalWidth : image.naturalHeight;
    const paint = (left: number, top: number, width: number, height: number) => {
      ctx.save(); ctx.translate(left + width / 2, top + height / 2); ctx.rotate(rotation * Math.PI / 180);
      const drawWidth = quarterTurn ? height : width, drawHeight = quarterTurn ? width : height;
      ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight); ctx.restore();
    };
    if (config.photoFit !== 'cover' && (config.backgroundStyle === 'blur' || config.backgroundStyle === 'mirror')) {
      ctx.save();
      if (config.backgroundStyle === 'blur') ctx.filter = 'blur(' + Math.round(width / 24) + 'px) brightness(0.6)';
      if (config.backgroundStyle === 'mirror') { ctx.translate(x + w, 0); ctx.scale(-1, 1); }
      const scale = Math.max(w / imageWidth, h / imageHeight) * 1.2;
      paint(config.backgroundStyle === 'mirror' ? (w - imageWidth * scale) / 2 : x + (w - imageWidth * scale) / 2,
        y + (h - imageHeight * scale) / 2, imageWidth * scale, imageHeight * scale);
      ctx.restore();
    } else if (config.photoFit !== 'cover' && config.backgroundStyle === 'gradient') {
      const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
      gradient.addColorStop(0, '#312e81'); gradient.addColorStop(1, '#09090b');
      ctx.fillStyle = gradient; ctx.fillRect(x, y, w, h);
    }
    const geometry = photoGeometry(photo, image.naturalWidth, image.naturalHeight, w, h, config.photoFit, progress);
    paint(x + geometry.left, y + geometry.top, geometry.width, geometry.height);
    ctx.restore();
  };
  const drawScene = (ctx: CanvasRenderingContext2D, slide: SequenceSlide, progress: number, offsetX = 0, zoom = 1) => {
    ctx.save(); ctx.translate(offsetX + width / 2, height / 2); ctx.scale(zoom, zoom); ctx.translate(-width / 2, -height / 2);
    ctx.fillStyle = '#09090b'; ctx.fillRect(0, 0, width, height);
    const gap = config.splitGapSize * width / config.width;
    const count = slide.photos.length;
    const slots = photoSlots(count, width, height, gap);
    slide.photos.forEach((photo, index) => {
      const image = images.get(photo.id);
      const slot = slots[index];
      if (image) drawImage(ctx, image, photo, slot.x, slot.y, slot.width, slot.height, progress);
    });
    ctx.restore();
  };
  const drawOverlay = (slide: SequenceSlide, opacity: number, zoom = 1) => {
    // Blend a complete scene once: layered backgrounds otherwise darken the previous photo twice.
    let buffer = transitionBuffers.get(canvas);
    if (!buffer) { buffer = document.createElement('canvas'); transitionBuffers.set(canvas, buffer); }
    if (buffer.width !== width || buffer.height !== height) { buffer.width = width; buffer.height = height; }
    const bufferContext = buffer.getContext('2d');
    if (!bufferContext) throw new Error('No se pudo dibujar la transición.');
    bufferContext.clearRect(0, 0, width, height);
    drawScene(bufferContext, slide, 0, 0, zoom);
    ctx.save(); ctx.globalAlpha = opacity; ctx.drawImage(buffer, 0, 0); ctx.restore();
  };
  const transitionWindow = Math.min(0.35, current.duration / 2);
  const transitionProgress = editing ? 0 : Math.max(0, (scene.progress * current.duration - current.duration + transitionWindow) / transitionWindow);
  const next = slides[scene.index + 1];
  drawScene(ctx, current, scene.progress, next && current.transition === 'pan' ? -width * transitionProgress : 0);
  if (next && transitionProgress > 0) {
    if (current.transition === 'dissolve' || current.transition === 'fade') drawOverlay(next, transitionProgress);
    else if (current.transition === 'wipe') {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, width * transitionProgress, height); ctx.clip();
      drawScene(ctx, next, 0); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(width * transitionProgress - width * 0.003, 0, width * 0.006, height);
    }
    else if (current.transition === 'zoom') drawOverlay(next, transitionProgress, 1.12 - transitionProgress * 0.12);
    else if (current.transition === 'pan') {
      drawScene(ctx, next, 0, width * (1 - transitionProgress));
    } else if (current.transition === 'flash') {
      if (transitionProgress > 0.5) drawScene(ctx, next, 0);
      ctx.fillStyle = 'rgba(255,255,255,' + Math.sin(transitionProgress * Math.PI) + ')'; ctx.fillRect(0, 0, width, height);
    }
  }
  drawTextOverlay(ctx, config, width, height);
}

