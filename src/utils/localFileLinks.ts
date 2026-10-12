import type { PhotoItem } from '../types';

type ReadHandle = FileSystemFileHandle & {
  queryPermission(options: { mode: 'read' }): Promise<PermissionState>;
  requestPermission(options: { mode: 'read' }): Promise<PermissionState>;
};
type DirectoryHandle = FileSystemDirectoryHandle & { values(): AsyncIterable<FileSystemFileHandle | DirectoryHandle> };
type PickerWindow = Window & {
  showOpenFilePicker?: (options: { multiple: boolean; id: string; types?: { description: string; accept: Record<string, string[]> }[] }) => Promise<ReadHandle[]>;
  showDirectoryPicker?: (options: { mode: 'read'; id: string }) => Promise<DirectoryHandle>;
};
export interface PhotoLink { id: string; path: string; handle: ReadHandle }
export interface LocalFileLinks { photos: PhotoLink[]; music?: { handle: ReadHandle; fingerprint: string } }
export const supportsLocalLinks = () => !!(window as PickerWindow).showOpenFilePicker && !!(window as PickerWindow).showDirectoryPicker;

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('autoreel-local-links', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects');
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Cerrá otras pestañas de AutoReel para recordar los archivos.'));
  });
}
export async function readLocalLinks(id: string): Promise<LocalFileLinks | null> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly'), request = tx.objectStore('projects').get(id);
      request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function rememberLocalLinks(id: string, photos: PhotoLink[], music?: LocalFileLinks['music'] | null, forgetPhotos: string[] = []) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite'), store = tx.objectStore('projects'), request = store.get(id);
      request.onsuccess = () => {
        const saved = request.result as LocalFileLinks | undefined;
        const merged = new Map((saved?.photos ?? []).map(photo => [photo.id, photo]));
        forgetPhotos.forEach(id => merged.delete(id));
        photos.forEach(photo => merged.set(photo.id, photo));
        store.put({ photos: [...merged.values()], ...(music === null ? {} : music ? { music } : saved?.music ? { music: saved.music } : {}) }, id);
      };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
function withPath(file: File, path: string) {
  Object.defineProperty(file, 'webkitRelativePath', { value: 'Originales/' + path });
  return file;
}
export async function chooseLocalPhotos(folder: boolean, onSelected?: () => void) {
  const picker = window as PickerWindow;
  const items: { file: File; handle: ReadHandle }[] = [];
  if (folder) {
    const root = await picker.showDirectoryPicker!({ mode: 'read', id: 'autoreel-photos' });
    onSelected?.();
    let scanned = 0;
    const visit = async (directory: DirectoryHandle, prefix = '', depth = 0) => {
      if (depth > 32) throw new Error('Elegí una carpeta de fotos más específica.');
      for await (const handle of directory.values()) {
        if (++scanned > 50000) throw new Error('Elegí una carpeta más pequeña para la sesión.');
        const path = prefix + handle.name;
        if (handle.kind === 'directory') await visit(handle as DirectoryHandle, path + '/', depth + 1);
        else if (/\.(jpe?g|png|webp|avif|mp4|webm|mov)$/i.test(handle.name)) items.push({ file: withPath(await handle.getFile(), path), handle: handle as ReadHandle });
      }
    };
    await visit(root);
  } else {
    const handles = await picker.showOpenFilePicker!({ multiple: true, id: 'autoreel-photos', types: [{ description: 'Fotos y clips', accept: { 'image/jpeg': ['.jpg','.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'image/avif': ['.avif'], 'video/mp4': ['.mp4'], 'video/webm': ['.webm'], 'video/quicktime': ['.mov'] } }] });
    onSelected?.();
    for (const handle of handles) items.push({ file: await handle.getFile(), handle });
  }
  return items;
}
export async function chooseLocalMusic() {
  const [handle] = await (window as PickerWindow).showOpenFilePicker!({ multiple: false, id: 'autoreel-music', types: [{ description: 'Música', accept: { 'audio/*': ['.mp3','.wav','.m4a','.aac','.ogg','.flac','.opus','.webm'] } }] });
  return { file: await handle.getFile(), handle };
}
export async function reconnectLocalLinks(links: LocalFileLinks, photos: PhotoItem[], fingerprint?: string) {
  const wanted = new Map(photos.filter(photo => !photo.previewUrl).map(photo => [photo.id, photo]));
  const files: File[] = [], unavailable: string[] = [];
  let permissionNeeded = false;
  for (const link of links.photos) {
    const photo = wanted.get(link.id); if (!photo) continue;
    try {
      if (await link.handle.queryPermission({ mode: 'read' }) !== 'granted') { permissionNeeded = true; continue; }
      files.push(withPath(await link.handle.getFile(), photo.relativePath || link.path));
    } catch { unavailable.push(photo.filename); }
  }
  let music: File | undefined;
  if (links.music && links.music.fingerprint === fingerprint) {
    try {
      if (await links.music.handle.queryPermission({ mode: 'read' }) !== 'granted') permissionNeeded = true;
      else music = await links.music.handle.getFile();
    } catch { unavailable.push(links.music.handle.name); }
  }
  return { files, music, permissionNeeded, unavailable };
}
export function authorizeLocalLinks(links: LocalFileLinks) {
  const handles = [...new Set([...links.photos.map(photo => photo.handle), ...(links.music ? [links.music.handle] : [])])];
  // Se invoca desde el clic: Chrome necesita un gesto para volver a pedir acceso.
  return Promise.allSettled(handles.map(handle => handle.requestPermission({ mode: 'read' })));
}
