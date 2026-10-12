import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClientSelectionText, resolveSelection, buildSlidesFromPhotos, parseGoogleDriveLink } from '../src/utils/photoParser.ts';
import { DEFAULT_CONFIG, localPath } from '../src/utils/config.ts';
import { decodeProject, serializeProject, type SavedProject } from '../src/utils/projectStorage.ts';
import { generatePremiereXml, fileUrl } from '../src/utils/premiereXmlGenerator.ts';
import type { PhotoItem } from '../src/types/index.ts';
import { rotateProjectPhotos, updatePhotoFraming, updateProjectConfig } from '../src/utils/projectConfig.ts';
import { reconnectPhotos } from '../src/utils/reconnectPhotos.ts';
import { normalizeFraming, photoGeometry, photoSlots } from '../src/utils/photoFraming.ts';
import { videoOutput } from '../src/utils/videoOutput.ts';
import { normalizeTextStyle, textStyle, textFont, textPlacement } from '../src/utils/textOverlay.ts';
import { photoFileInfo, reconnectPhotoFiles, selectPhotoFiles } from '../src/utils/photoFiles.ts';

test('escenas horizontales dividen dos o tres fotos en columnas y respetan la separación', () => {
  for (const count of [1, 2, 3]) {
    const slots = photoSlots(count, 1920, 1080, 12);
    const slotWidth = (1920 - 12 * (count - 1)) / count;
    assert.deepEqual(slots, Array.from({ length: count }, (_, index) => ({ x: index * (slotWidth + 12), y: 0, width: slotWidth, height: 1080 })));
    assert.equal(slots.at(-1)!.x + slots.at(-1)!.width, 1920);
  }
  assert.deepEqual(photoSlots(3, 1080, 1920, 12), [
    { x: 0, y: 0, width: 1080, height: 632 }, { x: 0, y: 644, width: 1080, height: 632 }, { x: 0, y: 1288, width: 1080, height: 632 },
  ]);
});

test('agrupación horizontal reúne verticales, mantiene orden y deja horizontales individuales', () => {
  const photos = [photo('1.jpg', 'vertical'), photo('2.jpg', 'vertical'), photo('3.jpg', 'vertical'), photo('4.jpg'), photo('5.jpg', 'vertical'), photo('6.jpg', 'vertical')];
  const frame = { width: 1920, height: 1080 };
  for (const mode of ['auto-split-3', 'auto-adaptive'] as const) {
    const slides = buildSlidesFromPhotos(photos, mode, 1.5, frame);
    assert.deepEqual(slides.map(slide => slide.photos.length), [3, 1, 2]);
    assert.deepEqual(slides.flatMap(slide => slide.photos.map(p => p.id)), photos.map(p => p.id));
  }
  assert.deepEqual(buildSlidesFromPhotos(photos, 'auto-split-2', 1.5, frame).map(slide => slide.photos.length), [2, 1, 1, 2]);
  assert.deepEqual(buildSlidesFromPhotos(photos, 'single', 1.5, frame).map(slide => slide.photos.length), [1, 1, 1, 1, 1, 1]);
});

test('cambiar formato conserva escenas y encuadres; reagrupar toma la orientación de edición', () => {
  const original = editedProject();
  const horizontal = updateProjectConfig(original, { ...original.config, width: 1920, height: 1080, aspectRatio: '16:9' });
  assert.equal(horizontal.slides, original.slides); assert.equal(horizontal.library, original.library);
  const library = [photo('1.jpg', 'vertical'), photo('2.jpg', 'vertical'), photo('3.jpg', 'vertical')];
  const project: SavedProject = { ...horizontal, library, slides: buildSlidesFromPhotos(library, 'single', 1.5, horizontal.config), config: { ...horizontal.config, horizontalGrouping: 'single' } };
  const grouped = updateProjectConfig(project, { ...project.config, horizontalGrouping: 'auto-split-3' });
  assert.equal(grouped.slides[0].photos.length, 3);
  const totem = { ...DEFAULT_CONFIG, outputRotation: 90 as const };
  assert.deepEqual(buildSlidesFromPhotos(library, 'auto-split-3', 1.5, totem).map(slide => slide.photos.length), [1, 1, 1]);
});

test('XML horizontal posiciona las tres pistas de izquierda a derecha', () => {
  const config = { ...DEFAULT_CONFIG, width: 1920, height: 1080, aspectRatio: '16:9' as const, splitGapSize: 0 };
  const photos = [1, 2, 3].map(n => ({ ...photo(n + '.jpg', 'vertical'), width: 1080, height: 1920 }));
  const slides = buildSlidesFromPhotos(photos, 'auto-split-3', 1.5, config);
  const xml = generatePremiereXml(slides, config);
  assert.equal((xml.match(/<track>/g) || []).length, 3);
  assert.deepEqual([...xml.matchAll(/<horiz>([^<]+)<\/horiz><vert>([^<]+)<\/vert>/g)].map(match => [Number(match[1]), Number(match[2])]), [[-0.333333, 0], [0, 0], [0.333333, 0]]);
});

test('filtra una carpeta grande por nombres antes de importar y conserva el orden de la lista', () => {
  const files = Array.from({ length: 5000 }, (_, index) => ({ name: `UMMA-${index + 1}.jpg`, webkitRelativePath: `Sesion/UMMA-${index + 1}.jpg` }));
  const selected = selectPhotoFiles(files, parseClientSelectionText('474, 13, 29', options));
  assert.equal(selected.total, 5000);
  assert.deepEqual(selected.files.map(file => file.name), ['UMMA-474.jpg', 'UMMA-13.jpg', 'UMMA-29.jpg']);
  assert.deepEqual(selected.missing, []); assert.deepEqual(selected.ambiguous, []);
  assert.equal(photoFileInfo(selected.files[0]).relativePath, 'UMMA-474.jpg');
});

test('la selección distingue 461, 461b y 474b, incluidos ceros y mayúsculas', () => {
  const files = ['UMMA-461.jpg', 'UMMA-461b.jpg', 'UMMA-474B.jpg'].map(name => ({ name, webkitRelativePath: '' }));
  const selected = selectPhotoFiles(files, parseClientSelectionText('461b, 461, 0474B, 461b', options));
  assert.deepEqual(selected.files.map(file => file.name), ['UMMA-461b.jpg', 'UMMA-461.jpg', 'UMMA-474B.jpg']);
  assert.deepEqual(selected.missing, []);
  const imported = files.map(file => ({ ...photo(file.name), ...photoFileInfo(file) }));
  assert.deepEqual(resolveSelection(parseClientSelectionText('461b, 461, 474b', options), imported).resolved.map(p => p.filename), ['UMMA-461b.jpg', 'UMMA-461.jpg', 'UMMA-474B.jpg']);
});

test('selección de carpeta informa faltantes y ambigüedades sin elegir arbitrariamente', () => {
  const files = ['a/UMMA-13.jpg', 'b/UMMA-13.jpg', 'UMMA-29.jpg'].map(path => ({ name: path.split('/').at(-1)!, webkitRelativePath: 'Sesion/' + path }));
  const selected = selectPhotoFiles(files, parseClientSelectionText('13, 29, 999', options));
  assert.deepEqual(selected.files.map(file => file.name), ['UMMA-29.jpg']);
  assert.deepEqual(selected.ambiguous, ['IMG_013.jpg']); assert.deepEqual(selected.missing, ['IMG_999.jpg']);
  assert.deepEqual(selectPhotoFiles(files, parseClientSelectionText('otro.jpg', options)).missing, ['otro.jpg']);
});

test('reconectar filtra archivos ajenos y conserva duplicados para detectar ambigüedad', () => {
  const files = ['Sesion/a/1.jpg', 'Sesion/b/1.jpg', 'Sesion/2.jpg', 'Sesion/999.jpg', 'Sesion/notas.txt'].map(path => ({ name: path.split('/').at(-1)!, webkitRelativePath: path }));
  const candidates = reconnectPhotoFiles(files, [{ ...photo('1.jpg'), previewUrl: '' }, { ...photo('2.jpg'), previewUrl: '' }]);
  assert.deepEqual(candidates.map(file => file.webkitRelativePath), ['Sesion/a/1.jpg', 'Sesion/b/1.jpg', 'Sesion/2.jpg']);
  const result = reconnectPhotos([{ ...photo('1.jpg'), previewUrl: '' }], candidates.map(file => ({ ...photo(file.name), ...photoFileInfo(file) })), '');
  assert.equal(result.reconnected, 0);
});

test('textos conservan fuentes, tamaño y ubicación independientes sin modificar las fotos', () => {
  const original = editedProject();
  const textStyles = {
    eventTitle: { fontFamily: 'Georgia', size: 96, x: 95, y: 93, align: 'right' as const },
    eventSubtitle: { fontFamily: 'Courier New', size: 38, x: 5, y: 50, align: 'left' as const },
    watermark: { fontFamily: 'Plus Jakarta Sans', size: 22, x: 50, y: 8, align: 'center' as const },
  };
  const changed = updateProjectConfig(original, { ...original.config, textStyles });
  assert.equal(changed.slides, original.slides); assert.equal(changed.library, original.library);
  const restored = decodeProject(serializeProject(changed));
  assert.deepEqual(restored.config.textStyles, textStyles);
  assert.deepEqual(restored.slides[0].photos[0].framing, original.slides[0].photos[0].framing);
});

test('textos de proyectos anteriores mantienen valores predeterminados y fuente heredada', () => {
  const saved = JSON.parse(serializeProject(editedProject()));
  delete saved.config.textStyles; saved.config.fontFamily = 'Georgia';
  const restored = decodeProject(JSON.stringify(saved));
  assert.deepEqual(textStyle(restored.config, 'eventTitle'), { fontFamily: 'Georgia', size: 43, x: 50, y: 8, align: 'center' });
  assert.equal(textStyle(restored.config, 'watermark').y, 93);
  assert.equal(textStyle(restored.config, 'eventSubtitle').size, 29);
});

test('diseño del texto rechaza fuentes y números inválidos en JSON', () => {
  const saved = JSON.parse(serializeProject(editedProject()));
  saved.config.fontFamily = 'unknown';
  saved.config.textStyles = { eventTitle: { fontFamily: 'Arial";bad', size: 999, x: -30, y: 200, align: 'invalid' }, watermark: { size: '72', x: null } };
  const restored = decodeProject(JSON.stringify(saved));
  assert.equal(restored.config.fontFamily, 'Arial');
  assert.deepEqual(textStyle(restored.config, 'eventTitle'), { fontFamily: 'Arial', size: 180, x: 0, y: 100, align: 'center' });
  assert.equal(textStyle(restored.config, 'watermark').size, 29);
  assert.equal(normalizeTextStyle({ size: NaN, y: Infinity }, 'eventSubtitle').y, 11);
});

test('texto respeta márgenes, alineación y escala para vertical, horizontal y tótem', () => {
  for (const [width, height] of [[1080, 1920], [1920, 1080], [1080, 1080]]) {
    for (const align of ['left', 'center', 'right'] as const) {
      for (const x of [0, 50, 100]) {
        const style = normalizeTextStyle({ size: 180, align, x, y: 100 }, 'eventTitle');
        const position = textPlacement(style, width, height, width * 3);
        const left = align === 'left' ? 0 : align === 'center' ? position.maxWidth / 2 : position.maxWidth;
        assert.ok(position.x - left >= width * 0.025 - 0.001);
        assert.ok(position.x + position.maxWidth - left <= width * 0.975 + 0.001);
        assert.ok(position.y < height);
        assert.ok(textFont(style, 'eventTitle', width).includes(Math.round(180 * width / 1080) + 'px'));
      }
    }
  }
});

test('tótem exporta horizontal y mantiene el tamaño vertical de edición', () => {
  for (const rotation of [90, 270] as const) {
    const config = { ...DEFAULT_CONFIG, outputRotation: rotation };
    assert.deepEqual(videoOutput(config), { width: 1920, height: 1080, rotation });
    assert.equal(config.width, 1080); assert.equal(config.height, 1920);
  }
  assert.deepEqual(videoOutput(DEFAULT_CONFIG), { width: 1080, height: 1920, rotation: 0 });
  assert.deepEqual(videoOutput({ width: 1920, height: 1080, outputRotation: 90 }), { width: 1920, height: 1080, rotation: 0 });
});

test('tótem conserva encuadres, giros individuales, escenas y configuración al guardar', () => {
  const original = updatePhotoFraming(editedProject(), 0, 0, { x: 0.2, y: 0.7, zoom: 1.4, rotation: 90 });
  for (const rotation of [90, 270] as const) {
    const changed = updateProjectConfig(original, { ...original.config, outputRotation: rotation });
    assert.equal(changed.slides, original.slides); assert.equal(changed.library, original.library);
    const restored = decodeProject(serializeProject(changed));
    assert.deepEqual(videoOutput(restored.config), { width: 1920, height: 1080, rotation });
    assert.deepEqual(restored.slides[0].photos[0].framing, original.slides[0].photos[0].framing);
    assert.equal(restored.slides[0].duration, 2.3); assert.equal(restored.slides[0].transition, 'fade');
  }
});

test('proyectos anteriores y giros de salida malformados se abren sin girar', () => {
  const saved = JSON.parse(serializeProject(editedProject()));
  for (const rotation of [undefined, -90, 180, '90', null]) {
    saved.config.outputRotation = rotation;
    assert.equal(decodeProject(JSON.stringify(saved)).config.outputRotation, 0);
  }
  saved.config.width = 1920; saved.config.height = 1080; saved.config.outputRotation = 90;
  const restored = decodeProject(JSON.stringify(saved));
  assert.equal(restored.config.outputRotation, 0); assert.equal(restored.config.aspectRatio, '16:9');
});

const options = { localBasePath: 'D:\\Fotos', prefix: 'IMG_', padding: 3, extension: '.jpg', defaultDuration: 1.5 };
const photo = (name: string, orientation: PhotoItem['orientation'] = 'horizontal'): PhotoItem => ({
  id: name.toLowerCase(), filename: name, relativePath: name, number: name.match(/\d+/)?.[0] || name,
  fullLocalPath: localPath(options.localBasePath,name), previewUrl:'blob:test', orientation, width: 2400,height:1600,
  duration:1.5,transition:'dissolve',kenBurns:'zoom-in'
});
test('normaliza posición y zoom sin admitir números inválidos', () => {
  assert.deepEqual(normalizeFraming(undefined), { x: 0.5, y: 0.5, zoom: 1 });
  assert.deepEqual(normalizeFraming({ x: -20, y: 80, zoom: 50 }), { x: 0, y: 1, zoom: 3 });
  assert.deepEqual(normalizeFraming({ x: NaN, y: Infinity, zoom: '2' }), { x: 0.5, y: 0.5, zoom: 1 });
});
test('girar una selección mantiene encuadres, escenas y fotos ajenas', () => {
  const original = editedProject();
  const project = updatePhotoFraming(original, 0, 0, { x: 0.2, y: 0.7, zoom: 1.8 });
  const selected = [project.library[0].id];
  const rotated = rotateProjectPhotos(project, selected, 90);
  assert.deepEqual(rotated.library[0].framing, { x: 0.2, y: 0.7, zoom: 1.8, rotation: 90 });
  assert.equal(rotated.slides[0].photos[0].framing?.rotation, 90);
  assert.equal(rotated.slides[1], project.slides[1]);
  assert.equal(rotated.slides[0].duration, project.slides[0].duration);
  assert.equal(rotated.slides[0].transition, project.slides[0].transition);
  assert.equal(rotateProjectPhotos(project, [], 90), project);
  assert.equal(rotateProjectPhotos(rotated, selected, -90).library[0].framing?.rotation, undefined);
  let all = project;
  for (let i = 0; i < 4; i++) all = rotateProjectPhotos(all, project.library.map(item => item.id), 90);
  assert.deepEqual(all.library[0].framing, project.library[0].framing);
  assert.equal(all.library[1].framing?.rotation, undefined);
});
test('los giros intercambian lados y rellenan el cuadro sin franjas', () => {
  for (const rotation of [0, 90, 180, 270] as const) for (const height of [1920, 956, 634]) {
    const geometry = photoGeometry({ kenBurns: 'static', framing: { x: 0.2, y: 0.8, zoom: 1, rotation } }, 1200, 800, 1080, height, 'cover', 0);
    assert.ok(geometry.width >= 1080 && geometry.height >= height);
    assert.ok(geometry.left <= 0 && geometry.top <= 0);
    assert.ok(geometry.left + geometry.width >= 1080 && geometry.top + geometry.height >= height);
  }
  assert.deepEqual(photoGeometry({ kenBurns: 'static', framing: { x: 0.5, y: 0.5, zoom: 1, rotation: 90 } }, 1200, 800, 1080, 1920, 'contain', 0), { width: 1080, height: 1620, left: 0, top: 150 });
  assert.equal(normalizeFraming({ rotation: 45 }).rotation, undefined);
});
test('el giro se guarda y reconecta sin guardar referencias al original', () => {
  const project = editedProject(); project.library[0].sourceUrl = 'blob:original-secret';
  const rotated = rotateProjectPhotos(project, [project.library[0].id], -90);
  const raw = serializeProject(rotated);
  assert.ok(!raw.includes('blob:original-secret'));
  const restored = decodeProject(raw);
  assert.equal(restored.slides[0].photos[0].framing?.rotation, 270);
  const incoming = { ...photo('sub/1.jpg'), sourceUrl: 'blob:reconnected-original' };
  const result = reconnectPhotos(restored.library, [incoming], 'D:\\Fotos');
  assert.equal(result.connected[0].framing?.rotation, 270);
  assert.equal(result.connected[0].sourceUrl, incoming.sourceUrl);
});
test('el encuadre por defecto conserva la geometría centrada anterior', () => {
  const item = { ...photo('1.jpg'), kenBurns: 'static' as const };
  assert.deepEqual(photoGeometry(item, 1200, 800, 1080, 1920, 'cover', 0), { width: 2880, height: 1920, left: -900, top: 0 });
  assert.deepEqual(photoGeometry(item, 1200, 800, 1080, 1920, 'contain', 0), { width: 1080, height: 720, left: 0, top: 600 });
});
test('mover el recorte a los extremos no deja franjas durante los movimientos', () => {
  for (const kenBurns of ['static', 'zoom-in', 'zoom-out', 'pan-up', 'pan-down'] as const) {
    for (const x of [0, 0.5, 1]) for (const y of [0, 0.5, 1]) for (const zoom of [1, 3]) for (const progress of [0, 0.5, 1]) {
      for (const height of [1920, 956, 634]) {
        const geometry = photoGeometry({ kenBurns, framing: { x, y, zoom } }, 1200, 800, 1080, height, 'cover', progress);
        assert.ok(geometry.left <= 0 && geometry.top <= 0);
        assert.ok(geometry.left + geometry.width >= 1080 - 1e-8);
        assert.ok(geometry.top + geometry.height >= height - 1e-8);
      }
    }
  }
});
test('el encuadre actualiza solo la foto elegida y mantiene escenas y ajustes', () => {
  const library = [photo('1.jpg'), photo('2.jpg')];
  const project: SavedProject = { version: 1, config: DEFAULT_CONFIG, rawText: '1,2', library, slides: buildSlidesFromPhotos(library, 'single', 1.5) };
  const result = updatePhotoFraming(project, 0, 0, { x: 0.2, y: 0.8, zoom: 1.5 });
  assert.deepEqual(result.slides[0].photos[0].framing, { x: 0.2, y: 0.8, zoom: 1.5 });
  assert.equal(result.library[0].framing, result.slides[0].photos[0].framing);
  assert.equal(result.slides[1], project.slides[1]);
  assert.equal(result.library[1], project.library[1]);
  assert.equal(result.config, project.config);
  assert.equal(result.slides[0].duration, project.slides[0].duration);
  assert.equal(project.library[0].framing, undefined);
  assert.equal(updatePhotoFraming(result, 0, 0, { x: 0.2, y: 0.8, zoom: 1.5 }), result);
  assert.equal(updatePhotoFraming(project, 99, 0, { x: 0, y: 0, zoom: 1 }), project);
});
test('guarda y reconecta el encuadre y lo conserva al reagrupar', () => {
  const library = [photo('1.jpg'), photo('2.jpg')];
  const project: SavedProject = { version: 1, config: DEFAULT_CONFIG, rawText: '', library, slides: buildSlidesFromPhotos(library, 'single', 1.5) };
  const framed = updatePhotoFraming(project, 0, 0, { x: 0.1, y: 0.9, zoom: 2 });
  const restored = decodeProject(serializeProject(framed));
  assert.deepEqual(restored.slides[0].photos[0].framing, framed.library[0].framing);
  const connected = reconnectPhotos(restored.library, library, 'D:\\Fotos');
  assert.deepEqual(connected.library[0].framing, framed.library[0].framing);
  const grouped = updateProjectConfig(framed, { ...DEFAULT_CONFIG, horizontalGrouping: 'auto-split-3' });
  assert.deepEqual(grouped.slides[0].photos[0].framing, framed.library[0].framing);
});
test('abre proyectos anteriores centrados y limita encuadres malformados', () => {
  const library = [photo('1.jpg')];
  const project: SavedProject = { version: 1, config: DEFAULT_CONFIG, rawText: '', library, slides: buildSlidesFromPhotos(library, 'single', 1.5) };
  const restored = decodeProject(serializeProject(project));
  assert.equal(restored.library[0].framing, undefined);
  assert.deepEqual(normalizeFraming(restored.slides[0].photos[0].framing), { x: 0.5, y: 0.5, zoom: 1 });
  const modified = JSON.parse(serializeProject(project));
  modified.slides[0].photos[0].framing = { x: -99, y: 99, zoom: null };
  assert.deepEqual(decodeProject(JSON.stringify(modified)).slides[0].photos[0].framing, { x: 0, y: 1, zoom: 1 });
});
test('las fotos apiladas mantienen sus propios límites y separación', () => {
  const slots = photoSlots(3, 1080, 1920, 12);
  assert.deepEqual(slots.map(slot => slot.y), [0, 644, 1288]);
  assert.ok(slots.every(slot => slot.height === 632));
  assert.equal(slots[2].y + slots[2].height, 1920);
});
test('reconecta una carpeta desde archivos individuales sin duplicar ni perder edición', () => {
  const saved = { ...photo('IMG_001.jpg'), id: 'sub/img_001.jpg', relativePath: 'sub/IMG_001.jpg', previewUrl: '', duration: 2.7, kenBurns: 'pan-up' as const };
  const result = reconnectPhotos([saved], [photo('IMG_001.jpg')], options.localBasePath);
  assert.equal(result.library.length, 1);
  assert.equal(result.reconnected, 1);
  assert.deepEqual(result.library[0], { ...saved, fullLocalPath: 'D:\\Fotos\\sub\\IMG_001.jpg', previewUrl: 'blob:test' });
});
test('reconecta IDs antiguos por ruta y conserva el orden de la biblioteca', () => {
  const saved = ['2.jpg', '1.jpg'].map((name, i) => ({ ...photo(name), id: 'legacy-' + i, previewUrl: '' }));
  const result = reconnectPhotos(saved, [photo('1.jpg'), photo('2.jpg')], options.localBasePath);
  assert.deepEqual(result.library.map(p => p.id), ['legacy-0', 'legacy-1']);
  assert.equal(result.reconnected, 2);
  assert.ok(result.library.every(p => p.previewUrl));
});
test('no adivina nombres repetidos en subcarpetas', () => {
  const saved = ['a', 'b'].map(dir => ({ ...photo('1.jpg'), id: dir + '/1.jpg', relativePath: dir + '/1.jpg', previewUrl: '' }));
  const result = reconnectPhotos(saved, [photo('1.jpg')], options.localBasePath);
  assert.equal(result.reconnected, 0);
  assert.equal(result.library.length, 3);
  assert.ok(result.library.slice(0, 2).every(p => !p.previewUrl));
});
test('una ruta exacta permite reconectar nombres repetidos y tiene prioridad', () => {
  const saved = ['a', 'b'].map(dir => ({ ...photo('1.jpg'), id: 'legacy-' + dir, relativePath: dir + '/1.jpg', previewUrl: '' }));
  const incoming = ['b', 'a'].map(dir => ({ ...photo('1.jpg'), id: dir + '/1.jpg', relativePath: dir + '/1.jpg' }));
  const result = reconnectPhotos(saved, incoming, options.localBasePath);
  assert.equal(result.reconnected, 2);
  assert.equal(result.library.length, 2);
  assert.deepEqual(result.library.map(p => p.relativePath), ['a/1.jpg', 'b/1.jpg']);
});
test('no reconecta por nombre si dos archivos nuevos comparten el nombre', () => {
  const saved = { ...photo('1.jpg'), previewUrl: '' };
  const incoming = ['a', 'b'].map(dir => ({ ...photo('1.jpg'), id: dir + '/1.jpg', relativePath: dir + '/1.jpg' }));
  const result = reconnectPhotos([saved], incoming, options.localBasePath);
  assert.equal(result.reconnected, 0);
  assert.equal(result.library[0].previewUrl, '');
});
test('una sesión ya conectada no se reemplaza por otra carpeta con el mismo nombre', () => {
  const saved = { ...photo('1.jpg'), id: 'a/1.jpg', relativePath: 'a/1.jpg' };
  const incoming = { ...photo('1.jpg'), id: 'b/1.jpg', relativePath: 'b/1.jpg', previewUrl: 'blob:new' };
  const result = reconnectPhotos([saved], [incoming], options.localBasePath);
  assert.deepEqual(result.library, [saved, incoming]);
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

