/// <reference lib="webworker" />
export {};

let timer: ReturnType<typeof setInterval> | undefined;
self.addEventListener('message', (event: MessageEvent<number>) => {
  clearInterval(timer);
  const fps = Math.max(1, Math.min(60, event.data));
  timer = setInterval(() => self.postMessage(0), 1000 / fps);
});
