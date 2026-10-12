import { AudioBufferSource, BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality, canEncodeAudio, canEncodeVideo } from 'mediabunny';
import type { SequenceConfig, SequenceSlide } from '../types';
import { audioEngine } from './audioSynthesizer';
import { drawVideoFrame, sceneAtTime, type ImageMap } from './canvasRenderer';
import { ClipFrames } from './clipFrames';
import { RecordingImages } from './recordingImages';
import { sequenceDuration, validateEntrance } from './entrance';
import { videoOutput } from './videoOutput';
import { prepareTextFonts } from './textOverlay';

export async function encodeVideo(slides: SequenceSlide[], config: SequenceConfig, images: ImageMap, signal: AbortSignal, bitrate: number, progress: (value: number) => void, phase: (message: string) => void) {
  const checkAbort = () => { if (signal.aborted) throw new DOMException('Exportación cancelada', 'AbortError'); };
  checkAbort(); validateEntrance(config, audioEngine.getTrack()?.duration ?? null);
  const duration = sequenceDuration(slides, config);
  if (!Number.isFinite(duration) || duration <= 0 || (!config.entrance?.enabled && duration > 300)) throw new Error('La exportación admite montajes de hasta 5 minutos; Entrada usa la canción completa.');
  // Prioritize photo detail. The bitrate is also the fallback for encoders without quantizer control.
  const dimensions = videoOutput(config), quality = new Quality({ quantizer: 18, bitrate: Math.min(60000000, Math.round(bitrate * 1.6)), bitrateMode: 'variable' });
  phase('Comprobando codificador MP4');
  const [videoSupported, audioSupported] = await Promise.all([
    canEncodeVideo('avc', { width: dimensions.width, height: dimensions.height, frameRate: config.fps, quality, latencyMode: 'quality' }),
    canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: 48000, quality: new Quality(192000) }),
  ]);
  checkAbort();
  if (!videoSupported || !audioSupported) return null;
  const canvas = document.createElement('canvas'); canvas.width = dimensions.width; canvas.height = dimensions.height;
  const composition = dimensions.rotation ? document.createElement('canvas') : canvas;
  composition.width = config.width; composition.height = config.height;
  const clips = new ClipFrames(slides, config, signal);
  const originals = new RecordingImages(slides, images, signal), target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  let encodedFrames = 0;
  const video = new CanvasSource(canvas, { codec: 'avc', quality, latencyMode: 'quality', keyFrameInterval: 2, onEncodedPacket: () => { encodedFrames++; } });
  const audio = new AudioBufferSource({ codec: 'aac', quality: new Quality(192000) });
  output.addVideoTrack(video, { frameRate: config.fps }); output.addAudioTrack(audio);
  const renderAudio = audioEngine.createAudioRenderer(config.musicTrack, config.musicVolume, 0, !config.entrance?.enabled);
  const frameCount = Math.ceil(duration * config.fps - 1e-8);
  const abort = () => { void output.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  // Yield through a task, rather than a background-throttled timer, so Cancel stays responsive.
  const channel = new MessageChannel();
  const yieldTask = () => new Promise<void>(resolve => { channel.port1.onmessage = () => resolve(); channel.port2.postMessage(null); });
  try {
    await prepareTextFonts(config); checkAbort(); await output.start();
    let audioUntil = 0;
    for (let index = 0; index < frameCount; index++) {
      checkAbort();
      const time = index / config.fps, scene = sceneAtTime(slides, time, config).index;
      if (!originals.isReady(scene)) { phase('Preparando escena ' + (scene + 1) + ' de ' + slides.length); await originals.prepare(scene); checkAbort(); }
      if (time >= audioUntil) {
        const chunkDuration = Math.min(5, duration - audioUntil);
        const chunk = await renderAudio(audioUntil, chunkDuration); checkAbort(); await audio.add(chunk); audioUntil += chunkDuration;
      }
      phase('Codificando video');
      await clips.prepare(originals.images, time); checkAbort();
      drawVideoFrame(canvas, composition, slides, config, originals.images, time);
      // The movie clock is the frame index. Loading or encoding can take longer without skipping a frame.
      await video.add(time, Math.min(1 / config.fps, duration - time));
      progress(Math.min(99, Math.floor((index + 1) / frameCount * 100)));
      if (index % 8 === 0) await yieldTask();
    }
    checkAbort(); phase('Finalizando MP4'); await output.finalize(); checkAbort();
    if (encodedFrames !== frameCount || !target.buffer?.byteLength) throw new Error('No se pudo completar el video. Volvé a exportar.');
    return { blob: new Blob([target.buffer], { type: 'video/mp4' }), extension: 'mp4' };
  } catch (error) { checkAbort(); throw error; }
  finally {
    signal.removeEventListener('abort', abort); channel.port1.close(); channel.port2.close(); clips.clear(); originals.clear();
    if (output.state !== 'finalized' && output.state !== 'canceled') await output.cancel().catch(() => {});
    canvas.width = canvas.height = composition.width = composition.height = 0;
  }
}
