import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ENTRANCE, countdownCuts, entranceCuts, entranceScene, normalizeEntrance, sequenceDuration, validateEntrance } from '../src/utils/entrance.ts';
import { detectBeats } from '../src/utils/beatDetection.ts';
import { DEFAULT_CONFIG } from '../src/utils/config.ts';
import { clipTime } from '../src/utils/clipMedia.ts';
import { updateClipStart } from '../src/utils/projectConfig.ts';
import { serializeProject, decodeProject, type SavedProject } from '../src/utils/projectStorage.ts';
import { reconnectPhotos } from '../src/utils/reconnectPhotos.ts';
import type { PhotoItem, SequenceConfig, SequenceSlide } from '../src/types/index.ts';

const photos: PhotoItem[] = [0,1,2].map(n => ({ id: String(n), number: String(n), filename: n + '.jpg', fullLocalPath: n + '.jpg', previewUrl: 'blob:' + n, width: 1920, height: 1080, orientation: 'horizontal', duration: 1.5, transition: 'none', kenBurns: 'static' }));
const slides: SequenceSlide[] = photos.map(photo => ({ id: photo.id, layout: 'single', photos: [photo], duration: 1.5, transition: 'none' }));
const config: SequenceConfig = { ...DEFAULT_CONFIG, width: 1920, height: 1080, aspectRatio: '16:9', fps: 60, entrance: { ...DEFAULT_ENTRANCE, enabled: true, musicEnd: 25, beatStart: 6, beatTimes: [1,2,3,6.5,7,7.5,8,8.5,9,9.5,10,10.5,11,11.5,12,12.5,13,13.5,14,14.5,15,15.5,16,16.5,17,17.5,18,18.5,19,19.5] } };

test('cortes usan segundos absolutos de canción y repiten fuentes sin modificar las escenas', () => {
  assert.equal(sequenceDuration(slides, config), 25);
  assert.equal(sequenceDuration(slides, DEFAULT_CONFIG), 4.5);
  assert.deepEqual(entranceCuts(config.entrance!,60).slice(0,7), [0,120,240,360,390,420,450]);
  assert.equal(entranceScene(slides,config,1.99).index,0);
  assert.equal(entranceScene(slides,config,2).index,1);
  assert.equal(entranceScene(slides,config,4).index,2);
  assert.equal(entranceScene(slides,config,6).index,0);
  assert.equal(entranceScene(slides,config,6.5).index,1);
  assert.equal(slides.length,3);
  const shifted = {...config.entrance!,beatShift:0.1,everyBeats:2};
  assert.deepEqual(entranceCuts(shifted,60).slice(0,7),[0,120,240,360,396,456,516]);
});

test('contador final 5/10 muestra cero en el último cuadro sin prolongar la canción', () => {
  for (const countdown of [5,10] as const) {
    const modified = {...config,entrance:{...config.entrance!,countdown}};
    assert.equal(entranceScene(slides,modified,25-countdown-1/60).countdown,null);
    assert.equal(entranceScene(slides,modified,25-countdown).countdown,countdown);
    assert.equal(entranceScene(slides,modified,24).countdown,1);
    assert.equal(entranceScene(slides,modified,25-1/60).countdown,0);
    assert.equal(sequenceDuration(slides,modified),25);
  }
});

test('contador elegido antes del final mantiene cambios por cuadro y deja sonar el resto del tema', () => {
  const modified = {...config, entrance:{...config.entrance!,countdownStart:10}};
  assert.equal(entranceScene(slides,modified,10).countdown,5);
  assert.equal(entranceScene(slides,modified,15).countdown,0);
  assert.equal(entranceScene(slides,modified,15.99).countdown,0);
  assert.equal(entranceScene(slides,modified,16).countdown,null);
  assert.equal(entranceScene(slides,modified,16+1/60).index,(entranceScene(slides,modified,16).index+1)%3);
  assert.equal(sequenceDuration(slides,modified),25);
});

test('tema completo admite más de cinco minutos y un último cuadro de duración parcial', () => {
  const modified = {...config, entrance:{...config.entrance!,musicEnd:360.007}};
  assert.equal(sequenceDuration(slides,modified),360.007);
  assert.doesNotThrow(()=>validateEntrance(modified,360.007));
  const last = (Math.ceil(360.007*60)-1)/60;
  assert.equal(entranceScene(slides,modified,last).countdown,0);
  const legacy = normalizeEntrance({ enabled:true,musicStart:12,musicEnd:25 });
  assert.equal(legacy.musicStart,0); assert.equal(legacy.initialDuration,2); assert.equal(legacy.countdownStart,null);
});

test('foto final elegida queda fija desde cero, también dentro de escenas agrupadas y música recortada', () => {
  for (const countdown of [5, 10] as const) for (const fps of [24, 30, 60]) {
    const grouped: SequenceSlide[] = [{ ...slides[0], layout: 'split-3', photos }];
    const modified = { ...config, fps, musicTrim: { start: 2, end: 25 }, entrance: { ...config.entrance!, countdown, countdownStart: 3, beatStart: 3, finalPhotoId: photos[1].id } };
    const zero = 3 + countdown - 2;
    assert.equal(entranceScene(grouped, modified, zero - 1 / fps).finalPhoto, null);
    for (const time of [zero, zero + 0.5, zero + 2, 23 - 1 / fps]) {
      const scene = entranceScene(grouped, modified, time);
      assert.equal(scene.index, 0);
      assert.equal(scene.finalPhoto?.id, photos[1].id);
      assert.equal(scene.progress, 0); assert.equal(scene.elapsed, 0);
      assert.equal(scene.countdown, time < zero + 1 ? 0 : null);
    }
    assert.equal(sequenceDuration(grouped, modified), 23);
  }
});

test('foto final aparece en el último cuadro si el contador termina al final y no admite clips ni fotos ausentes', () => {
  const modified = { ...config, entrance: { ...config.entrance!, finalPhotoId: photos[2].id } };
  assert.equal(entranceScene(slides, modified, 25 - 1 / 60).finalPhoto?.id, photos[2].id);
  assert.equal(entranceScene(slides, modified, 25 - 2 / 60).finalPhoto, null);
  assert.doesNotThrow(() => validateEntrance(modified, 25, slides));
  assert.throws(() => validateEntrance(modified, 25, slides.slice(0, 2)), /foto final/);
  assert.throws(() => validateEntrance(modified, 25, [{ ...slides[2], photos: [{ ...photos[2], mediaType: 'video' }] }]), /foto final/);
});

test('JSON conserva la foto final por identificador y proyectos anteriores siguen sin foto fija', () => {
  const project: SavedProject = { version: 1, rawText: '', library: photos, slides, config: { ...config, entrance: { ...config.entrance!, finalPhotoId: photos[1].id } } };
  const restored = decodeProject(serializeProject(project));
  assert.equal(restored.config.entrance?.finalPhotoId, photos[1].id);
  assert.equal(normalizeEntrance({ finalPhotoId: {} }).finalPhotoId, null);
  assert.equal(normalizeEntrance({}).finalPhotoId, null);
});

test('aceleración discreta muestra cada paso, alcanza una foto por cuadro y no intervalos subfotograma', () => {
  for (const fps of [24,30,60]) for (const seconds of [5,10]) for (const initial of [0.5,2,60]) {
    const frames = countdownCuts(seconds,fps,initial), intervals = frames.slice(1).map((frame,i)=>frame-frames[i]);
    assert.ok(intervals.every(interval=>Number.isInteger(interval)&&interval>=1));
    assert.equal(intervals.at(-1),1);
    assert.ok(intervals.every((value,i)=>!i || value<=intervals[i-1]));
    assert.ok(frames.at(-1)! < seconds*fps);
  }
});

test('detección ubica ataques de bombo con precisión de una ventana y no inventa golpes en silencio', () => {
  const rate=8000,samples=new Float32Array(rate*4),expected=[0.5,1,1.5,2,2.5,3];
  for(const time of expected) for(let i=0;i<rate*0.09;i++) samples[Math.round(time*rate)+i]=Math.sin(i/rate*80*Math.PI*2)*Math.exp(-i/(rate*0.025));
  const beats=detectBeats(samples,rate,0,4);
  assert.equal(beats.length,expected.length);
  beats.forEach((beat,i)=>assert.ok(Math.abs(beat-expected[i])<=0.02));
  assert.deepEqual(detectBeats(new Float32Array(rate),rate,0,1),[]);
});

test('entrada valida canción completa, orden de etapas y cortes dentro del tramo al golpe', () => {
  assert.throws(()=>validateEntrance(config,null),/reconectá/);
  assert.throws(()=>validateEntrance(config,20),/duración/);
  assert.throws(()=>validateEntrance({...config,width:1080,height:1920},30),/horizontal/);
  assert.throws(()=>validateEntrance({...config,entrance:{...config.entrance!,musicEnd:4}},4),/al menos/);
  assert.throws(()=>validateEntrance({...config,entrance:{...config.entrance!,beatTimes:[]}},25),/Detectá/);
  assert.throws(()=>validateEntrance({...config,entrance:{...config.entrance!,beatStart:21}},25),/antes/);
  assert.doesNotThrow(()=>validateEntrance(config,25));
  assert.doesNotThrow(()=>validateEntrance({...config,entrance:{...config.entrance!,beatStart:20,beatTimes:[]}},25));
  assert.doesNotThrow(()=>validateEntrance(DEFAULT_CONFIG,null));
  assert.deepEqual(normalizeEntrance({beatTimes:[1,NaN,'2',1,-1,4000],beatShift:Infinity,everyBeats:0}).beatTimes,[1]);
});

test('clips repiten desde su inicio, guardan recorte y se reconectan sin guardar URLs', () => {
  const clip={...photos[0],filename:'clip.mp4',mediaType:'video' as const,mediaDuration:4,clipStart:1,sourceUrl:'blob:clip'};
  assert.equal(clipTime(clip,0),1); assert.equal(clipTime(clip,2),3); assert.equal(clipTime(clip,3),1);
  const project: SavedProject={version:1,rawText:'',config,library:[clip],slides:[{...slides[0],photos:[clip]}]};
  const edited=updateClipStart(project,clip.id,2);
  assert.equal(edited.slides[0].photos[0].clipStart,2);
  const raw=serializeProject(edited);assert.ok(!raw.includes('blob:'));
  const restored=decodeProject(raw);assert.equal(restored.config.entrance?.musicStart,0);assert.equal(restored.config.entrance?.beatStart,6);assert.equal(restored.library[0].clipStart,2);
  const connected=reconnectPhotos(restored.library,[clip],'');assert.equal(connected.connected[0].clipStart,2);
  assert.equal(updateClipStart(project,clip.id,10).library[0].clipStart,3.999);
});

test('el cero se reemplaza por un destello que arranca justo al terminar el contador', () => {
  const modified = { ...config, entrance: { ...config.entrance!, countdownStart: 10 } };
  assert.equal(entranceScene(slides,modified,14.99).flashTime,null);
  assert.equal(entranceScene(slides,modified,15).flashTime,0);
  assert.ok(Math.abs(entranceScene(slides,modified,15.25).flashTime! - 0.25) < 1e-9);
  assert.equal(entranceScene(slides,modified,16).flashTime,null);
  assert.equal(entranceScene(slides,modified,3).flashTime,null);
});
