import type { PhotoItem, SequenceConfig, SequenceSlide } from '../types';
import { DEFAULT_CONFIG, clampDuration } from './config.ts';
import { normalizeFraming } from './photoFraming.ts';
import { normalizeTextStyle, overlayFont, TEXT_LAYERS } from './textOverlay.ts';
import { normalizeEntrance } from './entrance.ts';
import { normalizeMusicTrim } from './musicTrim.ts';

export interface SavedProject { version: 1; localLinkId?: string; rawText: string; config: SequenceConfig; library: PhotoItem[]; slides: SequenceSlide[] }
export const STORAGE_KEY = 'autoreel-project-v1';
const transitions = ['none', 'dissolve', 'fade', 'zoom', 'wipe', 'flash', 'pan'];
const motions = ['static', 'zoom-in', 'zoom-out', 'pan-up', 'pan-down'];
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown) => typeof value === 'string' ? value.slice(0, 20000) : '';

export function serializeProject(project: SavedProject) {
  return JSON.stringify(project, (key, value: unknown) => key === 'previewUrl' || key === 'sourceUrl' ? '' : value);
}
export function decodeProject(raw: string): SavedProject {
  if (raw.length > 2000000) throw new Error('El proyecto excede el tamaño permitido.');
  const data: unknown = JSON.parse(raw);
  if (!object(data) || data.version !== 1 || !object(data.config) || !Array.isArray(data.library) || !Array.isArray(data.slides)) throw new Error('Formato de proyecto no compatible.');
  if (data.library.length > 400 || data.slides.length > 400) throw new Error('El proyecto admite hasta 400 fotos y escenas.');
  const config = { ...DEFAULT_CONFIG };
  for (const key of ['name', 'eventTitle', 'eventSubtitle', 'watermark', 'localBasePath', 'driveLink', 'filenamePrefix'] as const) config[key] = string(data.config[key]);
  for (const key of ['width', 'height'] as const) {
    const value = Number(data.config[key]);
    if (!Number.isInteger(value) || value < 128 || value > 4096) throw new Error('Resolución de proyecto inválida.');
    config[key] = value;
  }
  const fps = Number(data.config.fps);
  if (![24, 25, 30, 50, 60].includes(fps)) throw new Error('FPS no compatibles. Usá 24, 25, 30, 50 o 60.');
  config.fps = fps;
  if (data.config.entrance !== undefined) config.entrance = normalizeEntrance(data.config.entrance);
  if (data.config.musicTrim !== undefined) config.musicTrim = normalizeMusicTrim(data.config.musicTrim);
  config.aspectRatio = config.width === config.height ? '1:1' : config.width > config.height ? '16:9' : config.height / config.width === 1.25 ? '4:5' : '9:16';
  if (config.width < config.height && (data.config.outputRotation === 90 || data.config.outputRotation === 270)) config.outputRotation = data.config.outputRotation;
  config.defaultDuration = clampDuration(Number(data.config.defaultDuration));
  config.musicVolume = Math.max(0, Math.min(1, Number(data.config.musicVolume) || 0));
  if (typeof data.config.musicFingerprint === 'string' && /^[a-f0-9]{64}$/.test(data.config.musicFingerprint)) config.musicFingerprint = data.config.musicFingerprint;
  config.splitGapSize = Math.max(0, Math.min(80, Number(data.config.splitGapSize) || 0));
  config.showOverlayText = data.config.showOverlayText === true;
  config.fontFamily = overlayFont(data.config.fontFamily);
  if (object(data.config.textStyles)) {
    const savedStyles = data.config.textStyles;
    config.textStyles = Object.fromEntries(TEXT_LAYERS.map(({ key }) => [key, normalizeTextStyle(savedStyles[key], key, config.fontFamily)]));
  }
  if (['blur','black','mirror','gradient'].includes(String(data.config.backgroundStyle))) config.backgroundStyle = data.config.backgroundStyle as SequenceConfig['backgroundStyle'];
  if (data.config.photoFit === 'cover') config.photoFit = 'cover';
  if (['chill','upbeat','cinematic','none'].includes(String(data.config.musicTrack))) config.musicTrack = String(data.config.musicTrack);
  if (['single','auto-split-2','auto-split-3','auto-adaptive'].includes(String(data.config.horizontalGrouping))) config.horizontalGrouping = data.config.horizontalGrouping as SequenceConfig['horizontalGrouping'];
  if (transitions.includes(String(data.config.defaultTransition))) config.defaultTransition = data.config.defaultTransition as SequenceConfig['defaultTransition'];
  if ([0,3,4,5,6].includes(Number(data.config.filenamePadding))) config.filenamePadding = Number(data.config.filenamePadding);
  if (['.jpg','.jpeg','.png','.webp','.avif'].includes(String(data.config.filenameExtension))) config.filenameExtension = String(data.config.filenameExtension);
  const readPhoto = (value: unknown): PhotoItem => {
    if (!object(value) || typeof value.id !== 'string' || typeof value.filename !== 'string' || !value.id || !value.filename) throw new Error('Foto inválida en el proyecto.');
    const relativePath = string(value.relativePath) || value.filename;
    if (/(^|[/\\])\.\.([/\\]|$)/.test(relativePath) || /^[/\\]|^[A-Za-z]:/.test(relativePath)) throw new Error('Ruta relativa de foto inválida.');
    const duration = Number(value.mediaDuration), start = Number(value.clipStart);
    const mediaDuration = Number.isFinite(duration) ? Math.max(0.01, Math.min(36000, duration || 1)) : 1;
    const clipStart = Number.isFinite(start) ? Math.max(0, Math.min(mediaDuration - 0.001, start)) : 0;
    return { id: string(value.id), filename: value.filename, relativePath, fullLocalPath: string(value.fullLocalPath), previewUrl: '',
      ...(value.mediaType === 'video' ? { mediaType: 'video' as const, mediaDuration, clipStart } : {}),
      ...(value.framing === undefined ? {} : { framing: normalizeFraming(value.framing) }),
      number: string(value.number), orientation: value.orientation === 'horizontal' ? 'horizontal' : value.orientation === 'vertical' ? 'vertical' : 'square',
      width: Math.max(1, Math.min(50000, Number(value.width) || 1080)), height: Math.max(1, Math.min(50000, Number(value.height) || 1920)),
      duration: clampDuration(Number(value.duration)), transition: transitions.includes(String(value.transition)) ? value.transition as PhotoItem['transition'] : 'dissolve',
      kenBurns: motions.includes(String(value.kenBurns)) ? value.kenBurns as PhotoItem['kenBurns'] : 'static' };
  };
  const library = data.library.map(readPhoto);
  if (new Set(library.map(photo => photo.id)).size !== library.length) throw new Error('El proyecto tiene identificadores duplicados.');
  const byId = new Map(library.map(photo => [photo.id, photo]));
  const slides = data.slides.map((value): SequenceSlide => {
    if (!object(value) || !Array.isArray(value.photos) || !value.photos.length || value.photos.length > 3) throw new Error('Escena inválida.');
    const photos = value.photos.map(photo => {
      const parsed = readPhoto(photo);
      const original = byId.get(parsed.id);
      if (!original) throw new Error('La escena referencia una foto inexistente.');
      const pathKey = (value: string) => value.replace(/\\/g, '/').normalize('NFC').toLowerCase();
      if (pathKey(parsed.filename) !== pathKey(original.filename) || pathKey(parsed.relativePath!) !== pathKey(original.relativePath!) || parsed.mediaType !== original.mediaType)
        throw new Error('La escena referencia un archivo diferente al de la biblioteca.');
      return { ...original, ...parsed };
    });
    const layout = value.layout === 'split-3' ? 'split-3' : value.layout === 'split-2' ? 'split-2' : 'single';
    if ((layout === 'single' && photos.length !== 1) || (layout === 'split-2' && photos.length !== 2) || (layout === 'split-3' && photos.length !== 3)) throw new Error('El diseño no coincide con las fotos de la escena.');
    return { id: string(value.id), photos, layout, duration: clampDuration(Number(value.duration)),
      transition: transitions.includes(String(value.transition)) ? value.transition as SequenceSlide['transition'] : 'dissolve' };
  });
  if (new Set(slides.map(slide => slide.id)).size !== slides.length) throw new Error('Escenas duplicadas.');
  return { version: 1, ...(typeof data.localLinkId === 'string' && /^[a-f0-9-]{36}$/i.test(data.localLinkId) ? { localLinkId: data.localLinkId } : {}), rawText: string(data.rawText), config, library, slides };
}

