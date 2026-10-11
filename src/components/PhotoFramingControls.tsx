import type { PhotoFraming, SequenceSlide } from '../types';
import { useState } from 'react';
import { normalizeFraming } from '../utils/photoFraming';
import { EditorPropertyRow } from './EditorPropertyRow';

interface Props {
  slides: SequenceSlide[]; sceneIndex: number; photoIndex: number;
  onSceneChange: (index: number) => void; onPhotoChange: (index: number) => void;
  onNavigatePhoto: (scene: number, photo: number) => void;
  onChange: (framing: PhotoFraming) => void; cover: boolean;
  onRotate: (ids: string[], direction: -90 | 90) => void;
}

export function PhotoFramingControls({ slides, sceneIndex, photoIndex, onSceneChange, onPhotoChange, onNavigatePhoto, onChange, onRotate, cover }: Props) {
  const [rotationScope, setRotationScope] = useState('current');
  const [marked, setMarked] = useState<string[]>([]);
  const photos = [...new Map(slides.flatMap(slide => slide.photos).map(item => [item.id, item])).values()];
  const slide = slides[sceneIndex], photo = slide?.photos[photoIndex];
  if (!photo) return null;
  const positions = slides.flatMap((item, scene) => item.photos.map((_, photo) => ({ scene, photo })));
  const position = positions.findIndex(item => item.scene === sceneIndex && item.photo === photoIndex);
  const navigate = (direction: -1 | 1) => {
    const target = positions[position + direction];
    if (target) onNavigatePhoto(target.scene, target.photo);
  };
  const framing = normalizeFraming(photo.framing);
  const rotationIds = rotationScope === 'all' ? photos.map(item => item.id) : rotationScope === 'selected' ? photos.filter(item => marked.includes(item.id)).map(item => item.id) : [photo.id];
  return <div className="framing-properties">
    <p id="photo-framing-help" className="sr-only">Arrastrá la foto para encuadrarla o usá estos controles. Si no se mueve en un eje, aumentá el zoom.</p>
    <EditorPropertyRow label="Foto actual" help="Arrastrá la foto en la vista previa. Si no se mueve en un eje, aumentá el zoom.">
    <div className="property-buttons" role="group" aria-label="Recorrer fotos para encuadrar">
      <button type="button" className="quick-button" disabled={position <= 0} onClick={() => navigate(-1)}>Anterior</button>
      <span className="text-xs text-neutral-400" aria-live="polite">Foto {position + 1} de {positions.length}</span>
      <button type="button" className="quick-button" disabled={position >= positions.length - 1} onClick={() => navigate(1)}>Siguiente</button>
    </div>
    <span className="property-note break-all">{photo.filename}</span>
    </EditorPropertyRow>
    {!cover && <p className="property-note text-amber-200">Usá Rellenar cuadro para quitar los márgenes.</p>}
    {slides.length > 1 && <EditorPropertyRow label="Escena"><select aria-label="Escena para encuadrar" value={sceneIndex} onChange={event => onSceneChange(Number(event.target.value))} className="studio-input">
      {slides.map((item, index) => <option key={item.id} value={index}>Escena {index + 1} · {item.photos[0].filename}</option>)}
    </select></EditorPropertyRow>}
    {slide.photos.length > 1 && <EditorPropertyRow label="Foto apilada"><div className="property-buttons" role="group" aria-label="Foto para encuadrar">{slide.photos.map((item, index) =>
      <button key={item.id} type="button" aria-pressed={photoIndex === index} onClick={() => onPhotoChange(index)} className="property-choice">Foto {index + 1}</button>)}</div></EditorPropertyRow>}
    {(['x', 'y'] as const).map(axis => <EditorPropertyRow key={axis} label={axis === 'x' ? 'Posición X' : 'Posición Y'}>
      <input aria-label={axis === 'x' ? 'Encuadre horizontal' : 'Encuadre vertical'} type="range" min="0" max="100" step="1" value={Math.round(framing[axis] * 100)} onChange={event => onChange({ ...framing, [axis]: Number(event.target.value) / 100 })} className="property-range accent-indigo-500" />
      <span className="property-value">{Math.round(framing[axis] * 100)}%</span>
    </EditorPropertyRow>)}
    <EditorPropertyRow label="Zoom"><input aria-label="Zoom de la foto" type="range" min="1" max="3" step="0.05" value={framing.zoom} onChange={event => onChange({ ...framing, zoom: Number(event.target.value) })} className="property-range accent-indigo-500" /><span className="property-value">{Math.round(framing.zoom * 100)}%</span></EditorPropertyRow>
    <EditorPropertyRow label="Aplicar giro a"><select aria-label="Aplicar giro a" className="studio-input" value={rotationScope} onChange={event => setRotationScope(event.target.value)}>
      <option value="current">Esta foto</option><option value="selected">Fotos que marque</option><option value="all">Todas las fotos del montaje</option>
    </select></EditorPropertyRow>
    {rotationScope === 'selected' && <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-neutral-700 p-2" role="group" aria-label="Seleccionar fotos para girar">
      <p className="text-xs text-neutral-400">{rotationIds.length} fotos marcadas</p>
      {photos.map(item => <label key={item.id} className="flex items-start gap-2 break-all text-xs text-neutral-200"><input type="checkbox" className="mt-0.5 accent-indigo-500" aria-label={'Girar ' + item.filename} checked={marked.includes(item.id)} onChange={event => setMarked(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} />{item.filename}</label>)}
    </div>}
    <EditorPropertyRow label="Giro"><div className="property-buttons" role="group" aria-label="Girar foto">
      <button type="button" disabled={!rotationIds.length} className="quick-button" aria-label="↶ Girar 90° a la izquierda" title="Girar 90° a la izquierda" onClick={() => onRotate(rotationIds, -90)}>↶ 90°</button>
      <button type="button" disabled={!rotationIds.length} className="quick-button" aria-label="↷ Girar 90° a la derecha" title="Girar 90° a la derecha" onClick={() => onRotate(rotationIds, 90)}>↷ 90°</button>
      <span className="property-value">{framing.rotation || 0}°</span>
    </div></EditorPropertyRow>
    <EditorPropertyRow label="Restablecer"><button type="button" className="quick-button" title="Centrar la foto, volver al 100% y quitar su giro individual" onClick={() => onChange({ x: 0.5, y: 0.5, zoom: 1, rotation: 0 })}>Restablecer encuadre</button></EditorPropertyRow>
  </div>;
}
