const { chromium } = require(process.argv[2] || 'playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
let chrome, browser, page;
const totem = process.argv[6] === 'totem' || process.argv[6] === 'totem-left';
const outputRotation = process.argv[6] === 'totem-left' ? 270 : totem ? 90 : 0;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'autoreel-export-'));
  chrome = spawn(process.argv[3] || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=0', '--user-data-dir=' + profile, '--window-position=-32000,-32000', '--disable-backgrounding-occluded-windows', '--no-first-run', '--no-default-browser-check', '--disable-extensions', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const endpoint = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(endpoint); i++) await pause(100);
  const [port, websocket] = fs.readFileSync(endpoint, 'utf8').trim().split(/\r?\n/);
  // Default focus emulation would make hidden tabs look visible and invalidate this test.
  browser = await chromium.connectOverCDP('ws://127.0.0.1:' + port + websocket, { noDefaults: true });
  const context = browser.contexts()[0]; page = context.pages()[0];
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors = [], downloads = []; page.on('pageerror', error => errors.push(error.message)); page.on('download', download => downloads.push(download));
  await page.addInitScript(forceWebM => {
    window.exportProbe = { decodes: [], frames: [], recorders: [], picker: [], saved: null, abortAttempts: 0 };
    const AudioCtx = window.AudioContext;
    window.recordingContexts = [];
    window.AudioContext = new Proxy(AudioCtx, { construct(target, args) { const context = Reflect.construct(target, args); window.recordingContexts.push(context); return context; } });
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      const result = await decode.call(this); window.exportProbe.decodes.push({ width: this.naturalWidth, height: this.naturalHeight }); return result;
    };
    const Recorder = window.MediaRecorder;
    window.MediaRecorder = new Proxy(Recorder, {
      construct(target, args) { window.exportProbe.recorders.push(args[1]); return Reflect.construct(target, args); },
      get(target, key) { if (key === 'isTypeSupported' && forceWebM) return mime => mime.startsWith('video/webm') && target.isTypeSupported(mime); return Reflect.get(target, key); }
    });
    const request = CanvasCaptureMediaStreamTrack.prototype.requestFrame;
    CanvasCaptureMediaStreamTrack.prototype.requestFrame = function () { window.exportProbe.frames.push({ time: performance.now(), hidden: document.hidden }); return request.call(this); };
    const Frame = window.VideoFrame;
    if (Frame) window.VideoFrame = new Proxy(Frame, { construct(target, args) { window.exportProbe.frames.push({ time: performance.now(), hidden: document.hidden, audioTime: window.recordingContexts[0]?.currentTime, audioState: window.recordingContexts[0]?.state }); return Reflect.construct(target, args); } });
    window.showSaveFilePicker = async options => {
      window.exportProbe.picker.push({ options, activated: navigator.userActivation.isActive });
      if (window.exportProbe.picker.length === 1) throw new DOMException('Cancelado por prueba', 'AbortError');
      if (window.exportProbe.picker.length === 2) return { createWritable: async () => { throw new Error('No hay permiso de escritura de prueba'); } };
      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle(options.suggestedName, { create: true });
      return { createWritable: async () => {
        const stream = await handle.createWritable();
        return { write: value => stream.write(value), abort: () => stream.abort(), close: async () => {
          await stream.close(); const file = await handle.getFile();
          const reader = new FileReader(); reader.onload = () => { window.exportProbe.saved = { name: file.name, size: file.size, data: reader.result.split(',')[1] }; }; reader.readAsDataURL(file);
        } };
      } };
    };
  }, process.argv[5] === 'webm');
  await page.goto(process.argv[4] || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  const pictures = await page.evaluate(() => {
    const results = [];
    for (let i = 0; i < 4; i++) {
      const canvas = document.createElement('canvas'); canvas.width = 4000; canvas.height = 2400;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = ['#ffffff', '#ff0000', '#00ff00', '#0000ff'][i]; ctx.fillRect(0, 0, 4000, 2400);
      if (i === 0) { ctx.fillStyle = '#000000'; for (let x = 0; x < 4000; x += 8) ctx.fillRect(x, 0, 4, 2400); }
      results.push(canvas.toDataURL('image/png').split(',')[1]);
    }
    return results;
  });
  const inputs = pictures.map((base64, index) => ({ name: 'IMG_00' + (index + 1) + '.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') }));
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(inputs);
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  await page.getByRole('button', { name: /Individual \(1 foto por escena\)/ }).click();
  await page.getByRole('button', { name: /Rellenar cuadro \(recortar\)/ }).click();
  await page.getByRole('checkbox', { name: 'Mostrar textos', exact: true }).uncheck();
  await page.getByLabel('Música', { exact: true }).selectOption('chill');
  for (let i = 0; i < 10; i++) await page.getByLabel('Duración de las escenas').press('ArrowRight');
  assert.equal(await page.getByLabel('Duración de las escenas').inputValue(), '2.5');
  await page.getByRole('button', { name: 'Línea de tiempo', exact: true }).click();
  await page.getByRole('button', { name: 'Todas: corte directo', exact: true }).click();
  for (let i = 1; i <= 4; i++) await page.getByLabel('Movimiento IMG_00' + i + '.png').selectOption('static');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.getByRole('button', { name: 'Encuadrar foto', exact: true }).click();
  const right = page.getByRole('button', { name: '↷ Girar 90° a la derecha', exact: true }), left = page.getByRole('button', { name: '↶ Girar 90° a la izquierda', exact: true });
  await right.click(); await pause(750);
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('autoreel-project-v1')));
  assert.equal(saved.slides[0].photos[0].framing.rotation, 90); assert.equal(saved.slides[1].photos[0].framing, undefined);
  await left.click();
  await page.getByLabel('Aplicar giro a', { exact: true }).selectOption('selected');
  assert.equal(await right.isDisabled(), true);
  await page.getByLabel('Girar IMG_002.png', { exact: true }).check(); await page.getByLabel('Girar IMG_003.png', { exact: true }).check();
  await left.click(); await pause(750);
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('autoreel-project-v1')));
  assert.equal(saved.slides[1].photos[0].framing.rotation, 270); assert.equal(saved.slides[2].photos[0].framing.rotation, 270);
  assert.equal(saved.slides[0].photos[0].framing.rotation, undefined); assert.equal(saved.slides[3].photos[0].framing, undefined);
  await right.click();
  await page.getByLabel('Aplicar giro a', { exact: true }).selectOption('all'); await right.click();
  await pause(750);
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('autoreel-project-v1')));
  assert.ok(saved.slides.every(slide => slide.photos[0].framing.rotation === 90));
  await left.click();
  // Leave the stripe image rotated to verify the actual exported image, then reconnect.
  await page.getByLabel('Aplicar giro a', { exact: true }).selectOption('current'); await right.click();
  await page.getByRole('button', { name: 'Listo, volver a la vista previa', exact: true }).click(); await pause(750);
  await page.reload(); await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(inputs);
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  if (totem) {
    await page.getByLabel('Formato', { exact: true }).selectOption('totem-' + outputRotation);
    await page.getByLabel('Título', { exact: true }).fill('TOTEM TV');
    await page.getByRole('checkbox', { name: 'Mostrar textos', exact: true }).check();
    await pause(750);
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('autoreel-project-v1')));
    assert.equal(before.config.outputRotation, outputRotation); assert.equal(before.config.width, 1080);
    const canvasSize = await page.getByLabel('Vista previa del montaje', { exact: true }).evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
    assert.ok(canvasSize.width < canvasSize.height, 'La edición sigue vertical');
    await page.reload(); await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(inputs);
    await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Formato', { exact: true }).inputValue(), 'totem-' + outputRotation);
  }
  await page.getByRole('button', { name: /Exportar \(/ }).click();
  await page.getByRole('checkbox', { name: 'Elegir dónde guardar al terminar' }).check();
  assert.equal(await page.evaluate(() => document.hidden), false);
  await page.getByRole('button', { name: 'Grabar y elegir dónde guardar', exact: true }).click();
  await page.waitForFunction(() => window.exportProbe.frames.length >= 3);
  const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront();
  assert.equal(await page.evaluate(() => document.hidden), true, 'La pestaña de la app realmente queda oculta');
  const pausedProgress = await page.evaluate(() => document.querySelector('progress[aria-label="Avance de exportación"]')?.value);
  await pause(3500);
  const whileHidden = await page.evaluate(() => ({ hidden: document.hidden, progress: document.querySelector('progress[aria-label="Avance de exportación"]')?.value, frames: window.exportProbe.frames.filter(frame => frame.hidden).length }));
  assert.equal(whileHidden.hidden, true);
  if (process.argv[5] === 'webm') {
    assert.equal(whileHidden.progress, pausedProgress, 'WebM conserva el avance al pausar la pestaña');
    assert.ok(await page.evaluate(() => document.body.innerText.includes('Grabación en pausa')));
    await page.bringToFront();
  } else {
    assert.ok(whileHidden.progress > 15); assert.ok(whileHidden.frames > 45, 'La grabación conserva fotogramas en segundo plano');
  }
  for (let i = 0; process.argv[5] !== 'webm' && i < 300; i++) {
    if (await page.evaluate(() => document.body.innerText.includes('Grabación completa: volvé a esta pestaña para verificar y guardar'))) break;
    if (i === 299) throw new Error('La grabación no terminó: ' + await page.evaluate(() => document.body.innerText.slice(0, 1600) + '\n' + document.body.innerText.slice(-1600)));
    await pause(100);
  }
  await page.bringToFront();
  await page.getByRole('button', { name: 'Elegir ubicación y guardar video', exact: true }).waitFor({ timeout: 30000 });
  assert.equal(downloads.length, 0, 'Elegir ubicación no dispara una descarga automática');
  const save = page.getByRole('button', { name: 'Elegir ubicación y guardar video', exact: true });
  await save.click(); await page.getByText('Guardado cancelado. El video sigue listo para volver a intentarlo.').waitFor();
  await save.click(); await page.getByText(/No hay permiso de escritura de prueba/).waitFor();
  await save.click(); await page.getByText('Video guardado en la ubicación elegida.').waitFor();
  await page.waitForFunction(() => !!window.exportProbe.saved);
  const probe = await page.evaluate(() => window.exportProbe);
  fs.writeFileSync('artifacts/export-clock-diagnostic.json', JSON.stringify({ samples: probe.frames.filter((_, index) => index % 25 === 0), options: probe.recorders }, null, 2));
  assert.ok(probe.picker.every(call => call.activated), 'El selector se abre desde un clic nuevo con activación válida');
  assert.ok(probe.recorders.every(options => options.videoBitsPerSecond === 15552000));
  assert.ok(probe.decodes.filter(image => image.width === 4000 && image.height === 2400).length >= 8, 'Se vuelven a decodificar originales para exportar, no solo al importar');
  const extension = probe.saved.name.split('.').pop(); assert.equal(probe.picker[2].options.types[0].accept['video/' + extension][0], '.' + extension);
  const exported = 'artifacts/background-video.' + extension; fs.writeFileSync(exported, Buffer.from(probe.saved.data, 'base64'));
  const video = await page.evaluate(async ({ data, extension, outputRotation }) => {
    const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(data), char => char.charCodeAt(0))], { type: 'video/' + extension }));
    const video = document.createElement('video'); video.src = url;
    await new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = reject; });
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d'), samples = [];
    for (const time of [0.6, 3.3, 5.8, 8.3]) {
      video.currentTime = time; await new Promise(resolve => { video.onseeked = resolve; }); ctx.drawImage(video, 0, 0);
      const center = Array.from(ctx.getImageData(outputRotation ? 960 : 540, outputRotation ? 540 : 960, 1, 1).data).slice(0, 3);
      const line = outputRotation ? ctx.getImageData(outputRotation === 90 ? 720 : 600, 540, 600, 1).data : ctx.getImageData(540, 600, 1, 600).data;
      const values = Array.from({ length: 600 }, (_, index) => line[index * 4]);
      let titlePixels = 0;
      if (outputRotation && time === 3.3) {
        const title = ctx.getImageData(outputRotation === 90 ? 1700 : 40, 0, 180, 1080).data;
        for (let index = 0; index < title.length; index += 4) if (title[index] > 220 && title[index + 1] > 220 && title[index + 2] > 220) titlePixels++;
      }
      samples.push({ time, center, contrast: Math.max(...values) - Math.min(...values), titlePixels });
    }
    const audioContext = new AudioContext();
    const audio = await audioContext.decodeAudioData(Uint8Array.from(atob(data), char => char.charCodeAt(0)).buffer);
    const channel = audio.getChannelData(0);
    const audioRms = [0.5, 3, 6, 8].map(time => {
      const start = Math.floor(time * audio.sampleRate), end = Math.min(channel.length, start + audio.sampleRate);
      let sum = 0; for (let index = start; index < end; index++) sum += channel[index] * channel[index];
      return Math.sqrt(sum / Math.max(1, end - start));
    });
    let duration = video.duration;
    if (!Number.isFinite(duration)) {
      // MediaRecorder WebM may omit duration; use its playback timeline, not decoded audio length.
      video.muted = true; video.playbackRate = 16; video.currentTime = 0;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('No se pudo medir la duración de WebM')), 6000);
        video.onended = () => { clearTimeout(timer); resolve(); };
        video.play().catch(error => { clearTimeout(timer); reject(error); });
      });
      duration = video.currentTime;
    }
    await audioContext.close(); URL.revokeObjectURL(url); return { width: video.videoWidth, height: video.videoHeight, duration, samples, audioRms, audioDuration: audio.duration };
  }, { data: probe.saved.data, extension, outputRotation });
  fs.writeFileSync('artifacts/export-video-metadata.json', JSON.stringify(video, null, 2));
  assert.equal(video.width, totem ? 1920 : 1080); assert.equal(video.height, totem ? 1080 : 1920);
  if (totem) assert.ok(video.samples[1].titlePixels > 500, 'El título se gira con todo el montaje hacia el lado elegido');
  assert.ok(video.duration > 9.6 && video.duration < 10.5, 'Cambiar de pestaña conserva la duración');
  assert.ok(video.audioDuration >= 9.5 && video.audioDuration < 10.5, 'La pista de audio conserva su duración, con margen para el arranque del dispositivo');
  assert.ok(video.audioRms.every(value => value > 0.0001), 'La música conserva señal durante las escenas grabadas con la pestaña oculta');
  assert.ok(video.samples[0].contrast > 200, 'Las líneas finas del original permanecen definidas y giradas en el video');
  assert.ok(video.samples[1].center[0] > 200 && video.samples[1].center[1] < 30, 'La segunda escena se grabó mientras la pestaña estaba oculta');
  assert.ok(video.samples[2].center[1] > 200 && video.samples[2].center[0] < 30);
  assert.ok(video.samples[3].center[2] > 200 && video.samples[3].center[0] < 30);
  // Cancelling must release the worker and allow another export, with the unsaved file cleared.
  await page.getByRole('button', { name: /Exportar \(/ }).click();
  await page.getByRole('button', { name: 'Grabar y elegir dónde guardar', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar grabación', exact: true }).click();
  await page.getByRole('button', { name: /Exportar \(/ }).waitFor({ state: 'visible' });
  await pause(500);
  assert.equal(await page.getByRole('button', { name: 'Cancelar grabación', exact: true }).count(), 0);
  assert.equal(await save.count(), 0); assert.deepEqual(errors, []);
  if (totem) {
    await page.getByLabel('Formato', { exact: true }).selectOption('1080x1920'); await pause(750);
    const normal = await page.evaluate(() => JSON.parse(localStorage.getItem('autoreel-project-v1')));
    assert.equal(normal.config.outputRotation, 0); assert.equal(normal.slides[0].photos[0].framing.rotation, 90);
  }
  fs.writeFileSync('artifacts/export-report.json', JSON.stringify({ status: 'passed', rotationCurrentSelectedAll: true, reconnect: true, whileHidden, quality: { bitrate: probe.recorders[0].videoBitsPerSecond, originalDecodes: probe.decodes.filter(image => image.width === 4000).length }, picker: probe.picker, video, errors }, null, 2));
  if (totem) fs.copyFileSync('artifacts/export-report.json', 'artifacts/totem-' + outputRotation + '-' + extension + '-report.json');
  console.log('PASS: giro individual/selección/todas, persistencia, originales, video real en pestaña oculta, Guardar como con cancelar/error/reintentar y cancelación de grabación');
})().catch(async error => {
  console.error(error); process.exitCode = 1;
  if (page) { await page.bringToFront().catch(() => {}); console.error(await page.evaluate(() => ({ hidden: document.hidden, body: document.body.innerText.slice(-1600), probe: { recorders: window.exportProbe?.recorders, frames: window.exportProbe?.frames.length, picker: window.exportProbe?.picker } })).catch(() => ({}))); await page.screenshot({ path: 'artifacts/export-error.png', fullPage: true }).catch(() => {}); }
}).finally(async () => {
  if (browser) { const session = await browser.newBrowserCDPSession(); await session.send('Browser.close').catch(() => {}); await browser.close().catch(() => {}); }
  if (chrome && chrome.exitCode === null) chrome.kill();
});
