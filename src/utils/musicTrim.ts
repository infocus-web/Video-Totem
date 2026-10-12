import type { MusicTrim, SequenceConfig } from '../types/index.ts';

export function normalizeMusicTrim(value: unknown): MusicTrim {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const valid = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 86400;
  const start = valid(data.start) ? data.start : 0;
  const end = valid(data.end) && data.end > start ? data.end : null;
  return { start, end };
}

export function musicRange(config: Pick<SequenceConfig, 'musicTrim'>, duration: number) {
  const length = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const trim = normalizeMusicTrim(config.musicTrim), minimum = Math.min(0.1, length);
  const start = Math.min(trim.start, Math.max(0, length - minimum));
  const end = Math.min(length, Math.max(start + minimum, trim.end ?? length));
  return { start, end, duration: end - start };
}

export function setMusicTrim(config: SequenceConfig, trim: MusicTrim | undefined, duration: number): SequenceConfig {
  const next = { ...config, musicTrim: trim && normalizeMusicTrim(trim) };
  const range = musicRange(next, duration), entry = config.entrance;
  if (!entry) return next;
  const latestStart = Math.max(range.start, range.end - entry.countdown);
  const counter = entry.countdownStart === null ? null : Math.min(latestStart, Math.max(range.start, entry.countdownStart));
  return { ...next, entrance: { ...entry, musicStart: 0, musicEnd: duration, countdownStart: counter,
    beatStart: Math.min(counter ?? latestStart, Math.max(range.start, entry.beatStart)) } };
}

export function musicTime(offset: number, start: number, end: number, loop: boolean) {
  const duration = Math.max(0, end - start);
  if (!duration) return start;
  return start + (loop ? Math.max(0, offset) % duration : Math.min(duration, Math.max(0, offset)));
}
