// Real Chrome, native encoders and local originals. No photos leave localhost.
const { chromium } = require(process.argv[2] || 'playwright');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let chrome, browser, page;
(async () => {
  const photoFolder = process.argv[5];
  if (!photoFolder) throw new Error('Pasá la carpeta de fotos originales como quinto argumento.');
  const inputs = fs.readdirSync(photoFolder).filter(name => /\.(jpg|jpeg|png)$/i.test(name)).map(name => path.join(photoFolder, name));
  assert.ok(inputs.length > 0);
  fs.mkdirSync('artifacts', { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'autoreel-encoding-'));
  chrome = spawn(process.argv[3] || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--remote-debugging-port=0', '--user-data-dir=' + profile, '--window-position=-32000,-32000', '--disable-backgrounding-occluded-windows', '--no-first-run', '--no-default-browser-check', '--disable-extensions', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const endpoint = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(endpoint); i++) await pause(100);
  const [port, websocket] = fs.readFileSync(endpoint, 'utf8').trim().split(/\r?\n/);
  browser = await chromium.connectOverCDP('ws://127.0.0.1:' + port + websocket, { noDefaults: true });
  const downloadPath = path.resolve('artifacts/encoding-download-' + Date.now()); fs.mkdirSync(downloadPath);
  const session = await browser.newBrowserCDPSession();
  await session.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath, eventsEnabled: true });
  const context = browser.contexts()[0]; page = context.pages()[0];
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.encodingProbe = { configs: [], frames: [], references: [], decodes: [] };
    const configure = VideoEncoder.prototype.configure, encode = VideoEncoder.prototype.encode;
    VideoEncoder.prototype.configure = function (config) { window.encodingProbe.configs.push(config); return configure.call(this, config); };
    VideoEncoder.prototype.encode = function (frame, options) {
      const index = window.encodingProbe.frames.length;
      window.encodingProbe.frames.push({ timestamp: frame.timestamp, duration: frame.duration, hidden: document.hidden });
      if ([20, 200, 500].includes(index)) {
        const canvas = document.createElement('canvas'); canvas.width = frame.displayWidth; canvas.height = frame.displayHeight;
        canvas.getContext('2d').drawImage(frame, 0, 0);
        window.encodingProbe.references.push({ index, data: canvas.toDataURL('image/png').split(',')[1] });
      }
      return encode.call(this, frame, options);
    };
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this); window.encodingProbe.decodes.push({ width: this.naturalWidth, height: this.naturalHeight });
    };
  });
  await page.goto(process.argv[4] || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  // CDP reads paths on this local machine, avoiding Playwright's 50 MB remote-transfer limit.
  await page.getByLabel('Elegir fotos', { exact: true }).evaluate(input => { input.id = 'encoding-test-files'; });
  const dom = await context.newCDPSession(page), { root } = await dom.send('DOM.getDocument');
  const { nodeId } = await dom.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#encoding-test-files' });
  await dom.send('DOM.setFileInputFiles', { nodeId, files: inputs });
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor({ timeout: 90000 });
  await page.getByRole('button', { name: /Individual \(1 foto por escena\)/ }).click();
  await page.getByRole('button', { name: /Rellenar cuadro \(recortar\)/ }).click();
  await page.getByLabel('Formato', { exact: true }).selectOption('totem-90');
  await page.getByLabel('Duración de las escenas').press('Home');
  for (let i = 0; i < 5; i++) await page.getByLabel('Duración de las escenas').press('ArrowRight');
  assert.equal(await page.getByLabel('Duración de las escenas').inputValue(), '0.9');
  await page.getByLabel('Música', { exact: true }).selectOption('chill');
  await page.getByLabel('Título', { exact: true }).fill('PRUEBA TOTEM');
  const expected = inputs.length * 27, started = Date.now();
  await page.getByRole('button', { name: /Exportar \(/ }).click();
  await page.getByRole('button', { name: 'Grabar y descargar video', exact: true }).click();
  await page.waitForFunction(() => window.encodingProbe.frames.length >= 3);
  const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront();
  assert.equal(await page.evaluate(() => document.hidden), true);
  let downloaded;
  for (let i = 0; i < 1800; i++) {
    downloaded = fs.readdirSync(downloadPath).find(name => name.endsWith('.mp4'));
    if (downloaded && !fs.readdirSync(downloadPath).some(name => name.endsWith('.crdownload'))) break;
    if (i === 1799) throw new Error('La exportación no terminó: ' + await page.evaluate(() => document.body.innerText.slice(-1800)));
    await pause(100);
  }
  const probe = await page.evaluate(() => window.encodingProbe);
  assert.equal(probe.frames.length, expected, 'Se envían todos los cuadros al codificador');
  assert.equal(probe.configs[0].latencyMode, 'quality');
  assert.ok(probe.frames.filter(frame => frame.hidden).length > 45);
  assert.ok(probe.decodes.filter(image => Math.max(image.width, image.height) > 1920).length >= inputs.length * 2, 'Importación y exportación decodifican originales');
  const file = 'artifacts/encoding-real-photos.mp4'; fs.copyFileSync(path.join(downloadPath, downloaded), file);
  const ffprobe = process.argv[6] || 'ffprobe', ffmpeg = process.argv[7] || 'ffmpeg';
  const metadata = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));
  const video = metadata.streams.find(stream => stream.codec_type === 'video'), audio = metadata.streams.find(stream => stream.codec_type === 'audio');
  assert.equal(video.codec_name, 'h264'); assert.equal(video.width, 1920); assert.equal(video.height, 1080);
  assert.equal(Number(video.nb_frames), expected); assert.equal(video.avg_frame_rate, '30/1'); assert.equal(video.pix_fmt, 'yuv420p');
  assert.ok(Math.abs(Number(video.duration) - inputs.length * 0.9) < 0.01);
  assert.equal(audio.codec_name, 'aac'); assert.ok(Math.abs(Number(audio.duration) - Number(video.duration)) < 0.05);
  const timestamps = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-select_streams', 'v', '-show_packets', '-show_entries', 'packet=pts_time,duration_time', '-of', 'json', file], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })).packets.map(packet => Number(packet.pts_time)).sort((a, b) => a - b);
  const gaps = timestamps.slice(1).map((time, index) => time - timestamps[index]);
  assert.ok(gaps.every(gap => Math.abs(gap - 1 / 30) < 0.00001), 'Todos los cuadros se presentan a intervalos de 1/30 s');
  const quality = [];
  for (const reference of probe.references) {
    const original = 'artifacts/encoding-reference-' + reference.index + '.png', decoded = 'artifacts/encoding-decoded-' + reference.index + '.png';
    fs.writeFileSync(original, Buffer.from(reference.data, 'base64'));
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', file, '-vf', 'select=eq(n\\,' + reference.index + ')', '-frames:v', '1', '-y', decoded], { stdio: 'pipe' });
    // FFmpeg's SSIM report is on stderr; capture both streams without a shell.
    const { spawnSync } = require('node:child_process');
    // Compare in the encoder's BT.709 YUV 4:2:0 space; RGB screenshots add color-conversion error.
    const filter = '[0:v]scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setsar=1,settb=1/30[a];[1:v]select=eq(n\\,' + reference.index + '),setpts=PTS-STARTPTS,settb=1/30[b];[a][b]ssim';
    const result = spawnSync(ffmpeg, ['-hide_banner', '-i', original, '-i', file, '-filter_complex', filter, '-frames:v', '1', '-f', 'null', '-'], { encoding: 'utf8' });
    assert.equal(result.status, 0); const output = result.stderr;
    const score = Number(output.match(/All:([\d.]+)/)?.[1]); assert.ok(score > 0.95, 'La compresión conserva el detalle del cuadro ' + reference.index + ': ' + score);
    quality.push({ frame: reference.index, ssim: score });
  }
  const audioResult = require('node:child_process').spawnSync(ffmpeg, ['-hide_banner', '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  assert.equal(audioResult.status, 0); assert.ok(Number(audioResult.stderr.match(/mean_volume: (-?[\d.]+)/)?.[1]) > -55, 'La pista de música conserva señal');
  await page.bringToFront(); assert.deepEqual(errors, []);
  fs.writeFileSync('artifacts/encoding-report.json', JSON.stringify({ status: 'passed', photos: inputs.length, elapsedSeconds: (Date.now() - started) / 1000, video: { codec: video.codec_name, profile: video.profile, width: video.width, height: video.height, fps: video.avg_frame_rate, frames: video.nb_frames, duration: video.duration, bitrate: video.bit_rate, largestGap: Math.max(...gaps) }, audio: { codec: audio.codec_name, duration: audio.duration }, hiddenFrames: probe.frames.filter(frame => frame.hidden).length, config: probe.configs[0], quality, errors }, null, 2));
  console.log('PASS: ' + inputs.length + ' originales locales, ' + expected + ' cuadros reales a 30 FPS, pestaña oculta, H.264/AAC, SSIM YUV > .95');
})().catch(async error => {
  console.error(error); process.exitCode = 1;
  if (page) console.error(await page.evaluate(() => ({ body: document.body.innerText.slice(-1700), frames: window.encodingProbe?.frames.length, configs: window.encodingProbe?.configs })).catch(() => ({})));
}).finally(async () => {
  if (browser) { const session = await browser.newBrowserCDPSession(); await session.send('Browser.close').catch(() => {}); await browser.close().catch(() => {}); }
  if (chrome && chrome.exitCode === null) chrome.kill();
});
