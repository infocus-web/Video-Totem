import type { OverlayTextKey, OverlayTextStyle, SequenceConfig } from '../types/index.ts';

export const TEXT_FONTS = ['Arial', 'Plus Jakarta Sans', 'Verdana', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Courier New', 'Impact'] as const;
export const TEXT_LAYERS: { key: OverlayTextKey; label: string; caption: string }[] = [
  { key: 'eventTitle', label: 'Título', caption: 'Título' },
  { key: 'eventSubtitle', label: 'Subtítulo', caption: 'Subtítulo' },
  { key: 'watermark', label: 'Marca de agua', caption: 'Firma' },
];
const defaults: Record<OverlayTextKey, OverlayTextStyle> = {
  eventTitle: { fontFamily: 'Arial', size: 43, x: 50, y: 8, align: 'center' },
  eventSubtitle: { fontFamily: 'Arial', size: 29, x: 50, y: 11, align: 'center' },
  watermark: { fontFamily: 'Arial', size: 29, x: 50, y: 93, align: 'center' },
};
export function overlayFont(value: unknown) {
  return TEXT_FONTS.find(font => font === value) || 'Arial';
}
const bounded = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function normalizeTextStyle(value: unknown, key: OverlayTextKey, legacyFont?: string): OverlayTextStyle {
  const fallback = { ...defaults[key], fontFamily: overlayFont(legacyFont) };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const style = value as Record<string, unknown>;
  return {
    fontFamily: style.fontFamily === undefined ? fallback.fontFamily : overlayFont(style.fontFamily),
    size: bounded(style.size, fallback.size, 12, 180),
    x: bounded(style.x, fallback.x, 0, 100), y: bounded(style.y, fallback.y, 0, 100),
    align: style.align === 'left' || style.align === 'right' ? style.align : 'center',
  };
}
export function textStyle(config: SequenceConfig, key: OverlayTextKey) {
  return normalizeTextStyle(config.textStyles?.[key], key, config.fontFamily);
}
export function textFont(style: OverlayTextStyle, key: OverlayTextKey, width: number) {
  return `${key === 'eventTitle' ? 700 : 400} ${Math.round(style.size * width / 1080)}px "${style.fontFamily}", sans-serif`;
}
export async function prepareTextFonts(config: SequenceConfig) {
  if (!config.showOverlayText) return;
  await Promise.all(TEXT_LAYERS.filter(({ key }) => config[key]).map(({ key }) =>
    document.fonts.load(textFont(textStyle(config, key), key, config.width), config[key])));
  await document.fonts.ready;
}

// Clamp the whole line within safe margins, including very large or long text.
export function textPlacement(style: OverlayTextStyle, width: number, height: number, measuredWidth: number) {
  const size = Math.round(style.size * width / 1080), margin = width * 0.025;
  const maxWidth = width * 0.9, lineWidth = Math.min(maxWidth, Math.max(0, measuredWidth));
  const left = style.align === 'left' ? 0 : style.align === 'center' ? lineWidth / 2 : lineWidth;
  const right = lineWidth - left;
  const x = Math.max(margin + left, Math.min(width - margin - right, width * style.x / 100));
  const top = Math.min(height / 2, margin + size), bottom = Math.max(top, height - margin - size * 0.3);
  const y = Math.max(top, Math.min(bottom, height * style.y / 100));
  return { x, y, maxWidth };
}

export function drawTextOverlay(ctx: CanvasRenderingContext2D, config: SequenceConfig, width: number, height: number) {
  if (!config.showOverlayText) return;
  ctx.save();
  if (config.eventTitle || config.eventSubtitle) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.24);
    gradient.addColorStop(0, 'rgba(0,0,0,0.7)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height * 0.24);
  }
  ctx.fillStyle = 'white'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = width * 0.006; ctx.shadowOffsetY = width * 0.002;
  for (const { key } of TEXT_LAYERS) {
    if (!config[key]) continue;
    const style = textStyle(config, key);
    ctx.font = textFont(style, key, width); ctx.textAlign = style.align;
    const position = textPlacement(style, width, height, ctx.measureText(config[key]).width);
    ctx.fillText(config[key], position.x, position.y, position.maxWidth);
  }
  ctx.restore();
}
