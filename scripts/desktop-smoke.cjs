const { _electron } = require(process.argv[2] || 'playwright');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
let application;
const profile = path.resolve('artifacts/desktop-smoke-profile');
const executable = path.resolve(process.argv[3] || 'release/win-unpacked/AutoReel Studio.exe');
const launch = async () => {
  const env = { ...process.env, AUTOREEL_TEST_DATA: profile }; delete env.ELECTRON_RUN_AS_NODE;
  application = await _electron.launch({ executablePath: executable, env });
  const page = await application.firstWindow(); await page.waitForLoadState('networkidle');
  // La ventana de QA está oculta: simular sus frames evita mostrar ventanas de prueba al usuario.
  await page.evaluate(() => {
    window.requestAnimationFrame = callback => window.setTimeout(() => callback(performance.now()), 1000 / 60);
    window.cancelAnimationFrame = id => window.clearTimeout(id);
  });
  return page;
};
(async () => {
  let page = await launch(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  const status = await page.evaluate(() => ({ secure: isSecureContext, node: typeof require, picker: typeof showOpenFilePicker, save: typeof showSaveFilePicker, origin: location.href }));
  assert.deepEqual(status, { secure: true, node: 'undefined', picker: 'function', save: 'function', origin: 'autoreel://studio/' });
  await page.evaluate(async () => {
    localStorage.clear();
    const root = await navigator.storage.getDirectory(), directory = await root.getDirectoryHandle('prueba', { create: true });
    const write = async (name, data, target = directory) => { const handle = await target.getFileHandle(name, { create: true }); const stream = await handle.createWritable(); await stream.write(data); await stream.close(); return handle; };
    for (const [index, color] of ['#ff0000', '#00ff00', '#0000ff'].entries()) {
      const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 540;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 960, 540);
      await write(`IMG_00${index + 1}.jpg`, await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg')));
    }
    const rate = 22050, seconds = 12, bytes = new ArrayBuffer(44 + rate * seconds * 2), view = new DataView(bytes);
    const word = (at, text) => [...text].forEach((letter, index) => view.setUint8(at + index, letter.charCodeAt(0)));
    word(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); word(8, 'WAVEfmt '); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); word(36, 'data'); view.setUint32(40, bytes.byteLength - 44, true);
    for (let i = 0; i < rate * seconds; i++) view.setInt16(44 + i * 2, Math.round(Math.sin(i / rate * Math.PI * 880) * 6000), true);
    await write('tema.wav', bytes, root);
    window.showDirectoryPicker = async () => directory;
    window.showOpenFilePicker = async () => [await root.getFileHandle('tema.wav')];
  });
  await page.getByRole('button', { name: 'Elegir carpeta y recordar ubicación', exact: true }).click();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).waitFor();
  const tab = name => page.getByRole('tab', { name, exact: true }).click();
  await tab('Escenas'); await page.getByRole('button', { name: 'Individual (1 foto por escena)', exact: true }).click();
  await tab('Entrada'); await page.getByLabel('Activar entrada de quince').check();
  await page.getByRole('button', { name: 'Cargar canción de entrada y recordar ubicación', exact: true }).click();
  await page.getByText('tema.wav · 12.0s', { exact: true }).waitFor();
  await page.getByLabel('Golpes desde segundo').fill('4');
  await page.getByLabel('Tiempos de los cortes').fill('4, 5, 6');
  await page.getByRole('button', { name: 'Aplicar tiempos de cortes', exact: true }).click();
  await page.getByLabel('Inicio del contador', { exact: true }).fill('7');
  await page.getByLabel('Escucha automática al mover').uncheck();
  await page.getByLabel('Posición de escucha de la canción').fill('7.2');
  await page.getByRole('button', { name: 'Escuchar selección de música', exact: true }).click();
  await page.getByRole('button', { name: 'Detener escucha de música', exact: true }).waitFor();
  await page.waitForTimeout(450);
  assert.ok(Number(await page.getByLabel('Posición del video', { exact: true }).inputValue()) > 7.3, 'La vista previa sigue el audio en Electron');
  await page.getByRole('button', { name: 'Detener escucha de música', exact: true }).click();
  await page.waitForTimeout(700); await application.close();
  page = await launch(); page.on('pageerror', error => errors.push(error.message));
  await tab('Entrada'); await page.getByText('tema.wav · 12.0s', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Inicio del contador', { exact: true }).inputValue(), '7');
  const exportPath = path.resolve('artifacts/desktop-entrada.mp4');
  await application.evaluate(({ session }, output) => {
    global.testDownload = null;
    session.defaultSession.on('will-download', (_event, item) => { item.setSavePath(output); item.on('done', (_event, state) => { global.testDownload = state; }); });
  }, exportPath);
  await page.getByRole('button', { name: /Exportar \(/ }).click();
  await page.getByRole('button', { name: 'Grabar y descargar video', exact: true }).click();
  for (let i = 0; i < 180 && await application.evaluate(() => global.testDownload) === null; i++) await page.waitForTimeout(500);
  assert.equal(await application.evaluate(() => global.testDownload), 'completed');
  assert.ok(fs.statSync(exportPath).size > 10000);
  const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', exportPath], { encoding: 'utf8' }));
  const video = metadata.streams.find(stream => stream.codec_type === 'video');
  assert.equal(video.codec_name, 'h264'); assert.equal(video.width, 1920); assert.equal(video.height, 1080);
  assert.ok(Math.abs(Number(metadata.format.duration) - 12) < 0.05);
  await page.screenshot({ path: 'artifacts/desktop-window.png' });
  assert.deepEqual(errors, []);
  console.log('EXE empaquetado: recursos offline, sandbox, fotos/audio, sincronización, recuperación al reiniciar y MP4 H.264 1920×1080: OK');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await application?.close(); });
