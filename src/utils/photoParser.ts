import type { PhotoItem, SequenceSlide, HorizontalGroupMode, SequenceConfig } from '../types';
import { localPath } from './config.ts';

export interface ParseOptions {
  localBasePath: string; prefix: string; padding: number; extension: string; defaultDuration: number;
}

export function parseClientSelectionText(text: string, options: ParseOptions): PhotoItem[] {
  if (text.length > 20000) throw new Error('La selección es demasiado larga. Usá hasta 20.000 caracteres.');
  const identifiers: string[] = [];
  // Match filenames and camera codes before numbers, so their digits are never extracted twice.
  const pattern = /[\p{L}\p{N}_().-]+\.(?:jpe?g|png|webp|avif)|\b(?:IMG|DSC|DSCF|PXL)[_-]?\d+\b|\b\d{1,9}\s*(?:-|–|a|al|to)\s*\d{1,9}\b|\b\d{1,9}[a-z]?\b/giu;
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
    const numeric = /^\d+[a-z]?$/i.test(identifier);
    const number = numeric ? String(Number(identifier.match(/^\d+/)![0])).padStart(options.padding, '0') + (identifier.match(/[a-z]$/i)?.[0].toLowerCase() || '') : (identifier.match(/\d+/)?.[0] ?? identifier);
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

const numberKey = (value: string) => {
  const match = /^(\d+)([a-z]?)$/i.exec(value);
  return match ? String(Number(match[1])) + match[2].toLowerCase() : '';
};

export function matchPhotoSelection<T extends Pick<PhotoItem, 'id' | 'filename' | 'number'>>(requested: PhotoItem[], library: T[], available: (photo: T) => boolean = () => true) {
  const resolved: T[] = [], missing: string[] = [], ambiguous: string[] = [];
  const byName = new Map<string, T[]>(), byNumber = new Map<string, T[]>();
  for (const photo of library) {
    const name = photo.filename.toLowerCase(), number = numberKey(photo.number);
    const names = byName.get(name);
    if (names) names.push(photo); else byName.set(name, [photo]);
    if (number) {
      const numbers = byNumber.get(number);
      if (numbers) numbers.push(photo); else byNumber.set(number, [photo]);
    }
  }
  const used = new Set<string>();
  for (const request of requested) {
    const exact = byName.get(request.filename.toLowerCase()) || [];
    const matches = exact.length ? exact : request.selectionByNumber ? byNumber.get(numberKey(request.number)) || [] : [];
    if (matches.length > 1) { ambiguous.push(request.filename); continue; }
    if (!matches.length || !available(matches[0])) { missing.push(request.filename); continue; }
    if (!used.has(matches[0].id)) { resolved.push(matches[0]); used.add(matches[0].id); }
  }
  return { resolved, missing, ambiguous };
}

export function resolveSelection(requested: PhotoItem[], library: PhotoItem[]) {
  return matchPhotoSelection(requested, library, photo => !!photo.previewUrl);
}

export function buildSlidesFromPhotos(photos: PhotoItem[], mode: HorizontalGroupMode, defaultDuration: number, frame?: Pick<SequenceConfig, 'width' | 'height'>): SequenceSlide[] {
  const slides: SequenceSlide[] = [];
  const groupedOrientation = frame && frame.width > frame.height ? 'vertical' : 'horizontal';
  for (let index = 0; index < photos.length;) {
    let count = 1;
    if (mode !== 'single' && photos[index].orientation === groupedOrientation) {
      const maximum = mode === 'auto-split-2' ? 2 : 3;
      while (count < maximum && photos[index + count]?.orientation === groupedOrientation) count++;
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

