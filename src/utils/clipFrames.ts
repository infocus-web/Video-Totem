import { BlobSource, CanvasSink, Input, MP4, QTFF, WEBM } from 'mediabunny';
import type { SequenceConfig, SequenceSlide } from '../types';
import { sceneAtTime, type ImageMap } from './canvasRenderer';
import { clipTime } from './clipMedia';

export class ClipFrames {
  private clips = new Map<string, { input: Input; sink: CanvasSink; canvas: HTMLCanvasElement }>();
  constructor(private slides: SequenceSlide[], private config: SequenceConfig, private signal: AbortSignal) {}
  async prepare(images: ImageMap, time: number) {
    this.signal.throwIfAborted();
    const scene = sceneAtTime(this.slides, time, this.config), current = this.slides[scene.index];
    const next = !this.config.entrance?.enabled && current?.transition !== 'none' ? this.slides[scene.index + 1] : undefined;
    const needed = scene.finalPhoto ? [] : [current, next].flatMap(slide => slide?.photos || []).filter(photo => photo.mediaType === 'video');
    for (const [id, value] of this.clips) if (!needed.some(photo => photo.id === id)) { value.input.dispose(); this.clips.delete(id); }
    for (const photo of needed) {
      let clip = this.clips.get(photo.id);
      if (!clip) {
        if (!photo.sourceUrl) throw new Error('Volvé a conectar el clip ' + photo.filename);
        const blob = await fetch(photo.sourceUrl, { signal: this.signal }).then(response => response.blob());
        const input = new Input({ source: new BlobSource(blob), formats: [MP4, QTFF, WEBM] });
        try {
          const track = await input.getPrimaryVideoTrack();
          if (!track || !await track.canDecode()) throw new Error('No se puede decodificar ' + photo.filename + '. Convertí el clip a MP4 H.264.');
          clip = { input, sink: new CanvasSink(track, { poolSize: 2 }), canvas: document.createElement('canvas') }; this.clips.set(photo.id, clip);
        } catch (error) { input.dispose(); throw error; }
      }
      const elapsed = current?.photos.some(item => item.id === photo.id) ? scene.elapsed : 0;
      const frame = await clip.sink.getCanvas(clipTime(photo, elapsed));
      this.signal.throwIfAborted();
      if (!frame) throw new Error('No se pudo obtener un cuadro de ' + photo.filename);
      clip.canvas.width = frame.canvas.width; clip.canvas.height = frame.canvas.height;
      clip.canvas.getContext('2d')!.drawImage(frame.canvas, 0, 0); images.set(photo.id, clip.canvas);
    }
  }
  clear() { this.clips.forEach(clip => clip.input.dispose()); this.clips.clear(); }
}
