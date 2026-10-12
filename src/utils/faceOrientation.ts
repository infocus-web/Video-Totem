export type QuarterTurn = 0 | 90 | 180 | 270;
export interface FaceEvidence {
  categories: { score: number }[];
  keypoints: { x: number; y: number }[];
  boundingBox?: { width: number; height: number };
}
export interface OrientationCandidate { rotation: QuarterTurn; score: number }

// BlazeFace keypoints: eyes (0, 1), nose (2), mouth (3). Use pixel coordinates
// so portrait and landscape images have the same geometric thresholds.
export function uprightFaceScore(face: FaceEvidence, width: number, height: number): number {
  const confidence = face.categories[0]?.score || 0;
  const [left, right, nose, mouth] = face.keypoints;
  if (confidence < 0.85 || !left || !right || !nose || !mouth || !face.boundingBox) return 0;
  const eyeX = (left.x + right.x) / 2 * width, eyeY = (left.y + right.y) / 2 * height;
  const eyeWidth = Math.abs(right.x - left.x) * width;
  const down = mouth.y * height - eyeY, sideways = mouth.x * width - eyeX;
  if (eyeWidth < 4 || Math.abs(right.y - left.y) * height > eyeWidth * 0.6
    || down < eyeWidth * 0.3 || down > eyeWidth * 2
    || Math.abs(sideways) > down * 0.65
    || nose.y * height < eyeY || nose.y > mouth.y) return 0;
  const area = face.boundingBox.width * face.boundingBox.height / (width * height);
  return Number.isFinite(area) && area > 0 ? confidence * Math.sqrt(area) : 0;
}

export function chooseFaceOrientation(candidates: OrientationCandidate[]): QuarterTurn | null {
  const ranked = [...candidates].sort((a, b) => b.score - a.score);
  if (!ranked[0]?.score || ranked[1]?.score >= ranked[0].score * 0.65) return null;
  return ranked[0].rotation;
}
