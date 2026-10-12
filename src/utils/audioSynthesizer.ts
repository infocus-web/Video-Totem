import { musicStepDuration, scheduleMusicStep } from './syntheticMusic';
import recordingClockUrl from './recordingClock.worklet.ts?worker&url';
import { musicTime } from './musicTrim';

class BackgroundAudioEngine {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private timer: number | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private style = 'chill';
  private trackOffset = 0;
  private trackEnd: number | null = null;
  private auditionSource: AudioBufferSourceNode | null = null;
  private auditionGain: GainNode | null = null;
  private auditionEnded: ((finished: boolean) => void) | null = null;
  private loopTrack = true;
  public getTrack() { return this.buffer; }
  public setTrackRange(offset = 0, loop = true, end: number | null = null) { this.trackOffset = Math.max(0, offset); this.loopTrack = loop; this.trackEnd = end; }
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
  public createAudioRenderer(style: string, volume: number, offset = 0, loop = true, end: number | null = null) {
    const track = this.buffer, sampleRate = 48000;
    return async (start: number, duration: number) => {
      // A short lead-in preserves note tails at chunk boundaries without keeping a five-minute buffer.
      const lead = Math.min(start, 1), base = start - lead;
      const length = Math.round(duration * sampleRate), skip = Math.round(lead * sampleRate);
      const ctx = new OfflineAudioContext(2, length + skip, sampleRate), gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, volume)); gain.connect(ctx.destination);
      if (style !== 'none' && track) {
        const source = ctx.createBufferSource(); source.buffer = track; source.loop = loop;
        const trackEnd = Math.min(end ?? track.duration, track.duration);
        source.loopStart = offset; source.loopEnd = trackEnd;
        source.connect(gain);
        const position = musicTime(base, offset, trackEnd, loop);
        if (loop || position < trackEnd) source.start(0, position, loop ? undefined : trackEnd - position);
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
    const value = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
    this.init(); this.gain!.gain.setValueAtTime(value, this.ctx!.currentTime);
    this.auditionGain?.gain.setValueAtTime(value, this.ctx!.currentTime);
  }
  public getCaptureStream() { this.init(); return this.destination!.stream; }
  public stopAudition() {
    const source = this.auditionSource;
    this.auditionSource = null;
    if (source) { source.stop(); source.disconnect(); }
    this.auditionGain?.disconnect(); this.auditionGain = null;
    const ended = this.auditionEnded; this.auditionEnded = null; ended?.(false);
  }
  public auditionTrack(start: number, end: number, onEnded: (finished: boolean) => void) {
    this.stopAudition();
    const ctx = this.init(), track = this.buffer;
    if (!track) throw new Error('Cargá o reconectá la canción.');
    const position = Math.max(0, Math.min(start, track.duration)), finish = Math.min(end, track.duration);
    if (finish <= position) { onEnded(true); return () => position; }
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = track; gain.gain.value = this.gain!.gain.value;
    source.connect(gain); gain.connect(ctx.destination);
    this.auditionSource = source; this.auditionGain = gain; this.auditionEnded = onEnded;
    source.onended = () => { if (this.auditionSource !== source) return; source.disconnect(); gain.disconnect(); this.auditionSource = null; this.auditionGain = null; this.auditionEnded = null; onEnded(true); };
    const began = ctx.currentTime; source.start(0, position, finish - position);
    return () => Math.min(finish, position + ctx.currentTime - began);
  }
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
      const end = Math.min(this.trackEnd ?? this.buffer.duration, this.buffer.duration);
      this.source.loopStart = this.trackOffset; this.source.loopEnd = end;
      this.source.connect(this.gain!);
      const trackTime = musicTime(offset, this.trackOffset, end, this.loopTrack);
      if (this.loopTrack || trackTime < end) this.source.start(0, trackTime, this.loopTrack ? undefined : end - trackTime);
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
    this.stopAudition();
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.schedule = null;
    if (this.source) { this.source.stop(); this.source.disconnect(); this.source = null; }
    this.nodes.forEach(node => { try { node.stop(); node.disconnect(); } catch { /* Already ended. */ } });
    this.nodes.clear();
  }
}
export const audioEngine = new BackgroundAudioEngine();
