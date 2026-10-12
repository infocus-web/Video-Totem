import type { SequenceSlide, SequenceConfig } from '../types';
import { sceneAtTime, type ImageMap } from './canvasRenderer';
import { clipTime } from './clipMedia';

export class PreviewClips {
  private videos = new Map<string, HTMLVideoElement>();
  constructor(_slides: SequenceSlide[]) {}
  sync(images: ImageMap, slides: SequenceSlide[], config: SequenceConfig, time: number, playing: boolean, editing: boolean) {
    const scene = sceneAtTime(slides, time, editing ? undefined : config), current = slides[scene.index];
    const next = !config.entrance?.enabled && !editing && current?.transition !== 'none' ? slides[scene.index + 1] : undefined;
    const active = new Set<string>();
    for (const slide of scene.finalPhoto ? [] : [current, next]) for (const photo of slide?.photos || []) {
      if (photo.mediaType !== 'video' || !photo.sourceUrl) continue;
      let video = this.videos.get(photo.id);
      if (!video) { video = document.createElement('video'); video.muted = true; video.playsInline = true; video.preload = 'auto'; video.src = photo.sourceUrl; this.videos.set(photo.id, video); }
      active.add(photo.id);
      const desired = clipTime(photo, slide === current ? scene.elapsed : 0);
      if (video.readyState >= 1 && !video.seeking && Math.abs(video.currentTime - desired) > (playing ? 0.12 : 0.008)) video.currentTime = desired;
      if (playing && slide === current && video.paused) void video.play().catch(() => {});
      if ((!playing || slide !== current) && !video.paused) video.pause();
      if (video.readyState >= 2) images.set(photo.id, video);
    }
    for (const [id, video] of this.videos) if (!active.has(id)) { video.pause(); video.removeAttribute('src'); video.load(); this.videos.delete(id); }
  }
  stop() { this.videos.forEach(video => video.pause()); }
  clear() { this.videos.forEach(video => { video.pause(); video.removeAttribute('src'); video.load(); }); this.videos.clear(); }
}
