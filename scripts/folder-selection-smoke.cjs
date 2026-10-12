const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
let browser;
(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.openedOriginals = [];
    const create = URL.createObjectURL;
    URL.createObjectURL = function (blob) {
      if (blob instanceof File) window.openedOriginals.push(blob.name);
      return create.call(this, blob);
    };
  });
  await page.goto(process.argv[4] || 'http://127.0.0.1:4174', { waitUntil: 'networkidle' });
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 400;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#4f46e5'; ctx.fillRect(0, 0, 600, 400);
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  const jpg = Buffer.from(image, 'base64');
  const fixture = path.resolve('artifacts/folder-selection-fixture');
  fs.mkdirSync(fixture, { recursive: true });
  for (let number = 1; number <= 405; number++) fs.writeFileSync(path.join(fixture, `UMMA-${number}.jpg`), Buffer.from('INVALID IMAGE - MUST NOT BE DECODED'));
  for (const name of ['UMMA-13.jpg', 'UMMA-29.jpg', 'UMMA-461b.jpg']) fs.writeFileSync(path.join(fixture, name), jpg);
  const folderInput = page.getByLabel('Elegir carpeta', { exact: true });
  const selection = page.getByLabel('Selección del cliente', { exact: true });
  const originalCount = () => page.evaluate(() => window.openedOriginals.length);
  const saved = async (count = 3) => {
    await page.waitForFunction(count => JSON.parse(localStorage.getItem('autoreel-project-v1'))?.library.length === count, count);
    return page.evaluate(() => JSON.parse(JSON.stringify(JSON.parse(localStorage.getItem('autoreel-project-v1')), (key, value) => ['sourceUrl', 'previewUrl'].includes(key) ? undefined : value)));
  };
  await selection.fill('461b, 29, 13');
  await folderInput.setInputFiles(fixture);
  await page.getByText('3 fotos conectadas', { exact: true }).waitFor();
  await page.getByText('Se cargaron 3 de 406 fotos de la carpeta. Selección aplicada; el montaje está listo.', { exact: true }).waitFor();
  const first = await saved();
  assert.deepEqual(first.slides.flatMap(slide => slide.photos.map(photo => photo.filename)), ['UMMA-461b.jpg', 'UMMA-29.jpg', 'UMMA-13.jpg']);
  assert.equal(first.library.length, 3);
  assert.deepEqual((await page.evaluate(() => window.openedOriginals)).sort(), ['UMMA-13.jpg', 'UMMA-29.jpg', 'UMMA-461b.jpg']);
  await page.getByRole('button', { name: 'Reproducir', exact: true }).waitFor();
  await selection.fill('29, 999');
  const beforeMissing = await originalCount();
  await folderInput.setInputFiles(fixture);
  await page.getByText(/No están en la carpeta: IMG_999.jpg/).waitFor();
  assert.equal(await originalCount(), beforeMissing);
  assert.deepEqual((await saved()).slides, first.slides);
  const duplicated = path.resolve('artifacts/folder-selection-duplicates');
  for (const dir of ['a', 'b']) {
    fs.mkdirSync(path.join(duplicated, dir), { recursive: true });
    fs.writeFileSync(path.join(duplicated, dir, 'UMMA-13.jpg'), jpg);
  }
  await selection.fill('13');
  await folderInput.setInputFiles(duplicated);
  await page.getByText(/Hay nombres o números repetidos: IMG_013.jpg/).waitFor();
  assert.equal(await originalCount(), beforeMissing);
  assert.deepEqual((await saved()).slides, first.slides);
  // Reconnect only the saved originals, even when the pasted list has since changed.
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByLabel('Elegir carpeta', { exact: true }).setInputFiles(fixture);
  await page.getByText('Se reconectaron 3 fotos. Se conservó la edición.', { exact: true }).waitFor();
  assert.equal(await originalCount(), 3);
  assert.deepEqual((await saved()).slides, first.slides);
  // Manual file choice keeps the existing behavior and ignores the pasted filter.
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles({ name: 'MANUAL_777.jpg', mimeType: 'image/jpeg', buffer: jpg });
  await page.getByText('4 fotos conectadas', { exact: true }).waitFor();
  assert.equal(await originalCount(), 4);
  // Without a list, folder import continues to load the complete compatible folder.
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page.getByLabel('Nombre del nuevo proyecto').fill('Carpeta completa');
  const [backup] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Crear proyecto', exact: true }).click()]);
  await backup.saveAs('artifacts/folder-selection-backup.json');
  const allFolder = path.resolve('artifacts/folder-selection-small'); fs.mkdirSync(allFolder, { recursive: true });
  for (const name of ['A_1.jpg', 'A_2.jpg']) fs.writeFileSync(path.join(allFolder, name), jpg);
  await page.getByLabel('Elegir carpeta', { exact: true }).setInputFiles(allFolder);
  await page.getByText('2 fotos conectadas', { exact: true }).waitFor();
  assert.equal((await saved(2)).slides.flatMap(slide => slide.photos).length, 2);
  assert.deepEqual(errors, []);
  fs.writeFileSync('artifacts/folder-selection-report.json', JSON.stringify({ folderPhotos: 406, processed: 3, order: first.slides.flatMap(s => s.photos.map(p => p.filename)), missingAndDuplicatesDecodeZero: true, reconnection: true, manual: true, emptyList: true, errors }, null, 2));
  console.log('PASS: 3 de 406 fotos, sin decodificar archivos ajenos inválidos; sufijos, orden, faltantes, ambigüedades, reconexión, carga manual y carpeta sin lista.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
