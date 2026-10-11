const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
let browser;
(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  await page.addInitScript(() => {
    // Simulate slower decoding to observe intermediate progress, not just completion.
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this); await new Promise(resolve => setTimeout(resolve, 150));
    };
  });
  await page.goto(process.argv[4] || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 800;
    const context = canvas.getContext('2d'); context.fillStyle = '#4f46e5'; context.fillRect(0, 0, 1200, 800);
    context.fillStyle = 'white'; context.font = 'bold 100px sans-serif'; context.fillText('FOTO DE PRUEBA', 50, 200);
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  const files = Array.from({ length: 31 }, (_, index) => ({ name: 'IMG_' + String(index + 1).padStart(3, '0') + '.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(base64, 'base64') }));
  const waitIntermediate = name => page.waitForFunction(name => {
    const bar = document.querySelector('progress[aria-label="' + name + '"]');
    return bar && bar.max === 31 && bar.value > 0 && bar.value < 31;
  }, name);
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(files);
  await waitIntermediate('Preparando fotos');
  assert.equal(await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).isDisabled(), true);
  const loading = await page.getByRole('progressbar', { name: 'Preparando fotos', exact: true }).evaluate(bar => ({ completed: bar.value, total: bar.max, text: bar.getAttribute('aria-valuetext') }));
  assert.equal(loading.text, `${loading.completed} de 31 fotos listas, ${Math.round(loading.completed / 31 * 100)}%`);
  await page.getByRole('progressbar', { name: 'Preparando fotos', exact: true }).locator('..').screenshot({ path: 'artifacts/progress-desktop.png' });
  await waitIntermediate('Preparando vista previa');
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  assert.equal(await page.getByRole('progressbar', { name: /Preparando/ }).count(), 0);
  await page.getByText('31 fotos conectadas', { exact: true }).waitFor();
  await page.waitForTimeout(700); await page.reload();
  await page.getByText(/Hay 31 fotos guardadas sin conectar/).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(files);
  await waitIntermediate('Reconectando fotos');
  assert.equal(await page.getByText(/Hay 31 fotos guardadas sin conectar/).count(), 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Barra sin desborde móvil');
  await page.getByRole('progressbar', { name: 'Reconectando fotos', exact: true }).locator('..').screenshot({ path: 'artifacts/progress-mobile.png' });
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  await page.getByText('31 fotos conectadas', { exact: true }).waitFor();
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles({ name: 'IMG_099.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('invalid image') });
  await page.getByText(/No se pudo cargar IMG_099.jpg/).waitFor();
  assert.equal(await page.getByRole('progressbar', { name: /Preparando|Reconectando/ }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).isDisabled(), false);
  await page.getByText('31 fotos conectadas', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  fs.writeFileSync('artifacts/progress-report.json', JSON.stringify({ status: 'passed', loading, photos: 31, previewProgress: true, reconnect: true, invalidImagePreservesProject: true, mobileWidth: 390, consoleErrors: errors }, null, 2));
  console.log('PASS: avance real con 31 fotos, porcentaje y contador, vista previa, reconexión, móvil y recuperación ante archivo inválido');
  await browser.close();
})().catch(error => { console.error(error); if (browser) browser.close().finally(() => process.exit(1)); else process.exit(1); });
