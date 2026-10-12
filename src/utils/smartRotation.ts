import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import simdLoader from '../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js?url';
import simdBinary from '../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm?url';
import plainLoader from '../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.js?url';
import plainBinary from '../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm?url';
import type { FilePreparationProgress, PhotoItem } from '../types';
import { chooseFaceOrientation, uprightFaceScore, type OrientationCandidate, type QuarterTurn } from './faceOrientation';

export interface SmartRotationResult { rotations: Record<string, QuarterTurn>; skipped: string[] }
const turns: QuarterTurn[] = [0, 90, 180, 270];
const yieldToBrowser = () => new Promise<void>(resolve => window.setTimeout(resolve, 0));

export async function smartRotatePhotos(photos: PhotoItem[], signal: AbortSignal,
  onProgress: (progress: FilePreparationProgress) => void): Promise<SmartRotationResult> {
  signal.throwIfAborted();
  const simd = await FilesetResolver.isSimdSupported();
  const detector = await FaceDetector.createFromOptions({
    wasmLoaderPath: simd ? simdLoader : plainLoader, wasmBinaryPath: simd ? simdBinary : plainBinary,
  }, {
    baseOptions: { modelAssetPath: new URL('models/blaze-face-short-range.tflite', document.baseURI).href, delegate: 'CPU' },
    runningMode: 'IMAGE', minDetectionConfidence: 0.85,
  });
  const canvas = document.createElement('canvas'), crop = document.createElement('canvas');
  const context = canvas.getContext('2d'), cropContext = crop.getContext('2d');
  const result: SmartRotationResult = { rotations: {}, skipped: [] };
  try {
    if (!context || !cropContext) throw new Error('Canvas 2D no disponible.');
    for (const [index, photo] of photos.entries()) {
      signal.throwIfAborted();
      const image = new Image();
      try {
        if (!photo.previewUrl) { result.skipped.push(photo.filename); continue; }
        image.src = photo.previewUrl; await image.decode();
        const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.round(image.naturalWidth * scale), height = Math.round(image.naturalHeight * scale);
        const candidates: OrientationCandidate[] = [];
        for (const rotation of turns) {
          await yieldToBrowser(); signal.throwIfAborted();
          canvas.width = rotation % 180 ? height : width; canvas.height = rotation % 180 ? width : height;
          context.save(); context.translate(canvas.width / 2, canvas.height / 2); context.rotate(rotation * Math.PI / 180);
          context.drawImage(image, -width / 2, -height / 2, width, height); context.restore();
          let score = detector.detect(canvas).detections.reduce((sum, face) => sum + uprightFaceScore(face, canvas.width, canvas.height), 0);
          // Overlapping crops help with small faces in full-body photographs.
          if (!score) {
            crop.width = Math.round(canvas.width * 0.6); crop.height = Math.round(canvas.height * 0.6);
            for (const x of [0, canvas.width - crop.width]) for (const y of [0, canvas.height - crop.height]) {
              await yieldToBrowser(); signal.throwIfAborted();
              cropContext.drawImage(canvas, x, y, crop.width, crop.height, 0, 0, crop.width, crop.height);
              score = Math.max(score, ...detector.detect(crop).detections.map(face => uprightFaceScore(face, crop.width, crop.height) * 0.6));
            }
          }
          candidates.push({ rotation, score });
        }
        const rotation = chooseFaceOrientation(candidates);
        if (rotation === null) result.skipped.push(photo.filename);
        else result.rotations[photo.id] = rotation;
      } finally {
        image.removeAttribute('src'); onProgress({ completed: index + 1, total: photos.length });
      }
    }
    signal.throwIfAborted(); return result;
  } finally { detector.close(); canvas.width = crop.width = 0; }
}
