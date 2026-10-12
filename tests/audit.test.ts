import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { DEFAULT_CONFIG } from '../src/utils/config.ts';
import { photoSlots } from '../src/utils/photoFraming.ts';
import { parseClientSelectionText, buildSlidesFromPhotos } from '../src/utils/photoParser.ts';
import { decodeProject, serializeProject, type SavedProject } from '../src/utils/projectStorage.ts';
import { loadImages } from '../src/utils/canvasRenderer.ts';
const { canCheck, canRequest } = createRequire(import.meta.url)('../electron/permissions.cjs');

test('una carga fallida detiene nuevos trabajos y libera todas las imágenes ya iniciadas', async () => {
  const started: { src: string }[] = [];
  const original = globalThis.Image;
  class TestImage {
    src = '';
    constructor() { started.push(this); }
    async decode() {
      if (this.src === 'bad') throw new Error('archivo inválido');
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    removeAttribute() { this.src = ''; }
  }
  globalThis.Image = TestImage as unknown as typeof Image;
  try {
    const library = parseClientSelectionText('1-10', { localBasePath: '', prefix: 'IMG_', padding: 3, extension: '.jpg', defaultDuration: 1.5 });
    library.forEach((photo, index) => { photo.previewUrl = index ? 'good' : 'bad'; });
    await assert.rejects(loadImages(buildSlidesFromPhotos(library, 'single', 1.5), new AbortController().signal), /inválido/);
    assert.ok(started.length <= 4);
    assert.ok(started.every(image => !image.src));
  } finally { globalThis.Image = original; }
});

test('una resolución pequeña con separación grande conserva cajones positivos dentro del cuadro', () => {
  for (const [width, height] of [[128, 128], [256, 128], [128, 256]]) {
    for (const gap of [-10, 80, Infinity, NaN]) {
      const slots = photoSlots(3, width, height, gap);
      for (const slot of slots) {
        assert.ok(slot.width >= 1 && slot.height >= 1);
        assert.ok(slot.x >= 0 && slot.y >= 0);
        assert.ok(slot.x + slot.width <= width + 1e-8 && slot.y + slot.height <= height + 1e-8);
      }
    }
  }
});

test('un JSON no puede asociar a una escena otro archivo con el mismo identificador', () => {
  const library = parseClientSelectionText('1', { localBasePath: '', prefix: 'IMG_', padding: 3, extension: '.jpg', defaultDuration: 1.5 });
  const project: SavedProject = { version: 1, rawText: '', config: DEFAULT_CONFIG, library, slides: buildSlidesFromPhotos(library, 'single', 1.5) };
  for (const changed of [{ filename: 'OTRA.jpg' }, { relativePath: 'otra/IMG_001.jpg' }, { mediaType: 'video', mediaDuration: 3 }]) {
    const data = JSON.parse(serializeProject(project));
    Object.assign(data.slides[0].photos[0], changed);
    assert.throws(() => decodeProject(JSON.stringify(data)), /archivo diferente/);
  }
  assert.equal(decodeProject(serializeProject(project)).slides[0].photos[0].filename, 'IMG_001.jpg');
});

test('un JSON limita el inicio de un clip a su duración y descarta valores no finitos', () => {
  const library = parseClientSelectionText('1', { localBasePath: '', prefix: 'IMG_', padding: 3, extension: '.jpg', defaultDuration: 1.5 });
  const data = { version: 1, rawText: '', config: DEFAULT_CONFIG, library, slides: [] };
  for (const [duration, start, expectedDuration, expectedStart] of [[5, 99, 5, 4.999], ['Infinity', 'Infinity', 1, 0], [-10, -4, 0.01, 0]]) {
    Object.assign(library[0], { mediaType: 'video', mediaDuration: duration, clipStart: start });
    const photo = decodeProject(JSON.stringify(data)).library[0];
    assert.equal(photo.mediaDuration, expectedDuration);
    assert.equal(photo.clipStart, expectedStart);
  }
});

test('el escritorio permite archivos del origen de la app aunque Chromium no marque el marco principal', () => {
  const contents = { getURL: () => 'autoreel://studio/', isDestroyed: () => false };
  assert.equal(canRequest(contents, 'fileSystem', { requestingUrl: 'autoreel://studio/', isMainFrame: false }), true);
  assert.equal(canCheck(contents, 'fileSystem', 'autoreel://studio'), true);
  assert.equal(canRequest(contents, 'clipboard-read', { requestingUrl: 'autoreel://studio/', isMainFrame: false }), false);
  assert.equal(canRequest(contents, 'media', { requestingUrl: 'autoreel://studio/', isMainFrame: true }), false);
  assert.equal(canRequest(contents, 'fileSystem', { requestingUrl: 'https://example.com/', isMainFrame: true }), false);
  assert.equal(canRequest(null, 'fileSystem', { requestingUrl: 'autoreel://studio/', isMainFrame: false }), false);
  assert.equal(canCheck({ ...contents, isDestroyed: () => true }, 'fileSystem', 'autoreel://studio'), false);
});
