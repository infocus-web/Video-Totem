import { detectBeats } from './beatDetection';
self.onmessage = (event: MessageEvent<{ samples: Float32Array; sampleRate: number; start: number }>) => {
  const { samples, sampleRate, start } = event.data;
  self.postMessage(detectBeats(samples, sampleRate, 0, samples.length / sampleRate).map(time => Math.round((time + start) * 1000) / 1000));
};
