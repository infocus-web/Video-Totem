import recordingClockUrl from './recordingClock.worklet.ts?worker&url';

class BackgroundAudioEngine {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private timer: number | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private style = 'chill';
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
    const decoded = await this.init().decodeAudioData(await file.arrayBuffer());
    this.stop(); this.buffer = decoded;
  }
  public clearTrack() { this.stop(); this.buffer = null; }
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
      this.source = ctx.createBufferSource(); this.source.buffer = this.buffer; this.source.loop = true;
      this.source.connect(this.gain!); this.source.start(0, offset % this.buffer.duration); return;
    }
    const bpm = this.style === 'upbeat' ? 124 : this.style === 'cinematic' ? 95 : 112;
    const stepDuration = 60 / bpm / 2;
    this.step = Math.floor(offset / stepDuration);
    this.nextTime = ctx.currentTime + (stepDuration - offset % stepDuration);
    const schedule = () => {
      while (this.nextTime < ctx.currentTime + 0.12) {
        this.trigger(this.step % 16, this.nextTime);
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
  private tone(time: number, frequency: number, duration: number, volume: number, type: OscillatorType = 'sine', endFrequency?: number) {
    const osc = this.ctx!.createOscillator(), gain = this.ctx!.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, time);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    gain.gain.setValueAtTime(volume, time); gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain); gain.connect(this.gain!); this.nodes.add(osc);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.nodes.delete(osc); };
    osc.start(time); osc.stop(time + duration);
  }
  private trigger(step: number, time: number) {
    if (step === 0 || step === 8 || (this.style === 'upbeat' && step % 4 === 0)) this.tone(time, 140, 0.18, 0.3, 'sine', 38);
    if (step === 4 || step === 12) this.tone(time, 200, 0.1, 0.12, 'triangle', 80);
    if (step % 2 === 0) this.tone(time, 8000, 0.025, 0.015, 'square');
    if (step % 4 === 0) {
      const chords = [[220,261.63,329.63],[174.61,220,261.63],[261.63,329.63,392],[196,246.94,293.66]];
      chords[Math.floor(step / 4)].forEach((frequency, index) => this.tone(time + index * 0.02, frequency, 0.6, 0.05));
    }
  }
}
export const audioEngine = new BackgroundAudioEngine();

