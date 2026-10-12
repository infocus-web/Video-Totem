const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
  const page = await browser.newPage({ viewport: { width: 1360, height: 950 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.argv[4] || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#a43a23'; ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(80, 80, 180, 220);
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  const files = ['IMG_001.jpg', 'IMG_002.jpg'].map(name => ({ name, mimeType: 'image/jpeg', buffer: Buffer.from(base64, 'base64') }));
  await page.addInitScript(() => {
    const fixture = sessionStorage.getItem('audit-reconnect');
    if (fixture) { localStorage.setItem('autoreel-project-v1', fixture); sessionStorage.removeItem('audit-reconnect'); }
  });
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('autoreel-project-v1')));
  const save = async () => page.waitForTimeout(800);
  const importFolder = async () => {
    await page.getByLabel('Elegir carpeta', { exact: true }).evaluate((input, base64) => {
      const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
      const transfer = new DataTransfer();
      for (const name of ['IMG_001.jpg', 'IMG_002.jpg']) {
        const file = new File([bytes], name, { type: 'image/jpeg' });
        Object.defineProperty(file, 'webkitRelativePath', { value: 'Sesion/sub/' + name });
        transfer.items.add(file);
      }
      input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, base64);
  };
  await importFolder();
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Línea de tiempo', exact: true }).click();
  await page.getByLabel('Duración escena 1').fill('2.7');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await save();
  const before = await stored();
  await page.reload();
  await page.getByText(/Hay 2 fotos guardadas sin conectar/).waitFor();
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(files);
  await page.getByText('2 fotos conectadas', { exact: true }).waitFor();
  await save();
  const after = await stored();
  const observation = { url: page.url(), libraryBefore: before.library.map(p => p.id), libraryAfter: after.library.map(p => p.id), missingBanner: await page.getByText(/Hay .*fotos guardadas sin conectar/).allTextContents(), playAvailable: await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).count(), errors };
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/reconnect-report.json', JSON.stringify(observation, null, 2));
  await page.screenshot({ path: 'artifacts/reconnect-desktop.png', fullPage: true });
  console.log(JSON.stringify(observation));
  if (process.argv.includes('--diagnose')) { await browser.close(); return; }
  assert.equal(observation.playAvailable, 1, 'El montaje guardado debe recuperar sus imágenes');
  assert.equal(observation.missingBanner.length, 0);
  assert.equal(after.library.length, 2, 'Reconectar no duplica la biblioteca');
  assert.deepEqual(after.slides, before.slides, 'Conserva las escenas, duración, IDs y rutas');
  // Files -> folder must work too, including IDs from old saved projects.
  await page.evaluate(before => {
    before.library.forEach((photo, i) => { photo.id = 'legacy-' + i; photo.relativePath = photo.filename; });
    before.slides.forEach(slide => slide.photos.forEach((photo, i) => { photo.id = 'legacy-' + i; photo.relativePath = photo.filename; }));
    sessionStorage.setItem('audit-reconnect', JSON.stringify(before));
  }, before);
  await page.reload();
  await importFolder();
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  await save();
  assert.deepEqual((await stored()).library.map(p => p.id), ['legacy-0', 'legacy-1']);
  // One unrelated missing photo must not block using connected photos.
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('autoreel-project-v1'));
    data.library.push({ ...data.library[0], id: 'missing.jpg', filename: 'missing.jpg', relativePath: 'missing.jpg' });
    sessionStorage.setItem('audit-reconnect', JSON.stringify(data));
  });
  await page.reload();
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(files);
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Usar todas las fotos', exact: true }).click();
  await page.getByText(/Se agregaron 2 fotos conectadas/).waitFor();
  await save();
  assert.equal((await stored()).slides.flatMap(s => s.photos).length, 2);
  assert.equal((await stored()).library.length, 3, 'No borra referencias pendientes');
  assert.deepEqual(errors, []);
  console.log('PASS: carpeta -> archivos, archivos -> carpeta, IDs antiguos, edición conservada y reconexión parcial');
  await browser.close();
})().catch(error => { console.error(error); if (browser) browser.close().finally(() => process.exit(1)); else process.exit(1); });
