import type { EntranceConfig, SequenceConfig, SequenceSlide } from '../types/index.ts';

export const DEFAULT_ENTRANCE: EntranceConfig = { enabled: false, musicStart: 0, musicEnd: 30, initialDuration: 2, beatStart: 25, countdownStart: null, countdown: 5, beatTimes: [], beatShift: 0, everyBeats: 1 };

export function normalizeEntrance(value: unknown): EntranceConfig {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const bounded = (key: string, fallback: number, min: number, max: number) => typeof data[key] === 'number' && Number.isFinite(data[key]) ? Math.max(min, Math.min(max, data[key])) : fallback;
  const musicEnd = bounded('musicEnd', 30, 0.01, 86400), countdown = data.countdown === 10 ? 10 : 5;
  return { enabled: data.enabled === true, musicStart: 0, musicEnd, countdown,
    initialDuration: bounded('initialDuration', 2, 0.1, 60),
    beatStart: bounded('beatStart', Math.min(30, Math.max(0, musicEnd - countdown)), 0, musicEnd),
    countdownStart: data.countdownStart == null ? null : bounded('countdownStart', 0, 0, Math.max(0, musicEnd - countdown)),
    beatShift: bounded('beatShift', 0, -2, 2), everyBeats: Math.round(bounded('everyBeats', 1, 1, 8)),
    beatTimes: Array.isArray(data.beatTimes) ? [...new Set(data.beatTimes.filter((t): t is number => typeof t === 'number' && Number.isFinite(t) && t >= 0 && t <= musicEnd))].sort((a,b) => a-b).slice(0, 100000) : [] };
}

export function sequenceDuration(slides: SequenceSlide[], config: SequenceConfig) {
  if (!slides.length) return 0;
  const entry = config.entrance;
  return entry?.enabled ? entry.musicEnd : slides.reduce((sum, slide) => sum + slide.duration, 0);
}

export function countdownStart(entry: EntranceConfig) {
  return entry.countdownStart ?? Math.max(0, entry.musicEnd - entry.countdown);
}

export function entranceCuts(entry: EntranceConfig, fps: number) {
  const beforeCountdown = Math.round(countdownStart(entry) * fps);
  const beatFrame = Math.min(beforeCountdown, Math.round(entry.beatStart * fps));
  const interval = Math.max(1, Math.round(entry.initialDuration * fps)), cuts = [0];
  for (let frame = interval; frame < beatFrame; frame += interval) cuts.push(frame);
  // The chosen second starts the beat stage even if no attack lands exactly there.
  if (beatFrame > 0 && beatFrame < beforeCountdown) cuts.push(beatFrame);
  const beats = entry.beatTimes.map(t => Math.round((t + entry.beatShift) * fps)).filter(frame => frame > beatFrame && frame < beforeCountdown);
  beats.filter((_, index) => index % entry.everyBeats === 0).forEach(frame => cuts.push(frame));
  return [...new Set(cuts)].sort((a,b) => a-b);
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

const rampCache = new Map<string, number[]>();
export function countdownCuts(seconds: number, fps: number, initialDuration = 0.5) {
  const initialFrames = Math.max(1, Math.round(initialDuration * fps));
  const key = seconds + ':' + fps + ':' + initialFrames;
  let cuts = rampCache.get(key); if (cuts) return cuts;
  cuts = [0]; const end = Math.round(seconds * fps);
  for (let frame = 0; frame < end;) {
    // Integrating the rate per frame avoids holding a long initial photo through the whole countdown.
    let accumulated = 0;
    do {
      const interval = Math.max(1, initialFrames * Math.pow(1 / initialFrames, Math.min(1, frame / (end * 0.8))));
      accumulated += 1 / interval; frame++;
    } while (frame < end && accumulated < 1);
    if (frame < end) cuts.push(frame);
  }
  if (rampCache.size >= 128) rampCache.clear();
  rampCache.set(key, cuts); return cuts;
}

export function entranceScene(slides: SequenceSlide[], config: SequenceConfig, time: number) {
  const entry = config.entrance!;
  const frame = Math.max(0, Math.floor(time * config.fps + 1e-7));
  const start = Math.round(countdownStart(entry) * config.fps), end = start + entry.countdown * config.fps;
  const cuts = cutsFor(entry, config.fps);
  const lastInterval = cuts.length > 1 ? (cuts.at(-1)! - cuts.at(-2)!) / config.fps : entry.initialDuration;
  const ramp = countdownCuts(entry.countdown, config.fps, lastInterval);
  const step = frame < start ? upperBound(cuts, frame) - 1 : frame < end ? cuts.length + upperBound(ramp, frame - start) - 1 : cuts.length + ramp.length + frame - end;
  const sourceIndex = Math.max(0, step) % Math.max(1, slides.length);
  const startFrame = frame < start ? cuts[Math.max(0, step)] : frame < end ? start + ramp[upperBound(ramp, frame - start) - 1] : frame;
  const finalFrame = Math.ceil(entry.musicEnd * config.fps - 1e-8) - 1;
  return { index: sourceIndex, progress: 0, elapsed: (frame - startFrame) / config.fps,
    countdown: frame < start || frame >= end + config.fps ? null : frame >= end || frame >= finalFrame ? 0 : Math.ceil((end - frame) / config.fps) };
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
  if (!Number.isFinite(entry.musicEnd) || Math.abs(entry.musicEnd - trackDuration) > 0.001) throw new Error('Reconectá la canción para actualizar la duración completa.');
  if (entry.musicEnd < entry.countdown) throw new Error('La canción debe durar al menos ' + entry.countdown + ' segundos.');
  const start = countdownStart(entry);
  if (start < 0 || start + entry.countdown > entry.musicEnd + 1e-6 || entry.beatStart < 0 || entry.beatStart > start) throw new Error('Los golpes deben empezar antes del contador, y el contador debe terminar dentro de la canción.');
  if (!(entry.initialDuration >= 0.1 && entry.initialDuration <= 60)) throw new Error('Elegí una duración inicial entre 0.1 y 60 segundos.');
  if (entry.beatStart < start && !entry.beatTimes.some(t => t + entry.beatShift > entry.beatStart && t + entry.beatShift < start)) throw new Error('Detectá los golpes o ingresá cortes entre el inicio de golpes y el contador.');
}
