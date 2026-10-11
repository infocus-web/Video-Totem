type GeneratedTrack = MediaStreamTrack & { writable: WritableStream<VideoFrame> };
type RecordingWindow = Window & { MediaStreamTrackGenerator?: new (options: { kind: 'video' }) => GeneratedTrack };

export function supportsBackgroundRecording(extension = 'mp4') {
  return extension === 'mp4' && typeof VideoFrame !== 'undefined' && typeof (window as RecordingWindow).MediaStreamTrackGenerator === 'function'
    && typeof AudioWorkletNode !== 'undefined' && typeof AudioContext !== 'undefined' && 'audioWorklet' in AudioContext.prototype;
}

export function createRecordingSource(canvas: HTMLCanvasElement, extension = 'mp4') {
  const Generator = (window as RecordingWindow).MediaStreamTrackGenerator;
  if (supportsBackgroundRecording(extension) && Generator) {
    const track = new Generator({ kind: 'video' }), writer = track.writable.getWriter();
    let pending: Promise<void> | null = null;
    const capture = () => {
      if (pending) return pending;
      const frame = new VideoFrame(canvas, { timestamp: Math.round(performance.now() * 1000) });
      pending = writer.write(frame).finally(() => { frame.close(); pending = null; });
      return pending;
    };
    return { stream: new MediaStream([track]), background: true,
      capture,
      async finish() { await pending; await capture(); },
      close() { void writer.abort().catch(() => {}); track.stop(); }
    };
  }
  const stream = canvas.captureStream(0), track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  return { stream, background: false, async capture() { track.requestFrame?.(); }, async finish() { track.requestFrame?.(); }, close() { track.stop(); } };
}
