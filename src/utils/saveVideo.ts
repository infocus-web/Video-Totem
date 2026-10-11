import { downloadBlob } from './download';

interface SaveOptions { id: string; suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }
type SaveWindow = Window & { showSaveFilePicker?: (options: SaveOptions) => Promise<FileSystemFileHandle> };

export const canChooseVideoLocation = () => window.isSecureContext && typeof (window as SaveWindow).showSaveFilePicker === 'function';

export async function saveVideoAs(blob: Blob, filename: string): Promise<'saved' | 'downloaded' | 'cancelled'> {
  const picker = (window as SaveWindow).showSaveFilePicker;
  if (!canChooseVideoLocation() || !picker) { downloadBlob(blob, filename); return 'downloaded'; }
  try {
    const extension = filename.endsWith('.webm') ? '.webm' : '.mp4';
    const handle = await picker.call(window, { id: 'autoreel-video', suggestedName: filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_'),
      types: [{ description: extension === '.webm' ? 'Video WebM' : 'Video MP4', accept: { [extension === '.webm' ? 'video/webm' : 'video/mp4']: [extension] } }] });
    const writable = await handle.createWritable();
    try { await writable.write(blob); await writable.close(); }
    catch (error) { await writable.abort().catch(() => {}); throw error; }
    return 'saved';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    throw error;
  }
}
