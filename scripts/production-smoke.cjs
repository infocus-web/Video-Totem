const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
fs.mkdirSync('artifacts',{recursive:true});
let browser;
(async()=>{
  browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{}),args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
  const goToSection = async title => {
    const section = page.locator('.editor-section').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    const id = await section.getAttribute('id');
    await page.getByRole('navigation', { name: 'Accesos a herramientas' }).locator('button[aria-controls="' + id + '"]').click();
  };
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(response.url()+' '+response.status());});
  await page.goto(process.argv[4] || 'http://127.0.0.1:4173',{waitUntil:'networkidle'});
  if (![1,2].every(number => fs.existsSync('artifacts/fixture-' + number + '.jpg'))) {
    const fixtures = await page.evaluate(() => ['#db2777','#4f46e5'].map((color, index) => {
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 800;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0,0,1200,800);
      ctx.fillStyle = 'white'; ctx.font = 'bold 100px sans-serif'; ctx.fillText('FOTO ' + (index + 1),50,200);
      return canvas.toDataURL('image/jpeg').split(',')[1];
    }));
    fixtures.forEach((data, index) => fs.writeFileSync('artifacts/fixture-' + (index + 1) + '.jpg',Buffer.from(data,'base64')));
  }
  await page.getByLabel('Elegir fotos',{exact:true}).setInputFiles([
    {name:'IMG_001.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync('artifacts/fixture-1.jpg')},
    {name:'IMG_002.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync('artifacts/fixture-2.jpg')}
  ]);
  await page.getByText('2 fotos conectadas',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Usar todas las fotos'}).click();
  await goToSection('Composición de escenas');
  await page.getByRole('button',{name:/Individual \(1 foto por escena\)/}).click();
  await page.getByRole('button',{name:'Línea de tiempo',exact:true}).click();
  await page.getByRole('button',{name:'Todas: Wipe',exact:true}).click();
  await page.getByRole('button',{name:'Editor',exact:true}).click();
  await goToSection('Ritmo y estilo');
  await page.getByLabel('Duración de las escenas').press('Home');
  await page.getByLabel('Duración de las escenas').press('ArrowRight');
  const audio=Buffer.alloc(44+22050);
  audio.write('RIFF',0);audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);
  audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);audio.writeUInt32LE(22050,24);audio.writeUInt32LE(44100,28);
  audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(22050,40);
  for(let sample=0;sample<11025;sample++)audio.writeInt16LE(Math.round(Math.sin(sample/22050*440*Math.PI*2)*8000),44+sample*2);
  await goToSection('Música y volumen');
  await page.getByLabel('Cargar música',{exact:true}).setInputFiles({name:'tone.wav',mimeType:'audio/wav',buffer:audio});
  await page.getByText('tone.wav',{exact:true}).waitFor();
  await page.getByRole('button',{name:/Exportar \(/}).click();
  const download=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Grabar y descargar video'}).click()]).then(([value])=>value);
  await download.saveAs('artifacts/production-video.'+download.suggestedFilename().split('.').pop());
  assert.ok(fs.statSync('artifacts/production-video.'+download.suggestedFilename().split('.').pop()).size>1000);
  const videoMetadata = await page.evaluate(async ({base64,mime}) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(base64),character=>character.charCodeAt(0))],{type:mime}));
    video.src=url; video.muted=true; await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=reject;});
    let duration=video.duration;
    if(!Number.isFinite(duration)) {
      const ended=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('El video no terminó')),8000);video.onended=()=>{clearTimeout(timeout);resolve();};});
      await video.play();await ended;duration=video.currentTime;
    }
    const result={width:video.videoWidth,height:video.videoHeight,duration};
    URL.revokeObjectURL(url);return result;
  },{base64:fs.readFileSync('artifacts/production-video.'+download.suggestedFilename().split('.').pop()).toString('base64'),mime:download.suggestedFilename().endsWith('.mp4')?'video/mp4':'video/webm'});
  assert.equal(videoMetadata.width,1080);assert.equal(videoMetadata.height,1920);
  if(Number.isFinite(videoMetadata.duration))assert.ok(Math.abs(videoMetadata.duration-1)<0.2);
  await goToSection('Premiere y Google Drive');
  await page.getByLabel('Ruta de esa carpeta').fill('D:\\Fotos\\Sesion');
  await page.getByRole('button',{name:/Exportar \(/}).click();
  const xml=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Descargar XML de Premiere'}).click()]).then(([value])=>value);
  await xml.saveAs('artifacts/production-sequence.xml');
  await page.getByRole('button',{name:'Cerrar ventana'}).click();
  await page.getByRole('button',{name:'Inspector XML'}).click();
  await page.getByLabel('Archivo XML de Premiere').setInputFiles('artifacts/production-sequence.xml');
  await page.getByRole('button',{name:'Aplicar resolución y FPS al editor'}).waitFor();
  await page.getByRole('button',{name:'Aplicar resolución y FPS al editor'}).click();
  await page.getByText('Se aplicó el formato del XML.').waitFor();
  await page.getByRole('button',{name:'Inspector XML'}).click();
  await page.getByRole('button',{name:'Aplicar resolución y FPS al editor'}).waitFor();
  await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);
  fs.writeFileSync('artifacts/production-report.json',JSON.stringify({status:'passed',customAudio:'tone.wav',transition:'wipe',video:download.suggestedFilename(),videoMetadata,xmlImport:'passed',consoleErrors:errors},null,2));
  console.log('PASS: compiled app, local images, custom WAV audio, modal video download and XML inspector');
  await browser.close();
})().catch(error=>{console.error(error);if(browser)browser.close().finally(()=>process.exit(1));else process.exit(1);});

