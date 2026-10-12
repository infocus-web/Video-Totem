import test from 'node:test';
import assert from 'node:assert/strict';
import { musicRange, musicTime, normalizeMusicTrim, setMusicTrim } from '../src/utils/musicTrim.ts';
import { DEFAULT_CONFIG } from '../src/utils/config.ts';
import { DEFAULT_ENTRANCE, entranceCuts, entranceScene, sequenceDuration, validateEntrance } from '../src/utils/entrance.ts';
import { serializeProject, decodeProject, type SavedProject } from '../src/utils/projectStorage.ts';
import { setProjectPhotoMotion } from '../src/utils/projectConfig.ts';
import type { PhotoItem, SequenceSlide } from '../src/types/index.ts';

const photos: PhotoItem[] = [0,1,2].map(i => ({ id: String(i), filename: i+'.jpg', number: String(i), fullLocalPath:i+'.jpg', previewUrl:'', width:1920,height:1080,orientation:'horizontal',duration:2,transition:'none',kenBurns:'static' }));
const slides: SequenceSlide[] = photos.map(p=>({id:p.id,layout:'single',photos:[p],duration:2,transition:'none'}));
const config = {...DEFAULT_CONFIG,width:1920,height:1080,fps:60,entrance:{...DEFAULT_ENTRANCE,enabled:true,musicEnd:50,beatStart:14,beatTimes:[14.5,15,15.5,16,17,18,19,20]}};

test('recortar conserva tiempos de canción y acorta el video sin perder golpes o encuadres', () => {
  const trimmed=setMusicTrim(config,{start:10,end:30},50);
  assert.equal(sequenceDuration(slides,trimmed),20);
  assert.deepEqual(entranceCuts(trimmed.entrance!,60,10,30).slice(0,6),[0,120,240,270,300,330]);
  assert.equal(entranceScene(slides,trimmed,4.5).index,0);
  assert.equal(entranceScene(slides,trimmed,15).countdown,5);
  assert.equal(entranceScene(slides,trimmed,20-1/60).countdown,0);
  assert.doesNotThrow(()=>validateEntrance(trimmed,50));
  assert.deepEqual(trimmed.entrance!.beatTimes,config.entrance.beatTimes);
  const shorter=setMusicTrim(trimmed,{start:24,end:30},50);
  assert.equal(shorter.entrance!.beatStart,24);
  assert.throws(()=>validateEntrance(setMusicTrim(config,{start:10,end:12},50),50),/al menos/);
});

test('música recortada empieza donde corresponde y solo repite dentro de los límites', () => {
  assert.equal(musicTime(0,10,30,false),10);
  assert.equal(musicTime(5,10,30,false),15);
  assert.equal(musicTime(22,10,30,false),30);
  assert.equal(musicTime(22,10,30,true),12);
  assert.deepEqual(musicRange({},50),{start:0,end:50,duration:50});
  assert.deepEqual(musicRange({musicTrim:{start:49,end:80}},50),{start:49,end:50,duration:1});
  assert.deepEqual(normalizeMusicTrim({start:NaN,end:Infinity}),{start:0,end:null});
});

test('el movimiento avanza dentro del corte de Entrada y se reinicia al cambiar de foto', () => {
  const trimmed=setMusicTrim(config,{start:10,end:30},50);
  assert.equal(entranceScene(slides,trimmed,0).progress,0);
  assert.equal(entranceScene(slides,trimmed,1).progress,0.5);
  assert.equal(entranceScene(slides,trimmed,2).progress,0);
  assert.equal(entranceScene(slides,trimmed,4.25).progress,0.5);
});

test('recorte y movimientos por selección sobreviven al JSON y conservan el resto del montaje', () => {
  const project: SavedProject={version:1,rawText:'',config:setMusicTrim(config,{start:10,end:30},50),library:photos,slides};
  const edited=setProjectPhotoMotion(project,['0','2'],'zoom-in');
  assert.deepEqual(edited.library.map(p=>p.kenBurns),['zoom-in','static','zoom-in']);
  assert.deepEqual(edited.slides.map(s=>s.photos[0].kenBurns),['zoom-in','static','zoom-in']);
  const restored=decodeProject(serializeProject(edited));
  assert.deepEqual(restored.config.musicTrim,{start:10,end:30});
  assert.deepEqual(restored.library.map(p=>p.kenBurns),['zoom-in','static','zoom-in']);
  assert.equal(project.slides[0].photos[0].kenBurns,'static');
});
