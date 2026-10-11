import { useEffect, useState } from 'react';
import { RotateCcw, Type } from 'lucide-react';
import type { OverlayTextKey, OverlayTextStyle, SequenceConfig } from '../types';
import { normalizeTextStyle, TEXT_FONTS, TEXT_LAYERS, textStyle } from '../utils/textOverlay';
import { EditorPropertyRow } from './EditorPropertyRow';
import { EditorToolButton } from './EditorTool';

const positions = [
  { label: 'Arriba izquierda', caption: 'Arr. izq.', x: 5, y: 8, align: 'left' },
  { label: 'Arriba centro', caption: 'Arriba', x: 50, y: 8, align: 'center' },
  { label: 'Arriba derecha', caption: 'Arr. der.', x: 95, y: 8, align: 'right' },
  { label: 'Centro izquierda', caption: 'Izquierda', x: 5, y: 50, align: 'left' },
  { label: 'Centro', caption: 'Centro', x: 50, y: 50, align: 'center' },
  { label: 'Centro derecha', caption: 'Derecha', x: 95, y: 50, align: 'right' },
  { label: 'Abajo izquierda', caption: 'Ab. izq.', x: 5, y: 93, align: 'left' },
  { label: 'Abajo centro', caption: 'Abajo', x: 50, y: 93, align: 'center' },
  { label: 'Abajo derecha', caption: 'Ab. der.', x: 95, y: 93, align: 'right' },
] as const;

function TextSizeInput({ size, onChange }: { size: number; onChange: (size: number) => void }) {
  const [draft, setDraft] = useState(String(size));
  useEffect(() => setDraft(String(size)), [size]);
  return <input aria-label="Tamaño del texto en píxeles" type="number" min={12} max={180} step={1} value={draft}
    onChange={event => {
      setDraft(event.target.value);
      const value = Number(event.target.value);
      if (event.target.value && Number.isFinite(value) && value >= 12 && value <= 180) onChange(value);
    }}
    onBlur={() => {
      const value = draft.trim() && Number.isFinite(Number(draft)) ? Math.max(12, Math.min(180, Number(draft))) : size;
      setDraft(String(value)); onChange(value);
    }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }}
    className="studio-input text-size-input" />;
}

export function TextOverlayControls({ config, onChange }: { config: SequenceConfig; onChange: (config: SequenceConfig) => void }) {
  const [selected, setSelected] = useState<OverlayTextKey>('eventTitle');
  const style = textStyle(config, selected);
  const update = (patch: Partial<OverlayTextStyle>) => onChange({ ...config, textStyles: { ...config.textStyles,
    [selected]: normalizeTextStyle({ ...style, ...patch }, selected, config.fontFamily) } });
  return <fieldset className="text-overlay-controls" aria-label="Diseño del texto">
    <div className="text-overlay-properties">
      <EditorPropertyRow label="Editar"><div role="group" aria-label="Texto a editar" className="property-buttons">
        {TEXT_LAYERS.map(layer => <EditorToolButton key={layer.key} label={'Editar ' + layer.label.toLowerCase()} caption={layer.caption}
          aria-pressed={selected === layer.key} onClick={() => setSelected(layer.key)}><Type aria-hidden="true" /></EditorToolButton>)}
      </div></EditorPropertyRow>
      <EditorPropertyRow label="Tipografía"><select aria-label="Tipografía del texto" value={style.fontFamily} onChange={event => update({ fontFamily: event.target.value })} className="studio-input">
        {TEXT_FONTS.map(font => <option key={font} value={font}>{font}</option>)}
      </select></EditorPropertyRow>
      <EditorPropertyRow label="Tamaño" help="Píxeles en un cuadro de 1080 de ancho. Se escala con la resolución del video.">
        <input aria-label="Tamaño del texto" type="range" min={12} max={180} step={1} value={style.size} onChange={event => update({ size: Number(event.target.value) })} className="property-range accent-indigo-500" />
        <TextSizeInput key={selected} size={style.size} onChange={size => update({ size })} /><span className="property-note">px</span>
      </EditorPropertyRow>
      <EditorPropertyRow label="Horizontal">
        <input aria-label="Posición horizontal del texto" type="range" min={0} max={100} step={1} value={style.x} onChange={event => update({ x: Number(event.target.value) })} className="property-range accent-indigo-500" /><output className="property-value">{style.x}%</output>
      </EditorPropertyRow>
      <EditorPropertyRow label="Vertical">
        <input aria-label="Posición vertical del texto" type="range" min={0} max={100} step={1} value={style.y} onChange={event => update({ y: Number(event.target.value) })} className="property-range accent-indigo-500" /><output className="property-value">{style.y}%</output>
      </EditorPropertyRow>
      <EditorPropertyRow label="Restablecer"><EditorToolButton label="Restablecer diseño del texto" caption="Restablecer" onClick={() => update(normalizeTextStyle(undefined, selected, config.fontFamily))}><RotateCcw aria-hidden="true" /></EditorToolButton></EditorPropertyRow>
    </div>
    <div className="text-overlay-placement">
      <span className="property-label">Ubicación</span>
      <div role="group" aria-label="Ubicación del texto" className="text-position-grid">
        {positions.map(position => <EditorToolButton key={position.label} label={position.label} caption={position.caption}
          aria-pressed={style.x === position.x && style.y === position.y && style.align === position.align}
          onClick={() => update({ x: position.x, y: position.y, align: position.align })}>
          <svg aria-hidden="true" viewBox="0 0 28 22" fill="none"><rect x="1" y="1" width="26" height="20" rx="2" stroke="currentColor" opacity="0.4" /><path d={`M${position.x === 5 ? 4 : position.x === 50 ? 10 : 16} ${position.y === 8 ? 5 : position.y === 50 ? 11 : 17}h8`} stroke="currentColor" strokeWidth="2" /></svg>
        </EditorToolButton>)}
      </div>
      <div className="text-font-sample" aria-label="Muestra de tipografía" style={{ fontFamily: '"' + style.fontFamily + '", sans-serif' }}>Aa · {TEXT_LAYERS.find(layer => layer.key === selected)?.caption}</div>
    </div>
  </fieldset>;
}
