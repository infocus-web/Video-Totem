import type { EntranceConfig, SequenceConfig, SequenceSlide } from '../types/index.ts';

export const DEFAULT_ENTRANCE: EntranceConfig = { enabled: false, musicStart: 0, musicEnd: 30, countdown: 5, beatTimes: [], beatShift: 0, everyBeats: 1 };

export function normalizeEntrance(value: unknown): EntranceConfig {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const bounded = (key: string, fallback: number, min: number, max: number) => typeof data[key] === 'number' && Number.isFinite(data[key]) ? Math.max(min, Math.min(max, data[key])) : fallback;
  const musicStart = bounded('musicStart', 0, 0, 3600);
  return { enabled: data.enabled === true, musicStart, musicEnd: bounded('musicEnd', musicStart + 30, musicStart + 5, musicStart + 299),
    countdown: data.countdown === 10 ? 10 : 5, beatShift: bounded('beatShift', 0, -2, 2), everyBeats: Math.round(bounded('everyBeats', 1, 1, 8)),
    beatTimes: Array.isArray(data.beatTimes) ? [...new Set(data.beatTimes.filter((t): t is number => typeof t === 'number' && Number.isFinite(t) && t >= 0 && t <= 3900))].sort((a,b) => a-b).slice(0, 10000) : [] };
}

export function sequenceDuration(slides: SequenceSlide[], config: SequenceConfig) {
  if (!slides.length) return 0;
  const entry = config.entrance;
  // Hold zero for one second; the selected music end is the exact instant of the entrance.
  return entry?.enabled ? Math.max(0, Math.round((entry.musicEnd - entry.musicStart) * config.fps) / config.fps) + 1 : slides.reduce((sum, slide) => sum + slide.duration, 0);
}

export function entranceCuts(entry: EntranceConfig, fps: number) {
  const beforeCountdown = Math.round((entry.musicEnd - entry.musicStart - entry.countdown) * fps);
  return [0, ...[...new Set(entry.beatTimes.filter((_, index) => index % entry.everyBeats === 0)
    .map(t => Math.round((t + entry.beatShift - entry.musicStart) * fps)).filter(frame => frame > 0 && frame < beforeCountdown))].sort((a,b) => a-b)];
}

const cutCache = new WeakMap<EntranceConfig, Map<number, number[]>>();
function cutsFor(entry: EntranceConfig, fps: number) {
  let cache = cutCache.get(entry); if (!cache) { cache = new Map(); cutCache.set(entry, cache); }
  let cuts = cache.get(fps); if (!cuts) { cuts = entranceCuts(entry, fps); cache.set(fps, cuts); } return cuts;
}

function upperBound(values: number[], value: number) {
  let low = 0, high = values.length;
  while (low < high) { const mid = (low + high) >>> 1; if (values[mid] <= value) low = mid + 1; else high = mid; }
  return low;
}

// A discrete ramp: intervals shrink exponentially from half a second to one frame.
// Sampling a continuous 1000 Hz counter would skip photos; this schedule shows every step.
const rampCache = new Map<string, number[]>();
export function countdownCuts(seconds: number, fps: number) {
  const key = seconds + ':' + fps;
  let cuts = rampCache.get(key); if (cuts) return cuts;
  cuts = [0]; const end = Math.round(seconds * fps);
  for (let frame = 0; frame < end;) { const interval = Math.max(1, Math.round(fps * 0.5 * Math.pow(1 / (fps * 0.5), Math.min(1, frame / (end * 0.8))))); frame += interval; if (frame < end) cuts.push(frame); }
  rampCache.set(key, cuts); return cuts;
}

export function entranceScene(slides: SequenceSlide[], config: SequenceConfig, time: number) {
  const entry = config.entrance!;
  const frame = Math.max(0, Math.floor(time * config.fps + 1e-7));
  const end = Math.max(entry.countdown * config.fps, Math.round((entry.musicEnd - entry.musicStart) * config.fps)), start = end - entry.countdown * config.fps;
  const cuts = cutsFor(entry, config.fps);
  const ramp = countdownCuts(entry.countdown, config.fps);
  const step = frame < start ? upperBound(cuts, frame) - 1 : frame < end ? cuts.length + upperBound(ramp, frame - start) - 1 : cuts.length + ramp.length - 1;
  const sourceIndex = Math.max(0, step) % Math.max(1, slides.length);
  const startFrame = frame < start ? cuts[Math.max(0, step)] : frame < end ? start + ramp[upperBound(ramp, frame - start) - 1] : end;
  return { index: sourceIndex, progress: 0, elapsed: (frame - startFrame) / config.fps,
    countdown: frame >= start ? Math.max(0, Math.ceil((end - frame) / config.fps)) : null };
}

export function entranceSceneStart(index: number, config: SequenceConfig) {
  const entry = config.entrance;
  if (!entry?.enabled) return null;
  return (cutsFor(entry, config.fps)[index] ?? 0) / config.fps;
}

export function validateEntrance(config: SequenceConfig, trackDuration: number | null) {
  const entry = config.entrance;
  if (!entry?.enabled) return;
  if (trackDuration === null) throw new Error('Cargá o reconectá la canción de la entrada antes de reproducir o exportar.');
  if (config.musicTrack === 'none') throw new Error('Activá la música para la entrada.');
  if (config.width <= config.height || config.outputRotation) throw new Error('La entrada necesita el formato horizontal 16:9.');
  if (entry.musicEnd - entry.musicStart < entry.countdown) throw new Error('El tramo de música debe durar al menos ' + entry.countdown + ' segundos.');
  if (entry.musicEnd > trackDuration + 1e-6) throw new Error('El final elegido supera la duración de la canción.');
  if (!entry.beatTimes.length) throw new Error('Detectá los golpes de la canción o ingresá los tiempos de los cortes.');
}
