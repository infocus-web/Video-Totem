import type { PhotoItem, SequenceSlide, HorizontalGroupMode } from '../types';
import { localPath } from './config.ts';

export interface ParseOptions {
  localBasePath: string; prefix: string; padding: number; extension: string; defaultDuration: number;
}

export function parseClientSelectionText(text: string, options: ParseOptions): PhotoItem[] {
  if (text.length > 20000) throw new Error('La selección es demasiado larga. Usá hasta 20.000 caracteres.');
  const identifiers: string[] = [];
  // Match filenames and camera codes before numbers, so their digits are never extracted twice.
  const pattern = /[\p{L}\p{N}_().-]+\.(?:jpe?g|png|webp|avif)|\b(?:IMG|DSC|DSCF|PXL)[_-]?\d+\b|\b\d{1,9}\s*(?:-|–|a|al|to)\s*\d{1,9}\b|\b\d{1,9}\b/giu;
  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const range = /^(\d+)\s*(?:-|–|a|al|to)\s*(\d+)$/i.exec(token);
    if (range) {
      const start = Number(range[1]), end = Number(range[2]);
      if (end < start || end - start >= 400) throw new Error(`Rango inválido o demasiado grande: ${token}`);
      for (let number = start; number <= end; number++) identifiers.push(String(number));
    } else identifiers.push(token);
    if (identifiers.length > 800) throw new Error('La selección admite hasta 400 fotos distintas.');
  }
  const extension = options.extension.startsWith('.') ? options.extension : `.${options.extension}`;
  const seen = new Set<string>();
  const photos: PhotoItem[] = [];
  for (const identifier of identifiers) {
    const numeric = /^\d+$/.test(identifier);
    const number = numeric ? String(Number(identifier)).padStart(options.padding, '0') : (identifier.match(/\d+/)?.[0] ?? identifier);
    const filename = /\.(?:jpe?g|png|webp|avif)$/i.test(identifier) ? identifier : numeric ? `${options.prefix}${number}${extension}` : `${identifier}${extension}`;
    const key = filename.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    photos.push({ id: key, number, filename, fullLocalPath: localPath(options.localBasePath, filename),
      previewUrl: '', selectionByNumber: numeric, orientation: 'square', duration: options.defaultDuration, transition: 'dissolve', kenBurns: 'zoom-in' });
  }
  if (photos.length > 400) throw new Error('La selección admite hasta 400 fotos.');
  return photos;
}

export function resolveSelection(requested: PhotoItem[], library: PhotoItem[]) {
  const resolved: PhotoItem[] = [], missing: string[] = [], ambiguous: string[] = [];
  const used = new Set<string>();
  for (const request of requested) {
    const exact = library.filter(photo => photo.filename.toLowerCase() === request.filename.toLowerCase());
    const matches = exact.length ? exact : library.filter(photo =>
      request.selectionByNumber && /^\d+$/.test(request.number) && Number(photo.number) === Number(request.number));
    if (matches.length > 1) { ambiguous.push(request.filename); continue; }
    if (!matches.length || !matches[0].previewUrl) { missing.push(request.filename); continue; }
    if (!used.has(matches[0].id)) { resolved.push(matches[0]); used.add(matches[0].id); }
  }
  return { resolved, missing, ambiguous };
}

export function buildSlidesFromPhotos(photos: PhotoItem[], mode: HorizontalGroupMode, defaultDuration: number): SequenceSlide[] {
  const slides: SequenceSlide[] = [];
  for (let index = 0; index < photos.length;) {
    let count = 1;
    if (mode !== 'single' && photos[index].orientation === 'horizontal') {
      const maximum = mode === 'auto-split-2' ? 2 : 3;
      while (count < maximum && photos[index + count]?.orientation === 'horizontal') count++;
    }
    const group = photos.slice(index, index + count);
    slides.push({ id: `scene-${group.map(photo => photo.id).join('|')}`, photos: group,
      layout: count === 3 ? 'split-3' : count === 2 ? 'split-2' : 'single',
      duration: group[0].duration || defaultDuration, transition: group[0].transition });
    index += count;
  }
  return slides;
}

export function parseGoogleDriveLink(link: string): { isValid: boolean; type: 'folder' | 'file' | 'unknown'; id?: string } {
  try {
    const url = new URL(link);
    if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com') return { isValid: false, type: 'unknown' };
    const folder = url.pathname.match(/\/folders\/([\w-]+)/);
    const file = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? url.searchParams.get('id');
    if (folder) return { isValid: true, type: 'folder', id: folder[1] };
    if (file && /^[\w-]+$/.test(file)) return { isValid: true, type: 'file', id: file };
  } catch { /* An incomplete link is expected while typing. */ }
  return { isValid: false, type: 'unknown' };
}

