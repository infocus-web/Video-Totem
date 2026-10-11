export type PhotoOrientation = 'horizontal' | 'vertical' | 'square';
export type TransitionType = 'dissolve' | 'fade' | 'zoom' | 'wipe' | 'pan' | 'flash' | 'none';

export interface FilePreparationProgress {
  completed: number;
  total: number;
}

export interface PhotoFraming { x: number; y: number; zoom: number; rotation?: 0 | 90 | 180 | 270 }

export interface PhotoItem {
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

export interface SequenceConfig {
  name: string;
  aspectRatio: '9:16' | '1:1' | '16:9' | '4:5';
  width: number;
  height: number;
  fps: number;
  defaultDuration: number;
  defaultTransition: TransitionType;
  backgroundStyle: 'blur' | 'black' | 'mirror' | 'gradient';
  photoFit: 'contain' | 'cover';
  horizontalGrouping: HorizontalGroupMode;
  splitGapSize: number; // gap between stacked photos in pixels (e.g. 6px)
  musicTrack: string;
  musicVolume: number;
  showOverlayText: boolean;
  eventTitle: string;
  eventSubtitle: string;
  watermark: string;
  fontFamily: string;
  localBasePath: string;
  driveLink: string;
  filenamePrefix: string;
  filenamePadding: number;
  filenameExtension: string;
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
