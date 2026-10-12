export type PhotoOrientation = 'horizontal' | 'vertical' | 'square';
export type TransitionType = 'dissolve' | 'fade' | 'zoom' | 'wipe' | 'pan' | 'flash' | 'none';

export interface FilePreparationProgress {
  completed: number;
  total: number;
}

export interface PhotoFraming { x: number; y: number; zoom: number; rotation?: 0 | 90 | 180 | 270 }

export interface PhotoItem {
  mediaType?: 'image' | 'video';
  mediaDuration?: number;
  clipStart?: number;
  id: string;
  number: string;
  filename: string;
  fullLocalPath: string;
  previewUrl: string;
  sourceUrl?: string;
  framing?: PhotoFraming;
  relativePath?: string;
  width?: number;
  height?: number;
  selectionByNumber?: boolean;
  orientation: PhotoOrientation;
  duration: number; // in seconds
  transition: TransitionType;
  kenBurns: 'zoom-in' | 'zoom-out' | 'pan-up' | 'pan-down' | 'static';
  title?: string;
  caption?: string;
}

export type SlideLayout = 'single' | 'split-2' | 'split-3';

export interface SequenceSlide {
  id: string;
  layout: SlideLayout;
  photos: PhotoItem[];
  duration: number;
  transition: TransitionType;
}

export type HorizontalGroupMode =
  | 'auto-split-2' // Auto group landscape in pairs
  | 'auto-split-3' // Auto group landscape in trios
  | 'auto-adaptive' // Smart mix: 2 or 3 depending on sequence
  | 'single'; // Keep single with blurred background

export type OverlayTextKey = 'eventTitle' | 'eventSubtitle' | 'watermark';
export interface OverlayTextStyle {
  fontFamily: string;
  size: number; // Pixels at a composition width of 1080; scales with the output.
  x: number; // Anchor position as a percentage of the composition.
  y: number;
  align: 'left' | 'center' | 'right';
}

export interface SequenceConfig {
  entrance?: EntranceConfig;
  musicTrim?: MusicTrim;
  name: string;
  aspectRatio: '9:16' | '1:1' | '16:9' | '4:5';
  width: number;
  height: number;
  fps: number;
  outputRotation?: 0 | 90 | 270;
  defaultDuration: number;
  defaultTransition: TransitionType;
  backgroundStyle: 'blur' | 'black' | 'mirror' | 'gradient';
  photoFit: 'contain' | 'cover';
  horizontalGrouping: HorizontalGroupMode;
  splitGapSize: number; // gap between stacked photos in pixels (e.g. 6px)
  musicTrack: string;
  musicFingerprint?: string;
  musicVolume: number;
  showOverlayText: boolean;
  eventTitle: string;
  eventSubtitle: string;
  watermark: string;
  fontFamily: string;
  textStyles?: Partial<Record<OverlayTextKey, OverlayTextStyle>>;
  localBasePath: string;
  driveLink: string;
  filenamePrefix: string;
  filenamePadding: number;
  filenameExtension: string;
}

export interface MusicTrim { start: number; end: number | null }

export interface EntranceConfig {
  enabled: boolean;
  musicStart: number; // Legacy JSON field; full-song playback always starts at zero.
  musicEnd: number; // Full duration of the loaded song, in seconds.
  initialDuration: number;
  beatStart: number;
  countdownStart: number | null; // null places the countdown at the end of the song.
  countdown: 5 | 10;
  countdownOpacity: number;
  finalPhotoId: string | null;
  beatTimes: number[];
  beatShift: number;
  everyBeats: number;
}

export interface ParsedPremiereProject {
  filename: string;
  version?: string;
  sequenceName: string;
  width: number;
  height: number;
  timebase: number;
  videoTracksCount: number;
  audioTracksCount: number;
  totalDurationFrames: number;
  totalDurationSeconds: number;
  clipsCount: number;
  clips: Array<{
    name: string;
    durationFrames: number;
    durationSeconds: number;
    startFrame: number;
    mediaPath?: string;
    hasTransitions: boolean;
    transitionType?: string;
    hasMotionEffects: boolean;
  }>;
  rawXmlPreview?: string;
}

export type ViewTab = 'editor' | 'timeline' | 'premiere' | 'guide';
