const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
let browser;
(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  const pixels = await page.evaluate(async () => {
    const { drawFrame, loadImages } = await import('/src/utils/canvasRenderer.ts');
    const { DEFAULT_CONFIG } = await import('/src/utils/config.ts');
    const config = { ...DEFAULT_CONFIG, width: 120, height: 200, backgroundStyle: 'black', showOverlayText: false };
    const photos = ['#ff0000', '#0000ff'].map((color, index) => {
      const source = document.createElement('canvas'); source.width = 120; source.height = 200;
      const ctx = source.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 120, 200);
      return { id: String(index), filename: index + '.png', number: String(index), previewUrl: source.toDataURL(), fullLocalPath: '', orientation: 'vertical', duration: 1, transition: 'wipe', kenBurns: 'static' };
    });
    const slides = photos.map(photo => ({ id: photo.id, photos: [photo], layout: 'single', duration: 1, transition: 'wipe' }));
    const images = await loadImages(slides, new AbortController().signal);
    const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 200;
    const sample = x => Array.from(canvas.getContext('2d').getImageData(x, 100, 1, 1).data).slice(0, 3);
    const result = {};
    for (const transition of ['wipe', 'fade', 'dissolve', 'none', 'pan', 'zoom', 'flash']) {
      slides[0].transition = transition; drawFrame(canvas, slides, config, images, 0.825);
      result[transition] = { left: sample(20), center: sample(60), right: sample(100) };
    }
    slides[1].transition = 'wipe'; drawFrame(canvas, slides, config, images, 1.9); result.last = sample(60);
    // A letterboxed next photo must cover the previous photo with its own black margins.
    const square = new Image(); square.src = photos[1].previewUrl; await square.decode();
    const source = document.createElement('canvas'); source.width = 120; source.height = 120;
    source.getContext('2d').drawImage(square, 0, 0, 120, 120);
    square.src = source.toDataURL(); await square.decode(); images.set('1', square);
    slides[0].transition = 'wipe'; drawFrame(canvas, slides, config, images, 0.825);
    result.margin = Array.from(canvas.getContext('2d').getImageData(20, 10, 1, 1).data).slice(0, 3);
    return result;
  });
  assert.deepEqual(pixels.wipe.left, [0, 0, 255]); assert.deepEqual(pixels.wipe.right, [255, 0, 0]);
  assert.deepEqual(pixels.none.center, [255, 0, 0]); assert.deepEqual(pixels.last, [0, 0, 255]);
  assert.deepEqual(pixels.fade, pixels.dissolve);
  assert.ok(Math.abs(pixels.fade.center[0] - 128) <= 1 && Math.abs(pixels.fade.center[2] - 128) <= 1, 'Fundido mezcla ambas escenas al 50%');
  assert.deepEqual(pixels.pan.left, [255, 0, 0]); assert.deepEqual(pixels.pan.right, [0, 0, 255]);
  assert.deepEqual(pixels.margin, [9, 9, 11], 'El barrido reemplaza también los márgenes');
  const fixtures = [1, 2].map(number => ({ name: 'IMG_00' + number + '.jpg', mimeType: 'image/jpeg', buffer: fs.readFileSync('artifacts/fixture-' + number + '.jpg') }));
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(fixtures);
  await page.getByText('2 fotos conectadas', { exact: true }).waitFor();
  await page.getByRole('button', { name: /Individual \(1 foto por escena\)/ }).click();
  await page.getByRole('button', { name: 'Línea de tiempo', exact: true }).click();
  await page.getByRole('button', { name: 'Todas: Wipe', exact: true }).click();
  assert.equal(await page.getByLabel('Transición escena 1').inputValue(), 'wipe');
  assert.equal(await page.getByLabel('Transición escena 2').inputValue(), 'wipe');
  await page.getByLabel('Transición escena 2').selectOption('dissolve');
  const download = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Guardar proyecto JSON', exact: true }).click()]).then(([value]) => value);
  await download.saveAs('artifacts/transitions-project.json');
  const project = JSON.parse(fs.readFileSync('artifacts/transitions-project.json', 'utf8'));
  assert.equal(project.config.defaultTransition, 'wipe');
  assert.deepEqual(project.slides.map(slide => slide.transition), ['wipe', 'dissolve']);
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.getByRole('button', { name: 'Usar todas las fotos', exact: true }).click();
  await page.getByRole('button', { name: 'Línea de tiempo', exact: true }).click();
  assert.equal(await page.getByLabel('Transición escena 1').inputValue(), 'wipe');
  await page.waitForTimeout(700); await page.reload();
  await page.getByRole('button', { name: 'Línea de tiempo', exact: true }).click();
  assert.equal(await page.getByLabel('Transición escena 1').inputValue(), 'wipe');
  await page.getByLabel('Elegir fotos', { exact: true }).count().then(async count => { if (!count) await page.getByRole('button', { name: 'Editor', exact: true }).click(); });
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(fixtures);
  await page.getByText('2 fotos conectadas', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Línea de tiempo', exact: true }).click();
  await page.screenshot({ path: 'artifacts/transitions-desktop.png', fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Línea de tiempo sin desbordes a ' + width + 'px');
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync('artifacts/transitions-report.json', JSON.stringify({ status: 'passed', pixels, consoleErrors: errors }, null, 2));
  console.log('PASS: píxeles de Fade/Wipe/Pan, márgenes limpios, controles globales/individuales, JSON, recarga y móvil');
  await browser.close();
})().catch(error => { console.error(error); if (browser) browser.close().finally(() => process.exit(1)); else process.exit(1); });
