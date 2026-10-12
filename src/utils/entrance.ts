import type { EntranceConfig, SequenceConfig, SequenceSlide } from '../types/index.ts';
import { musicRange } from './musicTrim.ts';

export const DEFAULT_ENTRANCE: EntranceConfig = { enabled: false, musicStart: 0, musicEnd: 30, initialDuration: 2, beatStart: 25, countdownStart: null, countdown: 5, countdownOpacity: 1, beatTimes: [], beatShift: 0, everyBeats: 1 };

export function normalizeEntrance(value: unknown): EntranceConfig {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const bounded = (key: string, fallback: number, min: number, max: number) => typeof data[key] === 'number' && Number.isFinite(data[key]) ? Math.max(min, Math.min(max, data[key])) : fallback;
  const musicEnd = bounded('musicEnd', 30, 0.01, 86400), countdown = data.countdown === 10 ? 10 : 5;
  return { enabled: data.enabled === true, musicStart: 0, musicEnd, countdown,
    countdownOpacity: bounded('countdownOpacity', 1, 0, 1),
    initialDuration: bounded('initialDuration', 2, 0.1, 60),
    beatStart: bounded('beatStart', Math.min(30, Math.max(0, musicEnd - countdown)), 0, musicEnd),
    countdownStart: data.countdownStart == null ? null : bounded('countdownStart', 0, 0, Math.max(0, musicEnd - countdown)),
    beatShift: bounded('beatShift', 0, -2, 2), everyBeats: Math.round(bounded('everyBeats', 1, 1, 8)),
    beatTimes: Array.isArray(data.beatTimes) ? [...new Set(data.beatTimes.filter((t): t is number => typeof t === 'number' && Number.isFinite(t) && t >= 0 && t <= musicEnd))].sort((a,b) => a-b).slice(0, 100000) : [] };
}

export function sequenceDuration(slides: SequenceSlide[], config: SequenceConfig) {
  if (!slides.length) return 0;
  const entry = config.entrance;
  return entry?.enabled ? musicRange(config, entry.musicEnd).duration : slides.reduce((sum, slide) => sum + slide.duration, 0);
}

export function countdownStart(entry: EntranceConfig, end = entry.musicEnd) {
  return entry.countdownStart ?? Math.max(0, end - entry.countdown);
}

export function entranceCuts(entry: EntranceConfig, fps: number, start = 0, end = entry.musicEnd) {
  const beforeCountdown = Math.round((countdownStart(entry, end) - start) * fps);
  const beatFrame = Math.max(0, Math.min(beforeCountdown, Math.round((entry.beatStart - start) * fps)));
  const interval = Math.max(1, Math.round(entry.initialDuration * fps)), cuts = [0];
  for (let frame = interval; frame < beatFrame; frame += interval) cuts.push(frame);
  // The chosen second starts the beat stage even if no attack lands exactly there.
  if (beatFrame > 0 && beatFrame < beforeCountdown) cuts.push(beatFrame);
  const beats = entry.beatTimes.map(t => Math.round((t + entry.beatShift - start) * fps)).filter(frame => frame > beatFrame && frame < beforeCountdown);
  beats.filter((_, index) => index % entry.everyBeats === 0).forEach(frame => cuts.push(frame));
  return [...new Set(cuts)].sort((a,b) => a-b);
}

const cutCache = new WeakMap<EntranceConfig, Map<string, number[]>>();
function cutsFor(entry: EntranceConfig, fps: number, start = 0, end = entry.musicEnd) {
  let cache = cutCache.get(entry); if (!cache) { cache = new Map(); cutCache.set(entry, cache); }
  const key = fps + ':' + start + ':' + end;
  let cuts = cache.get(key); if (!cuts) { cuts = entranceCuts(entry, fps, start, end); if (cache.size >= 64) cache.clear(); cache.set(key, cuts); } return cuts;
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
  const range = musicRange(config, entry.musicEnd);
  const frame = Math.max(0, Math.floor(time * config.fps + 1e-7));
  const start = Math.round((countdownStart(entry, range.end) - range.start) * config.fps), end = start + entry.countdown * config.fps;
  const cuts = cutsFor(entry, config.fps, range.start, range.end);
  const lastInterval = cuts.length > 1 ? (cuts.at(-1)! - cuts.at(-2)!) / config.fps : entry.initialDuration;
  const ramp = countdownCuts(entry.countdown, config.fps, lastInterval);
  const preceding = start > 0 ? cuts.length : 0;
  const step = frame < start ? upperBound(cuts, frame) - 1 : frame < end ? preceding + upperBound(ramp, frame - start) - 1 : preceding + ramp.length + frame - end;
  const sourceIndex = Math.max(0, step) % Math.max(1, slides.length);
  const startFrame = frame < start ? cuts[Math.max(0, step)] : frame < end ? start + ramp[upperBound(ramp, frame - start) - 1] : frame;
  const finalFrame = Math.ceil(range.duration * config.fps - 1e-8) - 1;
  const nextFrame = frame < start ? cuts[upperBound(cuts,frame)] ?? start : frame < end ? start + (ramp[upperBound(ramp,frame-start)] ?? entry.countdown * config.fps) : frame + 1;
  return { index: sourceIndex, progress: Math.max(0, Math.min(1, (frame - startFrame) / Math.max(1, nextFrame - startFrame))), elapsed: (frame - startFrame) / config.fps,
    countdown: frame < start || frame >= end + config.fps ? null : frame >= end || frame >= finalFrame ? 0 : Math.ceil((end - frame) / config.fps) };
}

export function entranceSceneStart(index: number, config: SequenceConfig) {
  const entry = config.entrance;
  if (!entry?.enabled) return null;
  const range = musicRange(config, entry.musicEnd);
  return (cutsFor(entry, config.fps, range.start, range.end)[index] ?? 0) / config.fps;
}

export function validateEntrance(config: SequenceConfig, trackDuration: number | null) {
  const entry = config.entrance;
  if (!entry?.enabled) return;
  if (trackDuration === null) throw new Error('Cargá o reconectá la canción de la entrada antes de reproducir o exportar.');
  if (config.musicTrack === 'none') throw new Error('Activá la música para la entrada.');
  if (config.width <= config.height || config.outputRotation) throw new Error('La entrada necesita el formato horizontal 16:9.');
  if (!Number.isFinite(entry.musicEnd) || Math.abs(entry.musicEnd - trackDuration) > 0.001) throw new Error('Reconectá la canción para actualizar la duración completa.');
  const range = musicRange(config, trackDuration);
  if (range.duration + 1e-6 < entry.countdown) throw new Error('El tramo de música debe durar al menos ' + entry.countdown + ' segundos.');
  const start = countdownStart(entry, range.end);
  if (start < range.start || start + entry.countdown > range.end + 1e-6 || entry.beatStart < range.start || entry.beatStart > start) throw new Error('Los golpes deben empezar antes del contador, y el contador debe terminar dentro del tramo de música.');
  if (!(entry.initialDuration >= 0.1 && entry.initialDuration <= 60)) throw new Error('Elegí una duración inicial entre 0.1 y 60 segundos.');
  if (entry.beatStart < start && !entry.beatTimes.some(t => t + entry.beatShift > entry.beatStart && t + entry.beatShift < start)) throw new Error('Detectá los golpes o ingresá cortes entre el inicio de golpes y el contador.');
}
