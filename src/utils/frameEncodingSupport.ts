// Frame-by-frame MP4 export runs in a worker with OffscreenCanvas and WebCodecs.
export function supportsFrameEncoding() {
  return typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined';
}
