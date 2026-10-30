/// <reference lib="webworker" />
// Renders and encodes the MP4 off the page. Chrome throttles a hidden tab's main thread (image decoding,
// canvas work), which froze exports when the user switched tabs; a dedicated worker keeps running.
import { AudioSample, AudioSampleSource, BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality, canEncodeAudio, canEncodeVideo } from 'mediabunny';
import type { SequenceConfig, SequenceSlide } from '../types';
import { clearRendererCache, context2d, drawVideoFrame, sceneAtTime, transitionBuffer, type ImageMap } from './canvasRenderer';
import { ClipFrames } from './clipFrames';
import { sequenceDuration } from './entrance';
import { videoOutput } from './videoOutput';
import { TEXT_LAYERS, textFont, textStyle } from './textOverlay';

export type EncoderRequest =
  | { type: 'start'; slides: SequenceSlide[]; config: SequenceConfig; bitrate: number; fontUrl: string }
  | { type: 'audio'; id: number; channels: Float32Array[] }
  | { type: 'abort' };
export type EncoderMessage =
  | { type: 'phase'; message: string }
  | { type: 'progress'; value: number }
  | { type: 'audio'; id: number; start: number; duration: number }
  | { type: 'unsupported' }
  | { type: 'done'; buffer: ArrayBuffer }
  | { type: 'aborted' }
  | { type: 'error'; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope & { fonts: FontFaceSet };
const post = (message: EncoderMessage, transfer: Transferable[] = []) => scope.postMessage(message, transfer);
const SAMPLE_RATE = 48000;
const controller = new AbortController();
const pendingAudio = new Map<number, { resolve: (channels: Float32Array[]) => void; reject: (error: unknown) => void }>();
let audioId = 0;

function checkAbort() { if (controller.signal.aborted) throw new DOMException('Exportación cancelada', 'AbortError'); }

// The song lives in the page's AudioContext, so the page renders each audio chunk on request.
function requestAudio(start: number, duration: number) {
  return new Promise<Float32Array[]>((resolve, reject) => {
    const id = ++audioId; pendingAudio.set(id, { resolve, reject });
    post({ type: 'audio', id, start, duration });
  });
}

async function prepareFonts(config: SequenceConfig, fontUrl: string) {
  if (!config.showOverlayText || !scope.fonts) return;
  const layers = TEXT_LAYERS.filter(({ key }) => config[key]);
  if (layers.some(({ key }) => textStyle(config, key).fontFamily === 'Plus Jakarta Sans')) {
    const face = new FontFace('Plus Jakarta Sans', 'url(' + JSON.stringify(fontUrl) + ')', { weight: '400 800' });
    try { scope.fonts.add(await face.load()); } catch { /* Falls back to the system sans-serif, as the page does. */ }
  }
  await Promise.all(layers.map(({ key }) => scope.fonts.load(textFont(textStyle(config, key), key, config.width), config[key]).catch(() => [])));
}

// Only the current scene and its transition target keep decoded originals in memory.
class WorkerImages {
  readonly images: ImageMap = new Map();
  private prepared = -1;
  constructor(private slides: SequenceSlide[]) {}
  isReady(scene: number) { return this.prepared === scene; }
  async prepare(scene: number) {
    checkAbort();
    const photos = [...new Map(this.slides.slice(scene, scene + 2).flatMap(slide => slide.photos).map(photo => [photo.id, photo])).values()];
    const needed = new Set(photos.map(photo => photo.id));
    for (const [id, image] of this.images) if (!needed.has(id)) { if (image instanceof ImageBitmap) image.close(); this.images.delete(id); }
    let index = 0;
    const workers = await Promise.allSettled(Array.from({ length: Math.min(2, photos.length) }, async () => {
      while (index < photos.length) {
        const photo = photos[index++];
        checkAbort();
        if (this.images.has(photo.id)) continue;
        // Clips get their frames from ClipFrames; the poster covers scenes where the clip is not decoded.
        const url = photo.mediaType === 'video' ? photo.previewUrl : photo.sourceUrl || photo.previewUrl;
        if (!url) { if (photo.mediaType === 'video') continue; throw new Error('Volvé a conectar la foto ' + photo.filename + '.'); }
        try {
          const blob = await fetch(url, { signal: controller.signal }).then(response => response.blob());
          const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
          if (controller.signal.aborted) { bitmap.close(); checkAbort(); }
          this.images.set(photo.id, bitmap);
        } catch (error) {
          checkAbort();
          if (photo.mediaType === 'video') continue;
          throw new Error('No se pudo preparar el original de ' + photo.filename + '. Volvé a conectar la foto.', { cause: error });
        }
      }
    }));
    const failure = workers.find(worker => worker.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    this.prepared = scene;
  }
  clear() {
    for (const image of this.images.values()) if (image instanceof ImageBitmap) image.close();
    this.images.clear(); this.prepared = -1;
  }
}

async function encode(slides: SequenceSlide[], config: SequenceConfig, bitrate: number, fontUrl: string) {
  const duration = sequenceDuration(slides, config);
  const dimensions = videoOutput(config), quality = new Quality({ quantizer: 18, bitrate: Math.min(60000000, Math.round(bitrate * 1.6)), bitrateMode: 'variable' });
  post({ type: 'phase', message: 'Comprobando codificador MP4' });
  const [videoSupported, audioSupported] = await Promise.all([
    canEncodeVideo('avc', { width: dimensions.width, height: dimensions.height, frameRate: config.fps, quality, latencyMode: 'quality' }),
    canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: SAMPLE_RATE, quality: new Quality(192000) }),
  ]);
  checkAbort();
  if (!videoSupported || !audioSupported) { post({ type: 'unsupported' }); return; }
  const canvas = new OffscreenCanvas(dimensions.width, dimensions.height);
  const composition = dimensions.rotation ? new OffscreenCanvas(config.width, config.height) : canvas;
  // A canvas gets its memory on the first stroke, and that step waits on the page, which a hidden tab delays.
  // Every canvas the frames use is touched now, while the page is still in front.
  for (const target of [canvas, composition, transitionBuffer(composition).buffer]) {
    const context = context2d(target);
    if (!context) throw new Error('Tu navegador no ofrece Canvas 2D.');
    context.fillRect(0, 0, 1, 1); context.clearRect(0, 0, 1, 1);
  }
  const clips = new ClipFrames(slides, config, controller.signal);
  const originals = new WorkerImages(slides), target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  let encodedFrames = 0;
  const video = new CanvasSource(canvas, { codec: 'avc', quality, latencyMode: 'quality', keyFrameInterval: 2, onEncodedPacket: () => { encodedFrames++; } });
  const audio = new AudioSampleSource({ codec: 'aac', quality: new Quality(192000) });
  output.addVideoTrack(video, { frameRate: config.fps }); output.addAudioTrack(audio);
  const frameCount = Math.ceil(duration * config.fps - 1e-8);
  const cancel = () => { void output.cancel().catch(() => {}); };
  controller.signal.addEventListener('abort', cancel, { once: true });
  // A task boundary lets abort and audio replies arrive between frames.
  const channel = new MessageChannel();
  const yieldTask = () => new Promise<void>(resolve => { channel.port1.onmessage = () => resolve(); channel.port2.postMessage(null); });
  try {
    await prepareFonts(config, fontUrl); checkAbort(); await output.start();
    let audioUntil = 0, lastProgress = -1, encodingPhase = false;
    for (let index = 0; index < frameCount; index++) {
      checkAbort();
      const time = index / config.fps, scene = sceneAtTime(slides, time, config).index;
      if (!originals.isReady(scene)) { post({ type: 'phase', message: 'Preparando escena ' + (scene + 1) + ' de ' + slides.length }); encodingPhase = false; await originals.prepare(scene); checkAbort(); }
      if (time >= audioUntil) {
        const chunkDuration = Math.min(5, duration - audioUntil);
        const channels = await requestAudio(audioUntil, chunkDuration); checkAbort();
        const length = channels[0].length, planar = new Float32Array(length * 2);
        planar.set(channels[0], 0); planar.set(channels[1] ?? channels[0], length);
        const sample = new AudioSample({ data: planar, format: 'f32-planar', numberOfChannels: 2, sampleRate: SAMPLE_RATE, timestamp: audioUntil });
        try { await audio.add(sample); } finally { sample.close(); }
        audioUntil += chunkDuration;
      }
      if (!encodingPhase) { encodingPhase = true; post({ type: 'phase', message: 'Codificando video' }); }
      await clips.prepare(originals.images, time); checkAbort();
      drawVideoFrame(canvas, composition, slides, config, originals.images, time);
      // The movie clock is the frame index. Loading or encoding can take longer without skipping a frame.
      await video.add(time, Math.min(1 / config.fps, duration - time));
      const value = Math.min(99, Math.floor((index + 1) / frameCount * 100));
      if (value !== lastProgress) { lastProgress = value; post({ type: 'progress', value }); }
      if (index % 8 === 0) await yieldTask();
    }
    checkAbort(); post({ type: 'phase', message: 'Finalizando MP4' }); await output.finalize(); checkAbort();
    if (encodedFrames !== frameCount || !target.buffer?.byteLength) throw new Error('No se pudo completar el video. Volvé a exportar.');
    post({ type: 'done', buffer: target.buffer }, [target.buffer]);
  } finally {
    controller.signal.removeEventListener('abort', cancel); channel.port1.close(); channel.port2.close(); clips.clear(); originals.clear(); clearRendererCache(composition);
    if (output.state !== 'finalized' && output.state !== 'canceled') await output.cancel().catch(() => {});
  }
}

scope.onmessage = (event: MessageEvent<EncoderRequest>) => {
  const message = event.data;
  if (message.type === 'abort') {
    controller.abort();
    for (const pending of pendingAudio.values()) pending.reject(new DOMException('Exportación cancelada', 'AbortError'));
    pendingAudio.clear();
  } else if (message.type === 'audio') {
    const pending = pendingAudio.get(message.id); pendingAudio.delete(message.id);
    pending?.resolve(message.channels);
  } else if (message.type === 'start') {
    encode(message.slides, message.config, message.bitrate, message.fontUrl).catch(error => {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) post({ type: 'aborted' });
      else post({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo generar el video.' });
    });
  }
};
