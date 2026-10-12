const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
let browser;
const tone = seconds => {
  const rate = 22050, buffer = Buffer.alloc(44 + seconds * rate * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(buffer.length - 44, 40);
  for (let i = 0; i < rate * seconds; i++) buffer.writeInt16LE(Math.round(Math.sin(i / rate * 440 * Math.PI * 2) * 8000), 44 + i * 2);
  return buffer;
};
(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: process.argv[3], args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.cacheStats = { decodes: 0, revoked: 0 };
    const decode = HTMLImageElement.prototype.decode, revoke = URL.revokeObjectURL;
    HTMLImageElement.prototype.decode = function(...args) { window.cacheStats.decodes++; return decode.apply(this, args); };
    URL.revokeObjectURL = function(...args) { window.cacheStats.revoked++; return revoke.apply(this, args); };
  });
  await page.goto(process.argv[4] || 'http://127.0.0.1:4176/', { waitUntil: 'networkidle' });
  const tab = name => page.getByRole('tab', { name, exact: true }).click();
  const photos = await page.evaluate(() => ['#e52424', '#16bc46', '#244cea'].map(color => {
    const canvas = document.createElement('canvas'); canvas.width = 540; canvas.height = 960;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 540, 960);
    ctx.fillStyle = '#ffd000'; ctx.fillRect(60, 250, 120, 240);
    return canvas.toDataURL('image/jpeg').split(',')[1];
  }));
  const files = photos.map((data, index) => ({ name: `IMG_00${index + 1}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(data, 'base64') }));
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(files);
  await page.getByRole('button', { name: 'Reproducir', exact: true }).waitFor();
  await tab('Entrada'); await page.getByLabel('Activar entrada de quince').check();
  await page.getByLabel('Cargar canción de entrada', { exact: true }).setInputFiles({ name: 'final.wav', mimeType: 'audio/wav', buffer: tone(14) });
  await page.getByText('final.wav · 14.0s', { exact: true }).waitFor();
  await page.getByLabel('Escucha automática al mover').uncheck();
  await page.getByLabel('Inicio de música en segundos').fill('2');
  await page.getByLabel('Final de música en segundos').fill('13');
  await page.getByLabel('Inicio del contador', { exact: true }).fill('4');
  await page.getByLabel('Golpes desde segundo').fill('4');
  await page.getByLabel('Foto fija después del contador').selectOption({ label: 'IMG_002.jpg' });
  const chosenId = await page.getByLabel('Foto fija después del contador').inputValue();
  await page.getByText('Foto fija durante 4.00s después del cero.', { exact: true }).waitFor();
  await tab('Escenas'); await page.getByRole('button', { name: '3 en 1 (Lado a lado)', exact: true }).click();
  await tab('Entrada');
  const saved = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Guardar proyecto JSON', exact: true }).click()]).then(([download]) => download);
  await saved.saveAs('artifacts/final-photo-project.json');
  const project = JSON.parse(fs.readFileSync('artifacts/final-photo-project.json', 'utf8'));
  assert.equal(project.config.entrance.finalPhotoId, chosenId);
  assert.equal(project.slides[0].photos.length, 3);
  // A moving, rotated photo in a group must become a standalone still after zero.
  for (const photo of [...project.library, ...project.slides.flatMap(slide => slide.photos)]) {
    if (photo.id === chosenId) { photo.kenBurns = 'pan-down'; photo.framing = { x: 0.7, y: 0.4, zoom: 1.2, rotation: 90 }; }
  }
  await page.getByLabel('Abrir proyecto', { exact: true }).setInputFiles({ name: 'edited.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(files);
  await tab('Entrada');
  await page.getByLabel('Cargar canción de entrada', { exact: true }).setInputFiles({ name: 'final.wav', mimeType: 'audio/wav', buffer: tone(14) });
  await page.getByText('final.wav · 14.0s', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Foto fija después del contador').inputValue(), chosenId, 'JSON y reconexión conservan la foto elegida');
  await page.getByLabel('Escucha automática al mover').uncheck();
  const video = page.getByLabel('Posición del video', { exact: true });
  const canvas = page.getByLabel('Vista previa del montaje', { exact: true });
  const snapshot = async time => { await video.fill(String(time)); await page.waitForTimeout(150); return canvas.evaluate(c => c.toDataURL()); };
  const fixed = await snapshot(8.1);
  assert.equal(await snapshot(10.5), fixed, 'Foto final permanece fija sin el movimiento original');
  await page.getByLabel('Posición de escucha de la canción').fill('10.1');
  await page.waitForTimeout(150);
  assert.equal(await canvas.evaluate(c => c.toDataURL()), fixed, 'La escucha de música y el seek del montaje muestran la misma foto fija');
  await page.waitForTimeout(700);
  const savedBefore = await page.evaluate(() => localStorage.getItem('autoreel-project-v1'));
  const statsBefore = await page.evaluate(() => ({ ...window.cacheStats }));
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Purgar caché', exact: true }).click();
    await page.getByText('Caché de vista previa purgada. Se conservaron el proyecto, las fotos y la música.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Purgar caché', exact: true }).waitFor();
    await page.waitForTimeout(150);
    assert.equal(await snapshot(8.1), fixed, 'La purga conserva el encuadre y el fotograma');
  }
  const statsAfter = await page.evaluate(() => ({ ...window.cacheStats }));
  assert.equal(statsAfter.decodes - statsBefore.decodes, 9, 'Tres purgas reconstruyen las tres imágenes cada vez');
  assert.equal(statsAfter.revoked, statsBefore.revoked, 'No revoca las URLs de los originales ni las fotos del proyecto');
  assert.equal(await page.evaluate(() => localStorage.getItem('autoreel-project-v1')), savedBefore, 'No borra ni modifica el proyecto guardado');
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await page.getByRole('button', { name: 'Purgar caché', exact: true }).click();
  await page.getByText('Caché de vista previa purgada. Se conservaron el proyecto, las fotos y la música.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).waitFor();
  const paused = await video.inputValue(); await page.waitForTimeout(250); assert.equal(await video.inputValue(), paused, 'Purgar pausa la reproducción');
  await page.getByLabel('Posición de escucha de la canción').fill('10.1');
  await page.getByRole('button', { name: 'Escuchar selección de música', exact: true }).click();
  await page.getByRole('button', { name: 'Detener escucha de música', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Purgar caché', exact: true }).click();
  await page.getByText('Caché de vista previa purgada. Se conservaron el proyecto, las fotos y la música.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Escuchar selección de música', exact: true }).waitFor();
  await page.getByText('final.wav · 14.0s', { exact: true }).waitFor();
  await page.screenshot({ path: 'artifacts/cache-purge-panel.png' });
  await page.getByRole('button', { name: /Exportar \(/ }).click();
  const output = await Promise.all([page.waitForEvent('download', { timeout: 180000 }), page.getByRole('button', { name: 'Grabar y descargar video', exact: true }).click()]).then(([download]) => download);
  await output.saveAs('artifacts/final-photo-video.mp4');
  const meta = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', 'artifacts/final-photo-video.mp4'], { encoding: 'utf8' }));
  const stream = meta.streams.find(s => s.codec_type === 'video');
  assert.equal(stream.width, 1920); assert.equal(stream.height, 1080); assert.equal(stream.nb_read_frames, '660');
  assert.ok(Math.abs(Number(meta.format.duration) - 11) < 0.05, 'El video mantiene la duración del tramo musical');
  const frame = time => execFileSync('ffmpeg', ['-v', 'error', '-ss', String(time), '-i', 'artifacts/final-photo-video.mp4', '-frames:v', '1', '-vf', 'scale=64:36', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']);
  const after = frame(8.1), last = frame(10.5);
  const distance = after.reduce((sum, value, i) => sum + Math.abs(value - last[i]), 0) / after.length;
  assert.ok(distance < 1.5, 'El MP4 también mantiene el encuadre fijo');
  for (const x of [2, 32, 61]) {
    const at = (18 * 64 + x) * 3;
    assert.ok(after[at + 1] > after[at] * 2 && after[at + 1] > after[at + 2] * 2, 'Solo la foto verde ocupa todo el cuadro, sin sus compañeras');
  }
  await page.getByLabel('Foto fija después del contador').selectOption('');
  assert.notEqual(await snapshot(8.1), fixed, 'Desactivar la foto final restaura la escena agrupada del ciclo');
  assert.deepEqual(errors, []);
  console.log('Purga repetida: decodificaciones nuevas, proyecto y URLs intactos, pausas, música conservada, foto final y exportación MP4: OK');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
