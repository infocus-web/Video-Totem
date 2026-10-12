export function detectBeats(samples: Float32Array, sampleRate: number, start: number, end: number) {
  const hop = Math.max(1, Math.round(sampleRate * 0.01)), begin = Math.floor(start * sampleRate), finish = Math.min(samples.length, Math.ceil(end * sampleRate));
  const energy: number[] = [];
  let filtered = 0;
  // A low-pass emphasizes kick drums, while positive energy changes locate attacks rather than loud sustained notes.
  const alpha = 1 - Math.exp(-2 * Math.PI * 180 / sampleRate);
  for (let offset = begin; offset < finish; offset += hop) {
    let sum = 0;
    for (let i = offset; i < Math.min(finish, offset + hop); i++) { filtered += alpha * (samples[i] - filtered); sum += filtered * filtered; }
    energy.push(Math.sqrt(sum / hop));
  }
  const onset = energy.map((value, i) => Math.max(0, value - (energy[i - 1] || 0)));
  const maximum = Math.max(0, ...onset);
  if (maximum < 0.0001) return [];
  const peaks: { time: number; strength: number }[] = [];
  for (let i = 0; i < onset.length; i++) {
    const local = onset.slice(Math.max(0, i - 30), Math.min(onset.length, i + 31));
    const mean = local.reduce((sum, value) => sum + value, 0) / local.length;
    if (onset[i] < maximum * 0.06 || onset[i] < mean * 2.5 || onset[i] < (onset[i-1] || 0) || onset[i] <= (onset[i+1] || 0)) continue;
    const time = (begin + i * hop) / sampleRate;
    const previous = peaks.at(-1);
    if (previous && time - previous.time < 0.18) { if (onset[i] > previous.strength) peaks[peaks.length - 1] = { time, strength: onset[i] }; }
    else peaks.push({ time, strength: onset[i] });
  }
  return peaks.map(peak => Math.round(peak.time * 1000) / 1000);
}
