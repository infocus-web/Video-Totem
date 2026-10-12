const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
let context;
const setup = async () => {
  context = await chromium.launchPersistentContext('artifacts/local-links-chrome', { headless: true, executablePath: process.argv[3], viewport: { width: 1600, height: 1000 }, acceptDownloads: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  await context.addInitScript(() => {
    window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('originales');
    window.showOpenFilePicker = async options => {
      const root = await navigator.storage.getDirectory();
      return options.id === 'autoreel-music' ? [await root.getFileHandle('tema.wav')] : [await (await root.getDirectoryHandle('originales')).getFileHandle('IMG_001.jpg')];
    };
    const query = FileSystemFileHandle.prototype.queryPermission;
    FileSystemFileHandle.prototype.queryPermission = function(options) { return localStorage.getItem('test-permission') === 'denied' ? Promise.resolve('prompt') : query.call(this,options); };
    const request = FileSystemFileHandle.prototype.requestPermission;
    FileSystemFileHandle.prototype.requestPermission = function(options) { localStorage.removeItem('test-permission'); return request.call(this,options); };
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto(process.argv[4] || 'http://127.0.0.1:4176/', { waitUntil: 'networkidle' });
  return page;
};
(async () => {
  let page = await setup(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async clip => {
    localStorage.clear();
    const root = await navigator.storage.getDirectory(), dir = await root.getDirectoryHandle('originales',{create:true});
    const write = async (handle,data) => {const stream=await handle.createWritable();await stream.write(data);await stream.close();};
    for (let i=1;i<=3;i++) {
      const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');ctx.fillStyle=['#f00','#0f0','#00f'][i-1];ctx.fillRect(0,0,640,480);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg'));await write(await dir.getFileHandle(`IMG_00${i}.jpg`,{create:true}),blob);
    }
    await write(await dir.getFileHandle('clip.mp4',{create:true}),Uint8Array.from(atob(clip),c=>c.charCodeAt(0)));
    const rate=22050,duration=60,buffer=new ArrayBuffer(44+rate*duration*2),view=new DataView(buffer),bytes=new Uint8Array(buffer);
    const text=(offset,s)=>{for(let i=0;i<s.length;i++)bytes[offset+i]=s.charCodeAt(i);};
    text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,buffer.byteLength-44,true);
    for(let i=0;i<rate*duration;i++)view.setInt16(44+i*2,Math.round(Math.sin(i/rate*440*Math.PI*2)*8000),true);
    await write(await root.getFileHandle('tema.wav',{create:true}),buffer);
  },fs.readFileSync('artifacts/fixture-clip.mp4').toString('base64'));
  await page.reload({waitUntil:'networkidle'});
  await page.getByLabel('Selección del cliente').fill('IMG_001.jpg, clip.mp4');
  await page.getByRole('button',{name:'Elegir carpeta y recordar ubicación',exact:true}).click();
  await page.getByText('2 fotos conectadas',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'Encuadre',exact:true}).click();
  await page.getByLabel('Aplicar giro a').selectOption('all');await page.getByRole('button',{name:'↷ Girar 90° a la derecha',exact:true}).click();
  await page.getByRole('button',{name:'Movimiento: Alejar',exact:true}).click();
  await page.getByRole('tab',{name:'Música',exact:true}).click();await page.getByRole('button',{name:'Cargar música y recordar ubicación',exact:true}).click();await page.getByText('tema.wav',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'Entrada',exact:true}).click();await page.getByLabel('Activar entrada de quince').check();
  await page.getByLabel('Escucha automática al mover').uncheck();await page.getByLabel('Inicio de música en segundos').fill('2');await page.getByLabel('Final de música en segundos').fill('55');await page.getByLabel('Inicio del contador',{exact:true}).fill('40');
  await page.waitForTimeout(800);
  const expected=await page.evaluate(()=>JSON.parse(localStorage.getItem('autoreel-project-v1')));
  const links=await page.evaluate(id=>new Promise((resolve,reject)=>{const r=indexedDB.open('autoreel-local-links');r.onsuccess=()=>{const db=r.result,q=db.transaction('projects').objectStore('projects').get(id);q.onsuccess=()=>{resolve({photos:q.result.photos.map(p=>({id:p.id,path:p.path,handle:p.handle instanceof FileSystemFileHandle})),music:q.result.music.handle instanceof FileSystemFileHandle,keys:Object.keys(q.result)});db.close();};q.onerror=()=>reject(q.error);};}),expected.localLinkId);
  assert.equal(links.photos.length,2,'Solo recuerda la selección');assert.ok(links.photos.every(p=>p.handle));assert.equal(links.music,true);assert.deepEqual(links.keys.sort(),['music','photos']);
  assert.ok(expected.library.every(p=>!p.previewUrl&&!p.sourceUrl));
  await context.close();context=null;page=await setup();page.on('pageerror',e=>errors.push(e.message));
  await page.getByText('2 fotos conectadas',{exact:true}).waitFor();await page.getByRole('tab',{name:'Entrada',exact:true}).click();await page.getByText('tema.wav · 60.0s',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Inicio del contador',{exact:true}).inputValue(),'40');assert.equal(await page.getByLabel('Inicio de música en segundos').inputValue(),'2');
  await page.waitForTimeout(800);const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('autoreel-project-v1')));
  assert.deepEqual(restored.slides,expected.slides);assert.deepEqual(restored.config,expected.config);assert.equal(restored.localLinkId,expected.localLinkId);
  assert.ok(restored.library.every(p=>p.framing.rotation===90&&p.kenBurns==='zoom-out'));
  const download=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Guardar proyecto JSON',exact:true}).click()]).then(([d])=>d);await download.saveAs('artifacts/local-links-project.json');
  await page.getByRole('button',{name:'Nuevo proyecto',exact:true}).click();await page.getByLabel('Nombre del nuevo proyecto').fill('Otro proyecto');await page.getByRole('button',{name:'Crear proyecto',exact:true}).click();await page.getByText('0 fotos conectadas',{exact:true}).waitFor();
  await page.getByLabel('Abrir proyecto',{exact:true}).setInputFiles('artifacts/local-links-project.json');await page.getByText('2 fotos conectadas',{exact:true}).waitFor();await page.getByRole('tab',{name:'Música',exact:true}).click();await page.getByText('tema.wav',{exact:true}).waitFor();
  await page.evaluate(()=>localStorage.setItem('test-permission','denied'));await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Reconectar originales',exact:true}).waitFor();await page.getByRole('button',{name:'Reconectar originales',exact:true}).click();await page.getByText('2 fotos conectadas',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'Música',exact:true}).click();await page.getByText('tema.wav',{exact:true}).waitFor();await page.getByRole('button',{name:'Quitar música cargada',exact:true}).click();await page.waitForTimeout(800);
  await page.reload({waitUntil:'networkidle'});await page.getByText('2 fotos conectadas',{exact:true}).waitFor();await page.getByRole('tab',{name:'Música',exact:true}).click();assert.equal(await page.getByText('tema.wav',{exact:true}).count(),0,'Quitar no reconecta música vieja');
  await page.evaluate(async()=>{const dir=await(await navigator.storage.getDirectory()).getDirectoryHandle('originales');await dir.removeEntry('IMG_001.jpg');});await page.reload({waitUntil:'networkidle'});await page.getByText(/No se encontraron los originales vinculados: IMG_001.jpg/).waitFor();await page.getByText('1 fotos conectadas',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Nuevo proyecto',exact:true}).click();await page.getByLabel('Nombre del nuevo proyecto').fill('Sin originales anteriores');await page.getByRole('button',{name:'Crear proyecto',exact:true}).click();await page.waitForTimeout(800);await page.reload({waitUntil:'networkidle'});await page.getByText('0 fotos conectadas',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);console.log('Handles reales en IndexedDB, selección, fotos/clips/audio tras reiniciar Chrome, edición, permisos simulados, faltantes y proyecto nuevo: OK');
})().catch(async error=>{console.error(error);const page=context?.pages()[0];if(page){await page.screenshot({path:'artifacts/local-links-failure.png'});console.error(await page.locator('[role="tab"][aria-selected="true"]').allTextContents());}process.exitCode=1;}).finally(async()=>context?.close());
