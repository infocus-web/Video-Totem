import type { PhotoFraming, PhotoItem, SequenceConfig } from '../types';
import type { SavedProject } from './projectStorage';
import { clampDuration, localPath } from './config.ts';
import { buildSlidesFromPhotos } from './photoParser.ts';
import { normalizeFraming } from './photoFraming.ts';
import type { QuarterTurn } from './faceOrientation.ts';

export function setProjectPhotoMotion(project: SavedProject, ids: string[], motion: PhotoItem['kenBurns']): SavedProject {
  const selected = new Set(ids);
  const update = (photo: PhotoItem) => selected.has(photo.id) ? { ...photo, kenBurns: motion } : photo;
  return { ...project, library: project.library.map(update), slides: project.slides.map(slide => ({ ...slide, photos: slide.photos.map(update) })) };
}

export function updateClipStart(project: SavedProject, id: string, start: number): SavedProject {
  const update = (photo: SavedProject['library'][number]) => photo.id === id && photo.mediaType === 'video' ? { ...photo,
    clipStart: Math.max(0, Math.min((photo.mediaDuration || 1) - 0.001, Number.isFinite(start) ? start : 0)) } : photo;
  return { ...project, library: project.library.map(update), slides: project.slides.map(slide => ({ ...slide, photos: slide.photos.map(update) })) };
}

export function setProjectPhotoRotations(project: SavedProject, rotations: Record<string, QuarterTurn>): SavedProject {
  const changed = new Set(project.slides.flatMap(slide => slide.photos)
    .filter(photo => rotations[photo.id] !== undefined && rotations[photo.id] !== (photo.framing?.rotation || 0)).map(photo => photo.id));
  if (!changed.size) return project;
  const update = (photo: SavedProject['library'][number]) => changed.has(photo.id)
    ? { ...photo, framing: normalizeFraming({ ...normalizeFraming(photo.framing), rotation: rotations[photo.id] }) } : photo;
  return { ...project, library: project.library.map(update), slides: project.slides.map(slide =>
    slide.photos.some(photo => changed.has(photo.id)) ? { ...slide, photos: slide.photos.map(update) } : slide) };
}

export function updatePhotoFraming(project: SavedProject, slideIndex: number, photoIndex: number, value: PhotoFraming): SavedProject {
  const selected = project.slides[slideIndex]?.photos[photoIndex];
  if (!selected) return project;
  const framing = normalizeFraming(value);
  const current = normalizeFraming(selected.framing);
  if (framing.x === current.x && framing.y === current.y && framing.zoom === current.zoom && framing.rotation === current.rotation) return project;
  const update = (photo: SavedProject['library'][number]) => photo.id === selected.id ? { ...photo, framing } : photo;
  return { ...project, library: project.library.map(update), slides: project.slides.map(slide =>
    slide.photos.some(photo => photo.id === selected.id) ? { ...slide, photos: slide.photos.map(update) } : slide) };
}

export function rotateProjectPhotos(project: SavedProject, ids: string[], direction: -90 | 90): SavedProject {
  const selected = new Set(ids);
  if (!project.slides.some(slide => slide.photos.some(photo => selected.has(photo.id)))) return project;
  const update = (photo: SavedProject['library'][number]) => {
    if (!selected.has(photo.id)) return photo;
    const framing = normalizeFraming(photo.framing);
    return { ...photo, framing: normalizeFraming({ ...framing, rotation: ((framing.rotation || 0) + direction + 360) % 360 }) };
  };
  return { ...project, library: project.library.map(update), slides: project.slides.map(slide =>
    slide.photos.some(photo => selected.has(photo.id)) ? { ...slide, photos: slide.photos.map(update) } : slide) };
}

export function updateProjectConfig(project: SavedProject, next: SequenceConfig): SavedProject {
  const config = { ...next, defaultDuration: clampDuration(next.defaultDuration) };
  if ((Object.keys(config) as (keyof SequenceConfig)[]).every(key => config[key] === project.config[key])) return project;
  const pathChanged = config.localBasePath !== project.config.localBasePath;
  const durationChanged = config.defaultDuration !== project.config.defaultDuration;
  const updatePath = (photo: SavedProject['library'][number]) => ({ ...photo, fullLocalPath: localPath(config.localBasePath, photo.relativePath || photo.filename) });
  const library = pathChanged ? project.library.map(updatePath) : project.library;
  let slides = pathChanged || durationChanged ? project.slides.map(slide => ({ ...slide,
    duration: durationChanged ? config.defaultDuration : slide.duration,
    photos: pathChanged ? slide.photos.map(updatePath) : slide.photos })) : project.slides;
  if (config.horizontalGrouping !== project.config.horizontalGrouping) {
    slides = buildSlidesFromPhotos(slides.flatMap(slide => slide.photos.map(photo => ({ ...photo, duration: slide.duration, transition: slide.transition }))), config.horizontalGrouping, config.defaultDuration, config);
  }
  return { ...project, config, library, slides };
}
