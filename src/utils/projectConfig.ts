import type { SequenceConfig } from '../types';
import type { SavedProject } from './projectStorage';
import { clampDuration, localPath } from './config.ts';
import { buildSlidesFromPhotos } from './photoParser.ts';

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
    slides = buildSlidesFromPhotos(slides.flatMap(slide => slide.photos.map(photo => ({ ...photo, duration: slide.duration, transition: slide.transition }))), config.horizontalGrouping, config.defaultDuration);
  }
  return { ...project, config, library, slides };
}
