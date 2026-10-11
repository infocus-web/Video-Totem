const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
let browser;
(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}), args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.textDraws = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (text.startsWith('TEST_')) {
        window.textDraws.push({ text, x, y, maxWidth, font: this.font, align: this.textAlign });
        if (window.textDraws.length > 300) window.textDraws.splice(0, 200);
      }
      return original.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto(process.argv[4] || 'http://127.0.0.1:4174', { waitUntil: 'networkidle' });
  const fixture = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = 'black'; ctx.fillRect(0, 0, 1080, 1920);
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  const photo = { name: 'TEXT_001.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(fixture, 'base64') };
  const tab = name => page.getByRole('tab', { name, exact: true });
  const range = async (name, value) => page.getByLabel(name, { exact: true }).evaluate((input, value) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(value));
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(photo);
  await page.getByText('1 fotos conectadas', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Usar todas las fotos', exact: true }).click();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).waitFor({ state: 'visible' });
  await tab('Ritmo').click(); await range('Duración de las escenas', 0.5);
  await tab('Textos').click();
  await page.getByLabel('Título', { exact: true }).fill('TEST_TITULO');
  await page.getByLabel('Subtítulo', { exact: true }).fill('TEST_SUB');
  await page.getByLabel('Marca de agua', { exact: true }).fill('TEST_FIRMA');
  for (const font of ['Arial', 'Plus Jakarta Sans', 'Verdana', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Courier New', 'Impact']) {
    await page.getByLabel('Tipografía del texto').selectOption(font);
    await page.waitForFunction(font => window.textDraws.some(draw => draw.text === 'TEST_TITULO' && draw.font.includes(font)), font);
  }
  await page.getByLabel('Tipografía del texto').selectOption('Georgia');
  await page.getByLabel('Tamaño del texto en píxeles').fill('');
  await page.getByLabel('Tamaño del texto en píxeles').pressSequentially('96');
  await page.getByLabel('Tamaño del texto en píxeles').press('Enter');
  await page.getByRole('button', { name: 'Abajo derecha', exact: true }).click();
  await page.getByRole('button', { name: 'Editar subtítulo', exact: true }).click();
  await page.getByLabel('Tipografía del texto').selectOption('Courier New');
  await range('Tamaño del texto', 38);
  await page.getByRole('button', { name: 'Centro izquierda', exact: true }).click();
  await page.getByRole('button', { name: 'Editar marca de agua', exact: true }).click();
  await page.getByLabel('Tipografía del texto').selectOption('Plus Jakarta Sans');
  await range('Tamaño del texto', 22);
  await page.getByRole('button', { name: 'Arriba derecha', exact: true }).click();
  await range('Posición horizontal del texto', 85); await range('Posición vertical del texto', 15);
  await page.getByRole('button', { name: 'Restablecer diseño del texto', exact: true }).click();
  assert.equal(await page.getByLabel('Tamaño del texto en píxeles').inputValue(), '29');
  assert.equal(await page.getByLabel('Posición horizontal del texto').inputValue(), '50');
  assert.equal(await page.getByLabel('Posición vertical del texto').inputValue(), '93');
  assert.equal(await page.getByLabel('Tipografía del texto').inputValue(), 'Arial');
  await page.getByLabel('Tipografía del texto').selectOption('Plus Jakarta Sans'); await range('Tamaño del texto', 22);
  await page.getByRole('button', { name: 'Arriba derecha', exact: true }).click();
  await page.getByRole('button', { name: 'Editar título', exact: true }).click();
  assert.equal(await page.getByLabel('Tipografía del texto').inputValue(), 'Georgia');
  assert.equal(await page.getByLabel('Tamaño del texto en píxeles').inputValue(), '96');
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await page.getByRole('button', { name: 'Pausar', exact: true }).waitFor();
  await range('Tamaño del texto', 97); await range('Tamaño del texto', 96);
  assert.equal(await page.getByRole('button', { name: 'Pausar', exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.waitForFunction(() => {
    const data = JSON.parse(localStorage.getItem('autoreel-project-v1'));
    return data?.config.textStyles?.eventTitle?.size === 96 && data.config.textStyles.watermark.fontFamily === 'Plus Jakarta Sans';
  });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('autoreel-project-v1')));
  assert.equal(saved.config.textStyles.eventSubtitle.size, 38);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByLabel('Elegir fotos', { exact: true }).setInputFiles(photo);
  await tab('Textos').click();
  assert.equal(await page.getByLabel('Tipografía del texto').inputValue(), 'Georgia');
  assert.equal(await page.getByLabel('Tamaño del texto en píxeles').inputValue(), '96');
  await page.waitForFunction(() => window.textDraws.some(draw => draw.text === 'TEST_TITULO' && draw.y > 1100 && draw.align === 'right' && draw.font.includes('64px')));
  await page.screenshot({ path: 'artifacts/text-controls-desktop.png' });
  const readPixels = async () => page.locator('canvas').first().evaluate(canvas => {
    const ctx = canvas.getContext('2d'); const regions = [[600,1700,480,200],[0,880,540,200],[600,60,480,200],[0,0,300,250]];
    const scale = canvas.width / 1080;
    return regions.map(region => { const [x,y,w,h]=region.map(value=>Math.round(value*scale)); const data = ctx.getImageData(x,y,w,h).data; let white = 0; for(let i=0;i<data.length;i+=4) if(data[i]>170&&data[i+1]>170&&data[i+2]>170)white++; return white; });
  });
  const previewPixels = await readPixels();
  assert.ok(previewPixels[0] > 200); assert.ok(previewPixels[1] > 100); assert.ok(previewPixels[2] > 50); assert.equal(previewPixels[3], 0);
  await page.getByRole('button', { name: /Exportar \(/ }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Grabar y descargar video', exact: true }).click()]);
  await download.saveAs('artifacts/text-overlay.mp4');
  const decoded = await page.evaluate(async base64 => {
    const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], {type:'video/mp4'}));
    const video = document.createElement('video'); video.src = url; video.muted = true;
    await new Promise((resolve,reject) => {video.onloadeddata=resolve;video.onerror=reject;});
    video.currentTime=0.1; await new Promise(resolve=>{video.onseeked=resolve;});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const canvas = document.createElement('canvas'); canvas.width=720;canvas.height=1280;
    const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,720,1280);
    const regions=[[600,1700,480,200],[0,880,540,200],[600,60,480,200],[0,0,300,250]];
    const counts=regions.map(region=>{const [x,y,w,h]=region.map(value=>Math.round(value*2/3));const data=ctx.getImageData(x,y,w,h).data;let white=0;for(let i=0;i<data.length;i+=4)if(data[i]>170&&data[i+1]>170&&data[i+2]>170)white++;return white;});
    URL.revokeObjectURL(url);return {width:video.videoWidth,height:video.videoHeight,counts,image:canvas.toDataURL()};
  }, fs.readFileSync('artifacts/text-overlay.mp4').toString('base64'));
  fs.writeFileSync('artifacts/text-overlay-decoded.png',Buffer.from(decoded.image.split(',')[1],'base64'));delete decoded.image;
  assert.equal(decoded.width,1080);assert.equal(decoded.height,1920);
  for(let i=0;i<3;i++)assert.ok(Math.abs(decoded.counts[i]-previewPixels[i])/previewPixels[i]<0.3, JSON.stringify({previewPixels,decoded}));
  assert.equal(decoded.counts[3],0);
  for(const viewport of [{width:1920,height:1080},{width:1280,height:720},{width:390,height:844},{width:320,height:568}]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.locator('.editor-section:visible').count(),1);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(overflow,false);
    await page.getByRole('button',{name:'Centro',exact:true}).click();
    assert.equal(await page.getByLabel('Posición horizontal del texto').inputValue(),'50');
    await page.getByRole('button',{name:'Abajo derecha',exact:true}).click();
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/text-controls-mobile.png'});
  assert.deepEqual(errors,[]);
  fs.writeFileSync('artifacts/text-overlay-report.json',JSON.stringify({fonts:8,previewPixels,decoded,viewports:5,errors},null,2));
  console.log('OK: fuentes, estilos independientes, posición, restablecer, reproducción, persistencia, reconexión y píxeles del MP4.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
