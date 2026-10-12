import { musicStepDuration, scheduleMusicStep } from './syntheticMusic';
import recordingClockUrl from './recordingClock.worklet.ts?worker&url';

class BackgroundAudioEngine {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private timer: number | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private style = 'chill';
  private trackOffset = 0;
  private loopTrack = true;
  public getTrack() { return this.buffer; }
  public setTrackRange(offset = 0, loop = true) { this.trackOffset = Math.max(0, offset); this.loopTrack = loop; }
  private nextTime = 0;
  private step = 0;
  private nodes = new Set<AudioScheduledSourceNode>();
  private schedule: (() => void) | null = null;
  private recordingWorkletReady: Promise<void> | null = null;
  public tick() { this.schedule?.(); }
  public init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.destination = this.ctx.createMediaStreamDestination();
      this.gain.connect(this.ctx.destination);
      this.gain.connect(this.destination);
    }
    return this.ctx;
  }
  public async resume() { await this.init().resume(); }
  public async loadTrack(file: File) {
    if (file.size > 50 * 1024 * 1024) throw new Error('La música admite archivos de hasta 50 MB.');
    const bytes = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    const fingerprint = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
    const decoded = await this.init().decodeAudioData(bytes);
    this.stop(); this.buffer = decoded;
    return fingerprint;
  }
  public clearTrack() { this.stop(); this.buffer = null; }
  public createAudioRenderer(style: string, volume: number, offset = 0, loop = true) {
    const track = this.buffer, sampleRate = 48000;
    return async (start: number, duration: number) => {
      // A short lead-in preserves note tails at chunk boundaries without keeping a five-minute buffer.
      const lead = Math.min(start, 1), base = start - lead;
      const length = Math.round(duration * sampleRate), skip = Math.round(lead * sampleRate);
      const ctx = new OfflineAudioContext(2, length + skip, sampleRate), gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, volume)); gain.connect(ctx.destination);
      if (style !== 'none' && track) {
        const source = ctx.createBufferSource(); source.buffer = track; source.loop = loop;
        source.connect(gain);
        if (loop || base + offset < track.duration) source.start(0, loop ? (base + offset) % track.duration : base + offset);
      } else if (style !== 'none') {
        const stepDuration = musicStepDuration(style);
        for (let step = Math.max(0, Math.ceil(base / stepDuration) - 1); (step + 1) * stepDuration < start + duration; step++) {
          const time = (step + 1) * stepDuration - base;
          if (time >= 0) scheduleMusicStep(ctx, gain, style, step % 16, time);
        }
      }
      const rendered = await ctx.startRendering();
      if (!skip) return rendered;
      const result = new AudioBuffer({ numberOfChannels: 2, length, sampleRate });
      for (let channel = 0; channel < 2; channel++) result.copyToChannel(rendered.getChannelData(channel).subarray(skip, skip + length), channel);
      return result;
    };
  }
  public setStyle(style: string) { this.style = style; }
  public setVolume(volume: number) {
    this.init(); this.gain!.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx!.currentTime);
  }
  public getCaptureStream() { this.init(); return this.destination!.stream; }
  public startCaptureClock() {
    // Keep audio capture producing samples between notes and when music is off.
    const silence = this.init().createConstantSource();
    silence.offset.value = 0; silence.connect(this.destination!); silence.start();
    return () => { silence.stop(); silence.disconnect(); };
  }
  public async startRecordingClock(fps: number, tick: () => void) {
    const ctx = this.init();
    if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') return null;
    this.recordingWorkletReady ??= ctx.audioWorklet.addModule(recordingClockUrl).catch(error => { this.recordingWorkletReady = null; throw error; });
    await this.recordingWorkletReady;
    const node = new AudioWorkletNode(ctx, 'autoreel-recording-clock', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
    node.port.onmessage = tick; node.port.postMessage(fps); node.connect(this.destination!);
    let closed = false;
    return () => { if (closed) return; closed = true; node.port.postMessage('stop'); node.port.onmessage = null; node.disconnect(); node.port.close(); };
  }
  public play(offset = 0, monitor = true) {
    this.stop();
    const ctx = this.init();
    if (this.style === 'none') return;
    try { this.gain!.disconnect(ctx.destination); } catch { /* Monitoring may already be disconnected after export. */ }
    if (monitor) this.gain!.connect(ctx.destination);
    if (this.buffer) {
      this.source = ctx.createBufferSource(); this.source.buffer = this.buffer; this.source.loop = this.loopTrack;
      this.source.connect(this.gain!);
      const trackTime = offset + this.trackOffset;
      if (this.loopTrack || trackTime < this.buffer.duration) this.source.start(0, this.loopTrack ? trackTime % this.buffer.duration : trackTime);
      return;
    }
    const stepDuration = musicStepDuration(this.style);
    this.step = Math.floor(offset / stepDuration);
    this.nextTime = ctx.currentTime + (stepDuration - offset % stepDuration);
    const schedule = () => {
      while (this.nextTime < ctx.currentTime + 0.12) {
        scheduleMusicStep(ctx, this.gain!, this.style, this.step % 16, this.nextTime, this.nodes);
        this.nextTime += stepDuration; this.step++;
      }
    };
    this.schedule = schedule;
    schedule(); if (monitor) this.timer = window.setInterval(schedule, 25);
  }
  public pause() { this.stop(); }
  public stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.schedule = null;
    if (this.source) { this.source.stop(); this.source.disconnect(); this.source = null; }
    this.nodes.forEach(node => { try { node.stop(); node.disconnect(); } catch { /* Already ended. */ } });
    this.nodes.clear();
  }
}
export const audioEngine = new BackgroundAudioEngine();
