import type { PhotoItem } from '../types/index.ts';
import { localPath } from './config.ts';

const normalize = (path: string) => path.replace(/\\/g, '/').normalize('NFC').toLowerCase();

function indexPhotos(photos: PhotoItem[], key: (photo: PhotoItem) => string) {
  const index = new Map<string, PhotoItem[]>();
  for (const photo of photos) {
    const value = key(photo);
    const matches = index.get(value) ?? [];
    matches.push(photo);
    index.set(value, matches);
  }
  return index;
}

export function reconnectPhotos(library: PhotoItem[], imported: PhotoItem[], basePath: string) {
  const merged = new Map(library.map(photo => [photo.id, photo]));
  const byPath = indexPhotos(library, photo => normalize(photo.relativePath || photo.filename));
  const byName = indexPhotos(library, photo => normalize(photo.filename));
  const incomingNames = indexPhotos(imported, photo => normalize(photo.filename));
  const matches = new Map<PhotoItem, PhotoItem>();
  const assigned = new Set<string>();
  const assign = (incoming: PhotoItem, existing: PhotoItem | undefined) => {
    if (!existing || assigned.has(existing.id)) return;
    matches.set(incoming, existing);
    assigned.add(existing.id);
  };
  // Reserve exact matches first so a filename fallback cannot steal another file's identity.
  for (const photo of imported) assign(photo, merged.get(photo.id));
  for (const photo of imported) {
    if (matches.has(photo)) continue;
    const candidates = byPath.get(normalize(photo.relativePath || photo.filename));
    if (candidates?.length === 1) assign(photo, candidates[0]);
  }
  for (const photo of imported) {
    if (matches.has(photo)) continue;
    const name = normalize(photo.filename);
    const candidates = byName.get(name);
    // A changed folder can be recovered by name only when the match is unambiguous.
    if (candidates?.length === 1 && !candidates[0].previewUrl && incomingNames.get(name)?.length === 1) {
      assign(photo, candidates[0]);
    }
  }
  const connected = imported.map(photo => {
    const saved = matches.get(photo);
    if (!saved) return photo;
    const relativePath = saved.relativePath || saved.filename;
    return { ...saved, ...photo, id: saved.id, relativePath, fullLocalPath: localPath(basePath, relativePath),
      ...(photo.mediaType === 'video' ? { clipStart: Math.min(saved.clipStart ?? photo.clipStart ?? 0, (photo.mediaDuration || 1) - 0.001) } : {}),
      duration: saved.duration, transition: saved.transition, kenBurns: saved.kenBurns, orientation: saved.orientation };
  });
  for (const photo of connected) merged.set(photo.id, photo);
  return { library: [...merged.values()], connected, reconnected: [...matches.values()].filter(photo => !photo.previewUrl).length };
}
