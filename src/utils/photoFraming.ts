import type { PhotoFraming, PhotoItem, SequenceConfig } from '../types/index.ts';

export function normalizeFraming(value: unknown): PhotoFraming {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const number = (key: string, fallback: number, min: number, max: number) =>
    typeof input[key] === 'number' && Number.isFinite(input[key]) ? Math.max(min, Math.min(max, input[key] as number)) : fallback;
  const rotation = input.rotation;
  return { x: number('x', 0.5, 0, 1), y: number('y', 0.5, 0, 1), zoom: number('zoom', 1, 1, 3),
    ...(rotation === 90 || rotation === 180 || rotation === 270 ? { rotation } : {}) };
}

export function photoSlots(count: number, width: number, height: number, gap: number) {
  const size = width > height ? width : height;
  gap = Number.isFinite(gap) ? Math.max(0, Math.min(gap, count > 1 ? (size - count) / (count - 1) : 0)) : 0;
  if (width > height) {
    const slotWidth = (width - gap * (count - 1)) / count;
    return Array.from({ length: count }, (_, index) => ({ x: index * (slotWidth + gap), y: 0, width: slotWidth, height }));
  }
  const slotHeight = (height - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, index) => ({ x: 0, y: index * (slotHeight + gap), width, height: slotHeight }));
}

export function photoGeometry(photo: Pick<PhotoItem, 'kenBurns' | 'framing'>, imageWidth: number, imageHeight: number, width: number, height: number, fit: SequenceConfig['photoFit'], progress: number) {
  const framing = normalizeFraming(photo.framing);
  if (framing.rotation === 90 || framing.rotation === 270) [imageWidth, imageHeight] = [imageHeight, imageWidth];
  const motionZoom = photo.kenBurns === 'zoom-in' ? 1 + progress * 0.1 : photo.kenBurns === 'zoom-out' ? 1.1 - progress * 0.1 : photo.kenBurns === 'static' ? 1 : 1.06;
  const scale = (fit === 'cover' ? Math.max(width / imageWidth, height / imageHeight) : Math.min(width / imageWidth, height / imageHeight)) * motionZoom * framing.zoom;
  const drawnWidth = imageWidth * scale, drawnHeight = imageHeight * scale;
  const desiredPan = photo.kenBurns === 'pan-up' ? (0.5 - progress) * height * 0.04 : photo.kenBurns === 'pan-down' ? (progress - 0.5) * height * 0.04 : 0;
  const left = (width - drawnWidth) * framing.x;
  const top = (height - drawnHeight) * framing.y + desiredPan;
  return { width: drawnWidth, height: drawnHeight, left,
    top: fit === 'cover' ? Math.max(height - drawnHeight, Math.min(0, top)) : top };
}
