export {};
declare const sampleRate: number;
declare class AudioWorkletProcessor { readonly port: MessagePort }
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void;

class RecordingClock extends AudioWorkletProcessor {
  private accumulated = 0;
  private interval = sampleRate / 30;
  private active = true;
  constructor() {
    super();
    this.port.onmessage = event => {
      if (event.data === 'stop') { this.active = false; return; }
      this.interval = sampleRate / Math.max(1, Math.min(60, event.data));
    };
  }
  process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
    this.accumulated += outputs[0]?.[0]?.length || 128;
    if (this.accumulated >= this.interval) {
      this.accumulated %= this.interval; this.port.postMessage(0);
    }
    return this.active;
  }
}
registerProcessor('autoreel-recording-clock', RecordingClock);
