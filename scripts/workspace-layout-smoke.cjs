const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
let browser, page;
(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.argv[4] || 'http://127.0.0.1:4174', { waitUntil: 'networkidle' });
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 800;
    const ctx = canvas.getContext('2d'), gradient = ctx.createLinearGradient(0, 0, 1200, 800);
    gradient.addColorStop(0, '#2563eb'); gradient.addColorStop(1, '#db2777'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1200, 800);
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(Array.from({ length: 30 }, (_, index) => ({ name: 'IMG_' + String(index + 1).padStart(3, '0') + '.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(data, 'base64') })));
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  const selection = page.getByLabel('Selección del cliente', { exact: true });
  await selection.fill('001,\n003');
  assert.equal(await selection.inputValue(), '001,\n003', 'La caja compacta conserva una selección de varias líneas');
  await page.getByRole('button', { name: 'Aplicar selección', exact: true }).click();
  assert.ok(await page.locator('.editor-counts').getByText('2 fotos', { exact: true }).isVisible());
  await selection.fill('');
  await page.getByRole('button', { name: 'Usar todas las fotos', exact: true }).click();
  const layout = [];
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 1200, height: 650 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const measure = await page.evaluate(() => {
      const box = selector => { const b = document.querySelector(selector).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
      return { header: box('header'), workspace: box('.editor-workspace'), editor: box('.editor-panel'), preview: box('.preview-panel'), photo: box('canvas'), notice: box('.app-notice'), selection: box('textarea'), photoSection: box('#editor-section-1'), pageHeight: document.documentElement.scrollHeight, pageWidth: document.documentElement.scrollWidth, windowY: scrollY };
    });
    assert.ok(measure.pageWidth <= viewport.width, 'Sin desborde horizontal: ' + JSON.stringify(viewport));
    if (viewport.width >= 1024) {
      assert.ok(measure.header.height <= 56, 'Cabecera compacta en escritorio');
      assert.ok(measure.workspace.y <= 110, 'Los avisos y botones no desplazan el área de edición');
      assert.ok(Math.abs(measure.editor.width / measure.preview.width - 2) < 0.02, 'Dos tercios para edición y un tercio para vista previa');
      assert.ok(measure.editor.height >= viewport.height * 0.8, 'El panel usa la altura disponible');
      assert.equal(measure.pageHeight, viewport.height, 'El scroll queda dentro de los paneles');
      assert.equal(measure.header.y, 0);
      assert.ok(measure.photo.y + measure.photo.height <= viewport.height);
      assert.ok(measure.notice.height <= 32, 'El aviso corto ocupa una línea compacta');
      const selectionBox = await selection.boundingBox();
      const labelBox = await selection.locator('xpath=ancestor::*[contains(@class,"property-row")]').locator('.property-label').boundingBox();
      assert.ok(selectionBox.height <= 32, 'La selección empieza en una sola línea');
      assert.ok(labelBox.x + labelBox.width <= selectionBox.x && Math.abs(labelBox.y - selectionBox.y) < 20, 'Etiqueta a la izquierda y selección a la derecha');
      assert.ok(await page.locator('#editor-section-1').evaluate(section => section.getBoundingClientRect().height <= 190), 'La selección deja espacio para otras herramientas');
      assert.ok(await page.locator('.editor-tools').evaluate(panel => panel.scrollWidth <= panel.clientWidth && panel.scrollLeft === 0), 'Sin etiquetas ni controles recortados');
      await page.getByRole('button', { name: 'Música', exact: true }).click();
      await page.getByLabel('Volumen', { exact: true }).press('End');
      assert.equal(await page.locator('header').evaluate(header => header.getBoundingClientRect().top), 0, 'La cabecera no se recorta al editar controles finales');
      const before = await page.getByLabel('Vista previa del montaje', { exact: true }).boundingBox();
      await page.getByRole('button', { name: 'Fotos', exact: true }).click();
      const after = await page.getByLabel('Vista previa del montaje', { exact: true }).boundingBox();
      assert.ok(Math.abs(after.y - before.y) < 1, 'Los accesos no desplazan la foto');
      for (const name of ['Nuevo proyecto', 'Guardar proyecto JSON', 'Inspector XML', 'Cómo usar AutoReel']) {
        const button = await page.getByRole('button', { name, exact: true }).boundingBox();
        assert.ok(button && button.x >= 0 && button.x + button.width <= viewport.width && button.y >= 0 && button.y + button.height <= measure.header.height, 'Acción accesible en la cabecera: ' + name);
      }
      if (viewport.width === 1440) assert.ok(measure.photo.height > 550, 'La vista previa creció respecto de los 412px anteriores');
      if (viewport.width === 1920) await page.screenshot({ path: 'artifacts/compact-workspace-desktop.png' });
    } else {
      assert.ok(measure.header.height <= 90, 'Cabecera compacta en móvil');
    }
    layout.push({ ...viewport, ...measure });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Formato', exact: true }).click();
  await page.getByLabel('Formato', { exact: true }).selectOption('totem-90');
  await page.getByRole('button', { name: 'Línea de tiempo', exact: true }).click();
  await page.getByLabel('Transición escena 15').scrollIntoViewIfNeeded();
  await page.getByLabel('Transición escena 15').selectOption('none');
  assert.equal(await page.locator('header').evaluate(header => header.getBoundingClientRect().top), 0, 'La línea de tiempo se desplaza dentro del panel');
  assert.ok(await page.locator('.timeline-tools').evaluate(panel => panel.scrollTop > 0));
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Guardar proyecto JSON', exact: true }).click()]);
  await download.saveAs('artifacts/compact-workspace-project.json');
  const project = JSON.parse(fs.readFileSync('artifacts/compact-workspace-project.json', 'utf8'));
  assert.equal(project.config.outputRotation, 90); assert.equal(project.slides.length, 15);
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.getByLabel('Abrir proyecto', { exact: true }).setInputFiles('artifacts/compact-workspace-project.json');
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(Array.from({ length: 30 }, (_, index) => ({ name: 'IMG_' + String(index + 1).padStart(3, '0') + '.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(data, 'base64') })));
  await page.getByRole('button', { name: 'Reproducir vista previa', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  fs.writeFileSync('artifacts/workspace-layout-report.json', JSON.stringify({ status: 'passed', layout, projectActions: true, timelineScroll: true, reconnect: true, errors }, null, 2));
  console.log('PASS: cabecera compacta, proporción 2/3, vista previa ampliada, siete tamaños de pantalla, scroll independiente, guardar/abrir y reconectar');
  await browser.close();
})().catch(async error => {
  console.error(error);
  if (page) await page.screenshot({ path: 'artifacts/workspace-layout-error.png' }).catch(() => {});
  if (browser) await browser.close(); process.exit(1);
});
