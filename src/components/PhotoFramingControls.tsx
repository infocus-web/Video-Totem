import type { PhotoFraming, SequenceSlide } from '../types';
import { useState } from 'react';
import { normalizeFraming } from '../utils/photoFraming';

interface Props {
  slides: SequenceSlide[]; sceneIndex: number; photoIndex: number;
  onSceneChange: (index: number) => void; onPhotoChange: (index: number) => void;
  onChange: (framing: PhotoFraming) => void; cover: boolean;
  onRotate: (ids: string[], direction: -90 | 90) => void;
}

export function PhotoFramingControls({ slides, sceneIndex, photoIndex, onSceneChange, onPhotoChange, onChange, onRotate, cover }: Props) {
  const [rotationScope, setRotationScope] = useState('current');
  const [marked, setMarked] = useState<string[]>([]);
  const photos = [...new Map(slides.flatMap(slide => slide.photos).map(item => [item.id, item])).values()];
  const slide = slides[sceneIndex], photo = slide?.photos[photoIndex];
  if (!photo) return null;
  const framing = normalizeFraming(photo.framing);
  const rotationIds = rotationScope === 'all' ? photos.map(item => item.id) : rotationScope === 'selected' ? photos.filter(item => marked.includes(item.id)).map(item => item.id) : [photo.id];
  return <div className="space-y-3 rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-3">
    <p id="photo-framing-help" className="text-xs text-indigo-200">Arrastrá la foto para encuadrarla o usá estos controles. Si no se mueve en un eje, aumentá el zoom.</p>
    {!cover && <p className="text-xs text-amber-200">Para cubrir todo el cuadro sin márgenes, elegí Rellenar cuadro (recortar) en el editor.</p>}
    {slides.length > 1 && <label className="block text-xs text-neutral-300">Escena<select aria-label="Escena para encuadrar" value={sceneIndex} onChange={event => onSceneChange(Number(event.target.value))} className="studio-input mt-1">
      {slides.map((item, index) => <option key={item.id} value={index}>Escena {index + 1} · {item.photos[0].filename}</option>)}
    </select></label>}
    {slide.photos.length > 1 && <div className="flex flex-wrap gap-2" role="group" aria-label="Foto para encuadrar">{slide.photos.map((item, index) =>
      <button key={item.id} type="button" aria-pressed={photoIndex === index} onClick={() => onPhotoChange(index)} className={'quick-button ' + (photoIndex === index ? '!border-indigo-500 !bg-indigo-600/30' : '')}>Foto {index + 1}</button>)}</div>}
    <p className="break-all text-xs text-neutral-400">{photo.filename}</p>
    <label className="block text-xs text-neutral-300">Aplicar giro a<select aria-label="Aplicar giro a" className="studio-input mt-1" value={rotationScope} onChange={event => setRotationScope(event.target.value)}>
      <option value="current">Esta foto</option><option value="selected">Fotos que marque</option><option value="all">Todas las fotos del montaje</option>
    </select></label>
    {rotationScope === 'selected' && <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-neutral-700 p-2" role="group" aria-label="Seleccionar fotos para girar">
      <p className="text-xs text-neutral-400">{rotationIds.length} fotos marcadas</p>
      {photos.map(item => <label key={item.id} className="flex items-start gap-2 break-all text-xs text-neutral-200"><input type="checkbox" className="mt-0.5 accent-indigo-500" aria-label={'Girar ' + item.filename} checked={marked.includes(item.id)} onChange={event => setMarked(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} />{item.filename}</label>)}
    </div>}
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Girar foto">
      <button type="button" disabled={!rotationIds.length} className="quick-button" onClick={() => onRotate(rotationIds, -90)}>↶ Girar 90° a la izquierda</button>
      <button type="button" disabled={!rotationIds.length} className="quick-button" onClick={() => onRotate(rotationIds, 90)}>↷ Girar 90° a la derecha</button>
      <span className="text-xs text-neutral-400">{framing.rotation || 0}°</span>
    </div>
    {(['x', 'y'] as const).map(axis => <label key={axis} className="block text-xs text-neutral-300">{axis === 'x' ? 'Encuadre horizontal' : 'Encuadre vertical'}
      <input aria-label={axis === 'x' ? 'Encuadre horizontal' : 'Encuadre vertical'} type="range" min="0" max="100" step="1" value={Math.round(framing[axis] * 100)} onChange={event => onChange({ ...framing, [axis]: Number(event.target.value) / 100 })} className="mt-2 w-full accent-indigo-500" />
    </label>)}
    <label className="block text-xs text-neutral-300">Zoom · {Math.round(framing.zoom * 100)}%<input aria-label="Zoom de la foto" type="range" min="1" max="3" step="0.05" value={framing.zoom} onChange={event => onChange({ ...framing, zoom: Number(event.target.value) })} className="mt-2 w-full accent-indigo-500" /></label>
    <button type="button" className="quick-button" title="Centrar la foto, volver al 100% y quitar su giro individual" onClick={() => onChange({ x: 0.5, y: 0.5, zoom: 1, rotation: 0 })}>Restablecer encuadre</button>
  </div>;
}
