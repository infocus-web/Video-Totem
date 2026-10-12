const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
let browser;
let activePage;
(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  activePage = page;
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  await page.goto(process.argv[4] || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  const fixtures = await page.evaluate(() => ['#ff0000', '#0000ff', '#00ff00'].map((color, index) => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 800;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 1200, 800);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 100, 800); ctx.fillRect(1100, 0, 100, 800);
    return { name: 'IMG_00' + (index + 1) + '.png', base64: canvas.toDataURL('image/png').split(',')[1] };
  }));
  const inputs = fixtures.map(item => ({ name: item.name, mimeType: 'image/png', buffer: Buffer.from(item.base64, 'base64') }));
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(inputs);
  await page.getByText('3 fotos conectadas', { exact: true }).waitFor();
  await page.getByRole('tab', { name: 'Escenas', exact: true }).click();
  await page.getByRole('button', { name: '0px', exact: true }).click();
  await page.getByRole('tab', { name: 'Encuadre', exact: true }).click();
  await page.getByLabel('Fondo', { exact: true }).selectOption('black');
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  const samples = () => page.evaluate(() => {
    const canvas = document.querySelector('canvas[aria-label="Vista previa del montaje"]');
    const ctx = canvas.getContext('2d');
    return { top: Array.from(ctx.getImageData(canvas.width / 2, 5, 1, 1).data).slice(0, 3), bottom: Array.from(ctx.getImageData(canvas.width / 2, canvas.height - 6, 1, 1).data).slice(0, 3) };
  });
  const waitPixel = (color, bottom = false) => page.waitForFunction(({ color, bottom }) => {
    const canvas = document.querySelector('canvas[aria-label="Vista previa del montaje"]');
    const pixel = canvas.getContext('2d').getImageData(canvas.width / 2, bottom ? canvas.height - 6 : 5, 1, 1).data;
    return color.every((value, index) => Math.abs(pixel[index] - value) < 3);
  }, { color, bottom });
  const waitTop = color => waitPixel(color);
  await page.getByRole('tab', { name: 'Textos', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Mostrar textos', exact: true }).uncheck();
  await waitTop([9, 9, 11]);
  await page.getByRole('tab', { name: 'Encuadre', exact: true }).click();
  await page.getByRole('button', { name: /Rellenar cuadro \(recortar\)/ }).click();
  await waitTop([255, 0, 0]);
  assert.deepEqual((await samples()).bottom, [0, 0, 255], '2 en 1 cubre el borde inferior');
  assert.equal(await page.getByLabel('Fondo', { exact: true }).isDisabled(), true);
  await page.getByRole('tab', { name: 'Escenas', exact: true }).click();
  await page.getByRole('button', { name: /3 en 1 \(Completa el Cuadro\)/ }).click();
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  await waitTop([255, 0, 0]); await waitPixel([0, 255, 0], true); assert.deepEqual((await samples()).bottom, [0, 255, 0], '3 en 1 cubre el borde inferior');
  await page.getByRole('tab', { name: 'Escenas', exact: true }).click();
  await page.getByRole('button', { name: /Individual \(1 foto por escena\)/ }).click();
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  await waitTop([255, 0, 0]); await waitPixel([255, 0, 0], true); assert.deepEqual((await samples()).bottom, [255, 0, 0], 'Foto individual sin franjas');
  await page.getByRole('tab', { name: 'Encuadre', exact: true }).click();
  await page.getByRole('button', { name: /Mostrar foto completa/ }).click();
  await waitTop([9, 9, 11]); assert.deepEqual((await samples()).bottom, [9, 9, 11]);
  await page.getByRole('tab', { name: 'Encuadre', exact: true }).click();
  await page.getByRole('button', { name: /Rellenar cuadro \(recortar\)/ }).click(); await waitTop([255, 0, 0]);
  const download = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Guardar proyecto JSON', exact: true }).click()]).then(([value]) => value);
  await download.saveAs('artifacts/fit-project.json');
  assert.equal(JSON.parse(fs.readFileSync('artifacts/fit-project.json', 'utf8')).config.photoFit, 'cover');
  await page.waitForTimeout(700); await page.reload();
  await page.getByRole('tab', { name: 'Encuadre', exact: true }).click();
  await page.getByRole('button', { name: /Rellenar cuadro \(recortar\)/ }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Rellenar cuadro \(recortar\)/ }).getAttribute('aria-pressed'), 'true');
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(inputs);
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor(); await waitTop([255, 0, 0]);
  await page.getByRole('button', { name: 'Línea de tiempo', exact: true }).click();
  await page.getByLabel('Movimiento IMG_001.png').selectOption('pan-up');
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor(); await waitTop([255, 0, 0]);
  await page.getByLabel('Posición del video').press('Home');
  for (let step = 0; step < 20; step++) await page.getByLabel('Posición del video').press('ArrowRight');
  assert.deepEqual((await samples()).bottom, [255, 0, 0], 'El movimiento mantiene el borde cubierto');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.getByRole('tab', { name: 'Ritmo', exact: true }).click();
  await page.getByLabel('Duración de las escenas').press('Home'); await page.getByLabel('Duración de las escenas').press('ArrowRight');
  await page.getByRole('tab', { name: 'Música', exact: true }).click();
  await page.getByLabel('Música', { exact: true }).selectOption('none');
  await page.getByRole('button', { name: 'Línea de tiempo', exact: true }).click();
  await page.getByRole('button', { name: 'Todas: corte directo', exact: true }).click();
  await page.getByLabel('Movimiento IMG_001.png').selectOption('static');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: 'artifacts/fit-desktop.png', fullPage: true });
  await page.getByRole('button', { name: /Exportar \(/ }).click();
  const videoDownload = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Grabar y descargar video' }).click()]).then(([value]) => value);
  const videoPath = 'artifacts/fit-video.' + videoDownload.suggestedFilename().split('.').pop(); await videoDownload.saveAs(videoPath);
  const metadata = await page.evaluate(async ({ base64, mime }) => {
    const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(base64), character => character.charCodeAt(0))], { type: mime }));
    const video = document.createElement('video'); video.src = url;
    await new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = reject; });
    // Seek into the first scene so Chrome has decoded a drawable frame.
    video.currentTime = 0.1;
    await new Promise(resolve => { video.onseeked = resolve; });
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d'); ctx.drawImage(video, 0, 0);
    const result = { width: canvas.width, height: canvas.height, duration: video.duration,
      top: Array.from(ctx.getImageData(canvas.width / 2, 10, 1, 1).data).slice(0, 3), bottom: Array.from(ctx.getImageData(canvas.width / 2, canvas.height - 11, 1, 1).data).slice(0, 3) };
    URL.revokeObjectURL(url); return result;
  }, { base64: fs.readFileSync(videoPath).toString('base64'), mime: videoPath.endsWith('.mp4') ? 'video/mp4' : 'video/webm' });
  assert.equal(metadata.width, 1080); assert.equal(metadata.height, 1920);
  // Decode the saved file independently of Chrome's asynchronous video presentation.
  const frame = execFileSync('ffmpeg', ['-v', 'error', '-ss', '0.1', '-i', videoPath, '-frames:v', '1', '-vf', 'scale=54:96', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']);
  metadata.top = [...frame.subarray(27 * 3, 27 * 3 + 3)];
  metadata.bottom = [...frame.subarray((95 * 54 + 27) * 3, (95 * 54 + 27) * 3 + 3)];
  if (Number.isFinite(metadata.duration)) assert.ok(Math.abs(metadata.duration - 1.5) < 0.2, 'Duración del video coherente con las escenas');
  for (const pixel of [metadata.top, metadata.bottom]) assert.ok(pixel[0] > 220 && pixel[1] < 30 && pixel[2] < 30, 'Video exportado sin franjas');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Sin desbordes a ' + width + 'px');
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync('artifacts/fit-report.json', JSON.stringify({ status: 'passed', metadata, consoleErrors: errors }, null, 2));
  console.log('PASS: relleno individual/2/3, modo completo, persistencia, movimiento, píxeles del video exportado y móvil');
  await browser.close();
})().catch(async error => {
  console.error(error);
  if (activePage) { console.error('Estado del editor:', await activePage.getByRole('status').allTextContents().catch(() => [])); await activePage.screenshot({ path: 'artifacts/fit-error.png', fullPage: true }).catch(() => {}); }
  if (browser) await browser.close(); process.exit(1);
});
