export function supportsFrameEncoding() {
  return typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';
}
