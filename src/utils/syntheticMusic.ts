export function musicStepDuration(style: string) {
  return 60 / (style === 'upbeat' ? 124 : style === 'cinematic' ? 95 : 112) / 2;
}

// Preview and export share the same notes, envelopes and timing.
export function scheduleMusicStep(ctx: BaseAudioContext, destination: AudioNode, style: string, step: number, time: number, nodes?: Set<AudioScheduledSourceNode>) {
  const tone = (frequency: number, duration: number, volume: number, type: OscillatorType = 'sine', endFrequency?: number, delay = 0) => {
    const start = time + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(volume, start); gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain); gain.connect(destination); nodes?.add(osc);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); nodes?.delete(osc); };
    osc.start(start); osc.stop(start + duration);
  };
  if (step === 0 || step === 8 || (style === 'upbeat' && step % 4 === 0)) tone(140, 0.18, 0.3, 'sine', 38);
  if (step === 4 || step === 12) tone(200, 0.1, 0.12, 'triangle', 80);
  if (step % 2 === 0) tone(8000, 0.025, 0.015, 'square');
  if (step % 4 === 0) {
    const chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
    chords[Math.floor(step / 4)].forEach((frequency, index) => tone(frequency, 0.6, 0.05, 'sine', undefined, index * 0.02));
  }
}
