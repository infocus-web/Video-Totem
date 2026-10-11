import type { SequenceConfig, SequenceSlide, PhotoItem, FilePreparationProgress } from '../types';
export type ImageMap = Map<string, HTMLImageElement>;
const transitionBuffers = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

export async function loadImages(slides: SequenceSlide[], signal: AbortSignal, onProgress?: (progress: FilePreparationProgress) => void): Promise<ImageMap> {
  const photos = [...new Map(slides.flatMap(slide => slide.photos).map(photo => [photo.id, photo])).values()];
  const images = new Map<string, HTMLImageElement>();
  onProgress?.({ completed: 0, total: photos.length });
  // Limit concurrent decoding to avoid a memory spike on large folders.
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(4, photos.length) }, async () => {
    while (index < photos.length) {
      const photo = photos[index++];
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

export function drawFrame(canvas: HTMLCanvasElement, slides: SequenceSlide[], config: SequenceConfig, images: ImageMap, time: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no ofrece Canvas 2D.');
  const width = canvas.width, height = canvas.height;
  ctx.resetTransform(); ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#09090b'; ctx.fillRect(0, 0, width, height);
  const scene = sceneAtTime(slides, time), current = slides[scene.index];
  if (!current) return;
  const drawImage = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, photo: PhotoItem, x: number, y: number, w: number, h: number, progress: number) => {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (config.photoFit !== 'cover' && (config.backgroundStyle === 'blur' || config.backgroundStyle === 'mirror')) {
      ctx.save();
      if (config.backgroundStyle === 'blur') ctx.filter = 'blur(' + Math.round(width / 24) + 'px) brightness(0.6)';
      if (config.backgroundStyle === 'mirror') { ctx.translate(x + w, 0); ctx.scale(-1, 1); }
      const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * 1.2;
      ctx.drawImage(image, config.backgroundStyle === 'mirror' ? 0 : x + (w - image.naturalWidth * scale) / 2,
        y + (h - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale);
      ctx.restore();
    } else if (config.photoFit !== 'cover' && config.backgroundStyle === 'gradient') {
      const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
      gradient.addColorStop(0, '#312e81'); gradient.addColorStop(1, '#09090b');
      ctx.fillStyle = gradient; ctx.fillRect(x, y, w, h);
    }
    const zoom = photo.kenBurns === 'zoom-in' ? 1 + progress * 0.1 : photo.kenBurns === 'zoom-out' ? 1.1 - progress * 0.1 : photo.kenBurns === 'static' ? 1 : 1.06;
    const scale = (config.photoFit === 'cover' ? Math.max(w / image.naturalWidth, h / image.naturalHeight) : Math.min(w / image.naturalWidth, h / image.naturalHeight)) * zoom;
    const imageW = image.naturalWidth * scale, imageH = image.naturalHeight * scale;
    const desiredPan = photo.kenBurns === 'pan-up' ? (0.5 - progress) * h * 0.04 : photo.kenBurns === 'pan-down' ? (progress - 0.5) * h * 0.04 : 0;
    const maxPan = Math.max(0, (imageH - h) / 2);
    const pan = config.photoFit === 'cover' ? Math.max(-maxPan, Math.min(maxPan, desiredPan)) : desiredPan;
    ctx.drawImage(image, x + (w - imageW) / 2, y + (h - imageH) / 2 + pan, imageW, imageH);
    ctx.restore();
  };
  const drawScene = (ctx: CanvasRenderingContext2D, slide: SequenceSlide, progress: number, offsetX = 0, zoom = 1) => {
    ctx.save(); ctx.translate(offsetX + width / 2, height / 2); ctx.scale(zoom, zoom); ctx.translate(-width / 2, -height / 2);
    ctx.fillStyle = '#09090b'; ctx.fillRect(0, 0, width, height);
    const gap = config.splitGapSize * width / config.width;
    const count = slide.photos.length;
    const slotHeight = (height - gap * (count - 1)) / count;
    slide.photos.forEach((photo, index) => {
      const image = images.get(photo.id);
      if (image) drawImage(ctx, image, photo, 0, index * (slotHeight + gap), width, slotHeight, progress);
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
  const transitionProgress = Math.max(0, (scene.progress * current.duration - current.duration + transitionWindow) / transitionWindow);
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
  if (config.showOverlayText) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.24);
    gradient.addColorStop(0, 'rgba(0,0,0,0.7)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height * 0.24);
    ctx.textAlign = 'center'; ctx.fillStyle = 'white';
    ctx.font = '700 ' + Math.round(width * 0.04) + 'px "' + config.fontFamily + '", sans-serif';
    ctx.fillText(config.eventTitle, width / 2, height * 0.08, width * 0.9);
    ctx.font = Math.round(width * 0.027) + 'px "' + config.fontFamily + '", sans-serif';
    ctx.fillText(config.eventSubtitle, width / 2, height * 0.11, width * 0.9);
    ctx.fillText(config.watermark, width / 2, height * 0.93, width * 0.9);
  }
}

