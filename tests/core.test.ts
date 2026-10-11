import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClientSelectionText, resolveSelection, buildSlidesFromPhotos, parseGoogleDriveLink } from '../src/utils/photoParser.ts';
import { DEFAULT_CONFIG, localPath } from '../src/utils/config.ts';
import { decodeProject, serializeProject, type SavedProject } from '../src/utils/projectStorage.ts';
import { generatePremiereXml, fileUrl } from '../src/utils/premiereXmlGenerator.ts';
import type { PhotoItem } from '../src/types/index.ts';
import { updateProjectConfig } from '../src/utils/projectConfig.ts';

const options = { localBasePath: 'D:\\Fotos', prefix: 'IMG_', padding: 3, extension: '.jpg', defaultDuration: 1.5 };
const photo = (name: string, orientation: PhotoItem['orientation'] = 'horizontal'): PhotoItem => ({
  id: name.toLowerCase(), filename: name, relativePath: name, number: name.match(/\d+/)?.[0] || name,
  fullLocalPath: localPath(options.localBasePath,name), previewUrl:'blob:test', orientation, width: 2400,height:1600,
  duration:1.5,transition:'dissolve',kenBurns:'zoom-in'
});
test('extrae fotos de un mensaje sin crear archivos con frases', () => {
  const result = parseClientSelectionText('Hola! Queremos estas fotos:\n004, 012\nGracias!',options);
  assert.deepEqual(result.map(item => item.filename),['IMG_004.jpg','IMG_012.jpg']);
  assert.ok(result.every(item => item.previewUrl === ''));
});
test('deduplica números normalizados y nombres', () => {
  assert.deepEqual(parseClientSelectionText('4, 004, IMG_004.jpg',options).map(item => item.filename),['IMG_004.jpg']);
});
test('conserva códigos de cámara y nombres explícitos', () => {
  assert.deepEqual(parseClientSelectionText('DSC_1020, IMG_0045, fiesta.png',options).map(item => item.filename),['DSC_1020.jpg','IMG_0045.jpg','fiesta.png']);
});
test('respeta prefijo vacío, padding y extensión', () => {
  assert.equal(parseClientSelectionText('4',{ ...options,prefix:'',padding:4,extension:'.png' })[0].filename,'0004.png');
});
test('expande rangos en orden y rechaza rangos peligrosos', () => {
  assert.deepEqual(parseClientSelectionText('10-12',options).map(item => item.number),['010','011','012']);
  assert.throws(() => parseClientSelectionText('1-1000000',options));
  assert.throws(() => parseClientSelectionText('12-10',options));
});
test('resuelve nombres reales y reporta faltantes sin inventar imágenes', () => {
  const result = resolveSelection(parseClientSelectionText('4, 12',options),[photo('DSC_0004.jpg')]);
  assert.equal(result.resolved[0].filename,'DSC_0004.jpg');
  assert.deepEqual(result.missing,['IMG_012.jpg']);
});
test('un nombre explícito no se reemplaza por otro prefijo', () => {
  const result = resolveSelection(parseClientSelectionText('DSC_004.jpg',options),[photo('IMG_004.jpg')]);
  assert.equal(result.resolved.length,0); assert.deepEqual(result.missing,['DSC_004.jpg']);
});
test('detecta coincidencias ambiguas', () => {
  const result = resolveSelection(parseClientSelectionText('4',options),[photo('DSC_004.jpg'),photo('PXL_004.jpg')]);
  assert.deepEqual(result.ambiguous,['IMG_004.jpg']); assert.equal(result.resolved.length,0);
});
test('agrupa horizontales sin consumir verticales ni perder fotos', () => {
  const photos = [photo('1.jpg'),photo('2.jpg'),photo('3.jpg','vertical'),photo('4.jpg'),photo('5.jpg'),photo('6.jpg')];
  const slides = buildSlidesFromPhotos(photos,'auto-split-3',1.5);
  assert.deepEqual(slides.map(item => item.photos.length),[2,1,3]);
  assert.deepEqual(slides.flatMap(item => item.photos.map(p => p.id)),photos.map(p => p.id));
});
test('no multiplica la duración de escenas agrupadas', () => {
  const slides = buildSlidesFromPhotos([photo('1.jpg'),photo('2.jpg')],'auto-split-2',1.5);
  assert.equal(slides[0].duration,1.5);
});
test('Drive valida el host exacto y el identificador', () => {
  assert.equal(parseGoogleDriveLink('https://drive.google.com/drive/folders/abc_123').isValid,true);
  assert.equal(parseGoogleDriveLink('https://drive.google.com.attacker.test/drive/folders/abc').isValid,false);
  assert.equal(parseGoogleDriveLink('https://drive.google.com/').isValid,false);
});
test('rutas locales conservan subcarpetas', () => {
  assert.equal(localPath('D:\\Fotos\\','sub/IMG_004.jpg'),'D:\\Fotos\\sub\\IMG_004.jpg');
  assert.equal(localPath('/Users/persona/Fotos','sub/IMG_004.jpg'),'/Users/persona/Fotos/sub/IMG_004.jpg');
});
test('URL de archivo codifica espacios y símbolos reservados', () => {
  assert.equal(fileUrl('D:\\Fotos\\Ana & José #1.jpg'),'file://localhost/D:/Fotos/Ana%20%26%20Jos%C3%A9%20%231.jpg');
  assert.equal(fileUrl('\\\\servidor\\sesion\\foto.jpg'),'file://servidor/sesion/foto.jpg');
  assert.throws(() => fileUrl('foto.jpg'));
});
test('XML tiene pistas simultáneas, tiempos y dimensiones originales', () => {
  const slides = buildSlidesFromPhotos([photo('1.jpg'),photo('2.jpg')],'auto-split-2',1.5);
  const xml = generatePremiereXml(slides,{ ...DEFAULT_CONFIG,localBasePath:'D:\\Fotos' });
  assert.equal((xml.match(/<track>/g)||[]).length,2);
  assert.equal((xml.match(/<start>0<\/start>/g)||[]).length,2);
  assert.ok(xml.includes('<duration>45</duration>'));
  assert.ok(xml.includes('<width>2400</width>'));
});
test('proyecto se guarda sin URLs efímeras y mantiene edición', () => {
  const library = [photo('1.jpg'),photo('2.jpg')];
  const slides = buildSlidesFromPhotos(library,'single',1.5);
  slides.reverse(); slides[0].duration=2.3; slides[0].transition='pan';
  const project: SavedProject = { version:1,config:DEFAULT_CONFIG,rawText:'1,2',library,slides };
  const serialized = serializeProject(project), restored=decodeProject(serialized);
  assert.ok(!serialized.includes('blob:test'));
  assert.equal(restored.slides[0].photos[0].filename,'2.jpg');
  assert.equal(restored.slides[0].duration,2.3); assert.equal(restored.slides[0].transition,'pan');
});
test('rechaza proyectos con escenas o rutas incoherentes', () => {
  const library=[photo('1.jpg')], slides=buildSlidesFromPhotos(library,'single',1.5);
  const project={ version:1,config:DEFAULT_CONFIG,rawText:'',library,slides };
  assert.throws(() => decodeProject(JSON.stringify({ ...project,version:2 })));
  assert.throws(() => decodeProject(JSON.stringify({ ...project,library:[{ ...library[0],relativePath:'../escape.jpg' }] })));
  assert.throws(() => decodeProject(JSON.stringify({ ...project,slides:[{ ...slides[0],layout:'split-3' }] })));
});

test('reabre proyectos con Fade y Wipe y conserva transiciones al reagrupar', () => {
  const library = [photo('1.jpg'), photo('2.jpg'), photo('3.jpg')];
  const slides = buildSlidesFromPhotos(library, 'single', 1.5);
  slides[0].transition = 'wipe'; slides[1].transition = 'fade';
  const restored = decodeProject(serializeProject({ version: 1, config: { ...DEFAULT_CONFIG, defaultTransition: 'wipe' }, rawText: '', library, slides }));
  assert.equal(restored.config.defaultTransition, 'wipe');
  assert.deepEqual(restored.slides.map(slide => slide.transition), ['wipe', 'fade', 'dissolve']);
  const regrouped = buildSlidesFromPhotos(restored.slides.flatMap(slide => slide.photos.map(item => ({ ...item, transition: slide.transition }))), 'auto-split-2', 1.5);
  assert.equal(regrouped[0].transition, 'wipe');
  assert.deepEqual(regrouped.flatMap(slide => slide.photos.map(item => item.filename)), library.map(item => item.filename));
});

test('conserva el recorte y abre proyectos anteriores con la foto completa', () => {
  const library = [photo('1.jpg')], slides = buildSlidesFromPhotos(library, 'single', 1.5);
  const project: SavedProject = { version: 1, config: { ...DEFAULT_CONFIG, photoFit: 'cover' }, rawText: '', library, slides };
  assert.equal(decodeProject(serializeProject(project)).config.photoFit, 'cover');
  const older = JSON.parse(serializeProject(project)); delete older.config.photoFit;
  assert.equal(decodeProject(JSON.stringify(older)).config.photoFit, 'contain');
  older.config.photoFit = 'stretch';
  assert.equal(decodeProject(JSON.stringify(older)).config.photoFit, 'contain');
});

function editedProject(): SavedProject {
  const library = [photo('sub/1.jpg'), photo('sub/2.jpg')];
  const config = { ...DEFAULT_CONFIG, horizontalGrouping: 'single' as const };
  const slides = buildSlidesFromPhotos(library, 'single', 1.5);
  slides[0].duration = 2.3; slides[0].transition = 'fade';
  return { version: 1, config, rawText: '', library, slides };
}

test('cambiar textos o encuadre conserva las fotos y las ediciones del montaje', () => {
  const project = editedProject();
  const changed = updateProjectConfig(project, { ...project.config, eventTitle: 'Nueva boda', photoFit: 'cover' });
  assert.equal(changed.library, project.library);
  assert.equal(changed.slides, project.slides);
  assert.equal(changed.slides[0].duration, 2.3);
  assert.equal(changed.slides[0].transition, 'fade');
  assert.equal(changed.config.photoFit, 'cover');
  assert.equal(updateProjectConfig(project, { ...project.config }), project);
});

test('cambiar duración actualiza escenas sin reconstruir ni perder las fotos', () => {
  const project = editedProject();
  const changed = updateProjectConfig(project, { ...project.config, defaultDuration: 3 });
  assert.deepEqual(changed.slides.map(slide => slide.duration), [3, 3]);
  assert.equal(changed.library, project.library);
  assert.equal(changed.slides[0].photos, project.slides[0].photos);
  assert.equal(changed.slides[0].transition, 'fade');
});

test('cambiar la ruta actualiza originales y escenas conservando subcarpetas', () => {
  const project = editedProject();
  const changed = updateProjectConfig(project, { ...project.config, localBasePath: 'E:\\Sesiones' });
  assert.equal(changed.library[0].fullLocalPath, 'E:\\Sesiones\\sub\\1.jpg');
  assert.equal(changed.slides[0].photos[0].fullLocalPath, changed.library[0].fullLocalPath);
  assert.equal(changed.slides[0].duration, 2.3);
  assert.equal(changed.slides[0].photos[0].previewUrl, project.slides[0].photos[0].previewUrl);
});

test('cambiar agrupación mantiene el orden y las ediciones de la primera foto', () => {
  const project = editedProject();
  const changed = updateProjectConfig(project, { ...project.config, horizontalGrouping: 'auto-split-2' });
  assert.equal(changed.slides.length, 1);
  assert.deepEqual(changed.slides[0].photos.map(item => item.id), project.library.map(item => item.id));
  assert.equal(changed.slides[0].duration, 2.3);
  assert.equal(changed.slides[0].transition, 'fade');
  assert.equal(changed.slides[0].photos[0].kenBurns, 'zoom-in');
});

