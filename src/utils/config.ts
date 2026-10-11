import type { SequenceConfig } from '../types';

export const DEFAULT_CONFIG: SequenceConfig = {
  name: 'Mi_Reel', aspectRatio: '9:16', width: 1080, height: 1920, fps: 30,
  defaultDuration: 1.5, defaultTransition: 'dissolve', backgroundStyle: 'blur',
  horizontalGrouping: 'auto-split-2', splitGapSize: 10, musicTrack: 'chill',
  musicVolume: 0.35, showOverlayText: true, eventTitle: '', eventSubtitle: '',
  watermark: '', fontFamily: 'Arial', localBasePath: '', driveLink: '',
  filenamePrefix: 'IMG_', filenamePadding: 3, filenameExtension: '.jpg',
};

export const clampDuration = (value: number) => Number.isFinite(value) ? Math.max(0.4, Math.min(60, value)) : 1.5;

export function localPath(base: string, relative: string): string {
  const separator = /\\|^[A-Za-z]:/.test(base) ? '\\' : '/';
  return base.trim() ? `${base.trim().replace(/[/\\]+$/, '')}${separator}${relative.replace(/[/\\]/g, separator)}` : relative;
}
