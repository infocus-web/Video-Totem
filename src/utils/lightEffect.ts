import type { LightEffect, LightEffectStyle } from '../types/index.ts';

export const LIGHT_STYLES: { value: LightEffectStyle; label: string }[] = [
  { value: 'none', label: 'Sin luces' }, { value: 'bokeh', label: 'Bokeh' },
  { value: 'flares', label: 'Destellos' }, { value: 'both', label: 'Bokeh y destellos' },
];
export const DEFAULT_LIGHT_OPACITY = 0.2;

export function normalizeLightEffect(value: unknown): LightEffect | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;
  const style = LIGHT_STYLES.some(item => item.value === data.style) ? data.style as LightEffectStyle : 'none';
  const opacity = typeof data.opacity === 'number' && Number.isFinite(data.opacity) ? Math.max(0, Math.min(1, data.opacity)) : DEFAULT_LIGHT_OPACITY;
  return { style, opacity };
}

// Fixed pseudo-random values so every frame (preview or export) draws the same lights for the same time.
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}
const COLORS = ['255,214,150', '255,236,205', '255,190,170', '255,245,235', '250,200,120', '235,215,255'];
const BOKEH = (() => {
  const random = seeded(20261022);
  return Array.from({ length: 24 }, () => ({
    x: random(), y: random(), size: 0.035 + Math.pow(random(), 1.6) * 0.1,
    driftX: (random() - 0.5) * 0.018, driftY: -0.004 - random() * 0.012,
    wobble: 0.01 + random() * 0.025, wobbleSpeed: 0.15 + random() * 0.35,
    pulse: 0.25 + random() * 0.6, phase: random() * Math.PI * 2, color: COLORS[Math.floor(random() * COLORS.length)],
  }));
})();

const wrap = (value: number) => ((value % 1.3) + 1.3) % 1.3 - 0.15;

function drawBokeh(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const base = Math.min(width, height);
  for (const light of BOKEH) {
    const x = wrap(light.x + light.driftX * time + Math.sin(time * light.wobbleSpeed + light.phase) * light.wobble) * width;
    const y = wrap(light.y + light.driftY * time) * height;
    const radius = light.size * base;
    const glow = 0.55 + 0.45 * Math.sin(time * light.pulse + light.phase);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(' + light.color + ',' + 0.55 * glow + ')');
    gradient.addColorStop(0.72, 'rgba(' + light.color + ',' + 0.42 * glow + ')');
    gradient.addColorStop(0.86, 'rgba(' + light.color + ',' + 0.6 * glow + ')');
    gradient.addColorStop(1, 'rgba(' + light.color + ',0)');
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }
}

function drawFlares(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const cx = width / 2, cy = height / 2, base = Math.min(width, height);
  // The light source travels slowly around the upper part of the frame.
  const angle = time * 0.09 + 0.6;
  const sx = cx + Math.cos(angle) * width * 0.42, sy = cy - height * 0.28 + Math.sin(angle * 1.7) * height * 0.12;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, base * 0.75);
  glow.addColorStop(0, 'rgba(255,240,215,0.95)'); glow.addColorStop(0.18, 'rgba(255,200,140,0.45)'); glow.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
  // Wide horizontal streak through the source.
  ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.035);
  const streak = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 0.9);
  streak.addColorStop(0, 'rgba(255,245,230,0.9)'); streak.addColorStop(0.35, 'rgba(255,215,170,0.35)'); streak.addColorStop(1, 'rgba(255,200,150,0)');
  ctx.fillStyle = streak; ctx.beginPath(); ctx.arc(0, 0, width * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // Ghost reflections along the line from the source through the center.
  [[0.55, 0.05, '255,210,160'], [1.25, 0.08, '200,220,255'], [1.6, 0.035, '255,190,200'], [1.9, 0.12, '255,225,180']].forEach(([step, size, color]) => {
    const gx = sx + (cx - sx) * (step as number), gy = sy + (cy - sy) * (step as number), radius = base * (size as number);
    const ghost = ctx.createRadialGradient(gx, gy, radius * 0.6, gx, gy, radius);
    ghost.addColorStop(0, 'rgba(' + color + ',0.22)'); ghost.addColorStop(0.85, 'rgba(' + color + ',0.4)'); ghost.addColorStop(1, 'rgba(' + color + ',0)');
    ctx.fillStyle = ghost; ctx.beginPath(); ctx.arc(gx, gy, radius, 0, Math.PI * 2); ctx.fill();
  });
}

export function drawLightEffect(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, effect: LightEffect | undefined) {
  if (!effect || effect.style === 'none' || effect.opacity <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = effect.opacity;
  if (effect.style === 'bokeh' || effect.style === 'both') drawBokeh(ctx, width, height, time);
  if (effect.style === 'flares' || effect.style === 'both') drawFlares(ctx, width, height, time);
  ctx.restore();
}
