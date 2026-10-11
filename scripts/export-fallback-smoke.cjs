const { chromium } = require(process.argv[2] || 'playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
let chrome, browser, page;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'autoreel-fallback-'));
  chrome = spawn(process.argv[3] || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=0', '--user-data-dir=' + profile, '--window-position=-32000,-32000', '--disable-backgrounding-occluded-windows', '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const endpoint = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(endpoint); i++) await pause(100);
  const [port, websocket] = fs.readFileSync(endpoint, 'utf8').trim().split(/\r?\n/);
  browser = await chromium.connectOverCDP('ws://127.0.0.1:' + port + websocket, { noDefaults: true });
  const downloadSession = await browser.newBrowserCDPSession();
  const downloadPath = path.resolve('artifacts/fallback-download-' + Date.now());
  fs.mkdirSync(downloadPath, { recursive: true });
  await downloadSession.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath, eventsEnabled: true });
  const context = browser.contexts()[0]; page = context.pages()[0]; const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { window.VideoEncoder = undefined; window.AudioEncoder = undefined; window.MediaStreamTrackGenerator = undefined; window.showSaveFilePicker = undefined; });
  await page.goto(process.argv[4] || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  const photo = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 200; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 300, 200); return canvas.toDataURL().split(',')[1]; });
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles([{ name: 'IMG_001.png', mimeType: 'image/png', buffer: Buffer.from(photo, 'base64') }]);
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  await page.getByLabel('Música', { exact: true }).selectOption('none');
  await page.getByRole('button', { name: /Exportar \(/ }).click();
  assert.ok(await page.getByRole('checkbox', { name: 'Elegir dónde guardar al terminar' }).isDisabled());
  await page.getByRole('button', { name: 'Grabar y descargar video', exact: true }).click(); await pause(400);
  const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront();
  assert.equal(await page.evaluate(() => document.hidden), true);
  const snapshot = () => page.evaluate(() => ({ progress: document.querySelector('progress[aria-label="Avance de exportación"]')?.value, paused: document.body.innerText.includes('Grabación en pausa: volvé a esta pestaña para continuar'), canCancel: [...document.querySelectorAll('button')].some(button => button.textContent === 'Cancelar grabación') }));
  await pause(300); const first = await snapshot(); await pause(2200); const second = await snapshot();
  assert.equal(first.paused, true); assert.equal(second.progress, first.progress); assert.equal(second.canCancel, true);
  await page.bringToFront();
  let downloaded;
  for (let i = 0; i < 300; i++) {
    downloaded = fs.readdirSync(downloadPath).find(filename => /\.(mp4|webm)$/.test(filename));
    if (downloaded && !fs.readdirSync(downloadPath).some(filename => filename.endsWith('.crdownload'))) break;
    if (i === 299) throw new Error('No se descargó el archivo: ' + await page.evaluate(() => document.body.innerText.slice(-1200)));
    await pause(100);
  }
  const file = 'artifacts/fallback-video.' + downloaded.split('.').pop(); fs.copyFileSync(path.join(downloadPath, downloaded), file);
  assert.ok(fs.statSync(file).size > 1000); assert.equal(await page.getByRole('button', { name: 'Cancelar grabación', exact: true }).count(), 0);
  const video = await page.evaluate(async data => {
    const video = document.createElement('video'); video.src = 'data:video/mp4;base64,' + data;
    await new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = reject; });
    return { width: video.videoWidth, height: video.videoHeight, duration: Number.isFinite(video.duration) ? video.duration : null };
  }, fs.readFileSync(file).toString('base64'));
  assert.equal(video.width, 1080); assert.equal(video.height, 1920);
  if (video.duration !== null) assert.ok(video.duration > 1.2 && video.duration < 1.8, 'El tiempo oculto no se agrega al video');
  assert.deepEqual(errors, []);
  fs.writeFileSync('artifacts/export-fallback-report.json', JSON.stringify({ status: 'passed', noNativePicker: true, hidden: { first, second }, resumedDownload: path.basename(file), video, errors }, null, 2));
  console.log('PASS: sin selector nativo ni captura directa, ocultar pausa sin cancelar y al volver descarga el video');
})().catch(async error => { console.error(error); process.exitCode = 1; if (page) { await page.bringToFront().catch(() => {}); console.error(await page.evaluate(() => document.body.innerText.slice(0, 700) + '\n' + document.body.innerText.slice(-1300)).catch(() => '')); } }).finally(async () => {
  if (browser) { const session = await browser.newBrowserCDPSession(); await session.send('Browser.close').catch(() => {}); await browser.close().catch(() => {}); }
  if (chrome && chrome.exitCode === null) chrome.kill();
});
