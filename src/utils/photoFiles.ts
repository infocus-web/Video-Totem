import type { PhotoItem } from '../types/index.ts';
import { matchPhotoSelection } from './photoParser.ts';

export function photoFileInfo(file: Pick<File, 'name' | 'webkitRelativePath'>) {
  const relativePath = file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(1).join('/') : file.name;
  return { id: relativePath.toLowerCase(), filename: file.name, relativePath,
    number: file.name.replace(/\.[^.]+$/, '').match(/\d+[a-z]?$/i)?.[0] ?? file.name };
}

export function selectPhotoFiles<T extends Pick<File, 'name' | 'webkitRelativePath'>>(files: T[], requested: PhotoItem[]) {
  // Only inspect filenames here. Image decoding and object URLs happen after matching.
  const candidates = files.filter(file => /\.(jpe?g|png|webp|avif)$/i.test(file.name));
  const selection = matchPhotoSelection(requested, candidates.map(file => ({ ...photoFileInfo(file), file })));
  return { files: selection.resolved.map(photo => photo.file), total: candidates.length,
    missing: selection.missing, ambiguous: selection.ambiguous };
}

export function reconnectPhotoFiles<T extends Pick<File, 'name' | 'webkitRelativePath'>>(files: T[], library: PhotoItem[]) {
  const names = new Set(library.map(photo => photo.filename.toLowerCase()));
  // Include duplicate names so reconnectPhotos can reject ambiguous reconnections safely.
  return files.filter(file => names.has(file.name.toLowerCase()));
}
