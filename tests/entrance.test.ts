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
const config: SequenceConfig = { ...DEFAULT_CONFIG, width: 1920, height: 1080, aspectRatio: '16:9', fps: 60, entrance: { ...DEFAULT_ENTRANCE, enabled: true, musicStart: 12, musicEnd: 25, beatTimes: [12.5,13,13.5,14,14.5,15,15.5,16,16.5,17,17.5,18,18.5,19,19.5] } };

test('cortes usan segundos absolutos de canción y repiten fuentes sin modificar las escenas', () => {
  assert.equal(sequenceDuration(slides, config), 14);
  assert.equal(sequenceDuration(slides, DEFAULT_CONFIG), 4.5);
  assert.deepEqual(entranceCuts(config.entrance!,60).slice(0,4), [0,30,60,90]);
  assert.equal(entranceScene(slides,config,0.49).index,0);
  assert.equal(entranceScene(slides,config,0.5).index,1);
  assert.equal(entranceScene(slides,config,1).index,2);
  assert.equal(entranceScene(slides,config,1.5).index,0);
  assert.equal(slides.length,3);
  const shifted = {...config.entrance!,beatShift:0.1,everyBeats:2};
  assert.deepEqual(entranceCuts(shifted,60).slice(0,3),[0,36,96]);
});

test('contador 5/10 termina en el segundo elegido y conserva cero un segundo', () => {
  for (const countdown of [5,10] as const) {
    const modified = {...config,entrance:{...config.entrance!,countdown}};
    assert.equal(entranceScene(slides,modified,13-countdown-1/60).countdown,null);
    assert.equal(entranceScene(slides,modified,13-countdown).countdown,countdown);
    assert.equal(entranceScene(slides,modified,12).countdown,1);
    assert.equal(entranceScene(slides,modified,13).countdown,0);
    assert.equal(entranceScene(slides,modified,13.99).countdown,0);
  }
});

test('aceleración discreta muestra cada paso, alcanza una foto por cuadro y no intervalos subfotograma', () => {
  for (const fps of [24,30,60]) for (const seconds of [5,10]) {
    const frames = countdownCuts(seconds,fps), intervals = frames.slice(1).map((frame,i)=>frame-frames[i]);
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

test('entrada rechaza canción desconectada, tramos insuficientes, cortes vacíos y formato equivocado', () => {
  assert.throws(()=>validateEntrance(config,null),/reconectá/);
  assert.throws(()=>validateEntrance(config,20),/duración/);
  assert.throws(()=>validateEntrance({...config,width:1080,height:1920},30),/horizontal/);
  assert.throws(()=>validateEntrance({...config,entrance:{...config.entrance!,musicEnd:14}},30),/al menos/);
  assert.throws(()=>validateEntrance({...config,entrance:{...config.entrance!,beatTimes:[]}},30),/Detectá/);
  assert.doesNotThrow(()=>validateEntrance(config,30));
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
  const restored=decodeProject(raw);assert.equal(restored.config.entrance?.musicStart,12);assert.equal(restored.library[0].clipStart,2);
  const connected=reconnectPhotos(restored.library,[clip],'');assert.equal(connected.connected[0].clipStart,2);
  assert.equal(updateClipStart(project,clip.id,10).library[0].clipStart,3.999);
});
