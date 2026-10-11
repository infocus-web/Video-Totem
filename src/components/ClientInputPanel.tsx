import { useRef, type ReactNode, type ChangeEvent } from 'react';
import { Copy, FolderOpen, PlusCircle } from 'lucide-react';
import { EditorPropertyRow } from './EditorPropertyRow';
import type { HorizontalGroupMode, SequenceConfig } from '../types';
import { parseGoogleDriveLink } from '../utils/photoParser';
import { videoOutput } from '../utils/videoOutput';

interface Props {
  onFramingTargetChange: (target: HTMLDivElement | null) => void;
  rawText: string; onRawTextChange: (value: string) => void;
  config: SequenceConfig; onConfigChange: (config: SequenceConfig) => void;
  libraryCount: number; selectedCount: number; sceneCount: number;
  onUploadPhotos: (event: ChangeEvent<HTMLInputElement>) => void;
  onApplySelection: () => void; onUseAll: () => void; onRegroup: () => void;
  onMusicUpload: (event: ChangeEvent<HTMLInputElement>) => void; musicName: string;
  onClearMusic: () => void; onError: (message: string) => void; busy: boolean;
}
const modes: { value: HorizontalGroupMode; title: string; detail: string; slots: number }[] = [
  { value: 'auto-split-2', title: '2 en 1 (Arriba y Abajo)', detail: 'Apilá dos fotos horizontales en pares, dividiendo la pantalla al 50%.', slots: 2 },
  { value: 'auto-split-3', title: '3 en 1 (Completa el Cuadro)', detail: 'Tres fotos horizontales apiladas para completar el cuadro vertical.', slots: 3 },
  { value: 'auto-adaptive', title: 'Inteligente / Adaptativo', detail: 'Agrupá en tres o dos según las fotos horizontales que sigan en orden.', slots: 0 },
  { value: 'single', title: 'Individual (1 foto por escena)', detail: 'Una foto a la vez con el fondo que elijas para tu video.', slots: 1 },
];
const presets: { name: string; detail: string; duration: number; music: string; group: HorizontalGroupMode; background: SequenceConfig['backgroundStyle'] }[] = [
  { name: '💍 Boda Emotiva', detail: '1.8s · 2 en 1 · Música cinemática', duration: 1.8, music: 'cinematic', group: 'auto-split-2', background: 'blur' },
  { name: '🎉 Fiesta / 15 Años', detail: '0.9s · 3 en 1 + Beats rápidos', duration: 0.9, music: 'upbeat', group: 'auto-split-3', background: 'blur' },
  { name: '📸 Portfolio / Sesión', detail: '1.4s · Agrupación inteligente', duration: 1.4, music: 'chill', group: 'auto-adaptive', background: 'blur' },
  { name: '🏡 Inmobiliaria / Tour', detail: '2.2s · 2 en 1 · Fondo negro', duration: 2.2, music: 'chill', group: 'auto-split-2', background: 'black' },
];

function EditorSection({ number, title, detail, children }: { number: number; title: string; detail: string; children: ReactNode }) {
  return <section id={'editor-section-' + number} className="editor-section">
    <div className="editor-section-heading" title={detail}><span className="step-badge step-indigo">{number}</span><h3 tabIndex={-1} className="text-xs font-semibold">{title}</h3></div>
    <div className="editor-section-body">{children}</div>
  </section>;
}

export function ClientInputPanel(props: Props) {
  const { config, onConfigChange, busy } = props;
  const tools = useRef<HTMLDivElement>(null);
  const jumpToSection = (number: number) => {
    const panel = tools.current, section = panel?.querySelector<HTMLElement>('#editor-section-' + number);
    if (!panel || !section) return;
    panel.scrollTo({ top: panel.scrollTop + section.getBoundingClientRect().top - panel.getBoundingClientRect().top });
    section.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
  };
  const output = videoOutput(config);
  const change = <K extends keyof SequenceConfig>(key: K, value: SequenceConfig[K]) => onConfigChange({ ...config, [key]: value });
  const drive = parseGoogleDriveLink(config.driveLink);
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) throw new Error('El portapapeles está vacío. Copiá primero el mensaje del cliente.');
      props.onRawTextChange(text.slice(0, 20000));
    } catch (error) {
      props.onError(error instanceof Error && error.name === 'Error' ? error.message : 'No se pudo leer el portapapeles. Pegá el mensaje con Ctrl + V en la selección.');
    }
  };
  return <section className="panel editor-panel !p-0" aria-label="Panel de edición">
    <div className="editor-panel-heading">
      <h2 className="text-sm font-bold">Herramientas de edición</h2>
      <div className="editor-counts"><span className="count-badge count-indigo">{props.selectedCount} fotos</span><span className="count-badge count-green">{props.sceneCount} escenas</span></div>
    </div>
    <nav className="editor-shortcuts" aria-label="Accesos a herramientas">
      {['Fotos', 'Formato', 'Encuadre', 'Escenas', 'Ritmo', 'Textos', 'Música', 'Premiere'].map((label, index) => <button type="button" key={label} aria-controls={'editor-section-' + (index + 1)} onClick={() => jumpToSection(index + 1)} className="editor-shortcut">{label}</button>)}
    </nav>
    <div ref={tools} className="editor-tools focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400" role="region" aria-label="Controles de edición" tabIndex={0}>
    <fieldset disabled={busy} className="min-w-0 text-sm disabled:opacity-60">
    <EditorSection number={1} title="Fotos del proyecto" detail="Cargar fotos y aplicar la selección del cliente.">
      <EditorPropertyRow label="Archivos" help="Las fotos se procesan en tu navegador, sin subirse a un servidor.">
        <label className="quick-button !border-indigo-500/30 !text-indigo-300"><PlusCircle aria-hidden="true" />Subir fotos locales
          <input aria-label="Elegir fotos" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={props.onUploadPhotos} className="sr-only" /></label>
        <label className="quick-button"><FolderOpen aria-hidden="true" />Elegir carpeta
          <input aria-label="Elegir carpeta" type="file" multiple {...{ webkitdirectory: '', directory: '' }} onChange={props.onUploadPhotos} className="sr-only" /></label>
        <span className="property-note">{props.libraryCount} fotos conectadas</span>
      </EditorPropertyRow>
      <EditorPropertyRow label="Selección" help="Pegá números, rangos o nombres. Podés ampliar la caja desde su esquina inferior.">
        <textarea aria-label="Selección del cliente" value={props.rawText} onChange={e => props.onRawTextChange(e.target.value)} rows={1} maxLength={20000}
          placeholder="004, 012, 025-028, DSC_1020.jpg" className="studio-input selection-input font-mono" />
        <button type="button" onClick={() => void paste()} className="quick-button" aria-label="Pegar mensaje de WhatsApp" title="Pegar mensaje de WhatsApp"><Copy aria-hidden="true" />Pegar</button>
        <button type="button" onClick={() => props.onRawTextChange('')} className="quick-button" aria-label="Limpiar lista">Limpiar</button>
      </EditorPropertyRow>
      <EditorPropertyRow label="Montaje">
          <button type="button" onClick={props.onApplySelection} disabled={!props.libraryCount || !props.rawText.trim()} className="primary-button">Aplicar selección</button>
          <button type="button" onClick={props.onUseAll} disabled={!props.libraryCount} className="control">Usar todas las fotos</button>
        {!props.libraryCount && <span className="property-note">Cargá las fotos para empezar.</span>}
      </EditorPropertyRow>
      <EditorPropertyRow label="Nombres" help="Formato de nombres para interpretar los números de la selección.">
        <div id="filename-options" className="property-inline-fields">
          <label>Prefijo<input aria-label="Prefijo" value={config.filenamePrefix} onChange={e => change('filenamePrefix', e.target.value)} className="studio-input font-mono" /></label>
          <label>Dígitos<select aria-label="Dígitos" value={config.filenamePadding} onChange={e => change('filenamePadding', Number(e.target.value))} className="studio-input">{[0,3,4,5,6].map(n => <option key={n} value={n}>{n || 'Exactos'}</option>)}</select></label>
          <label>Extensión<select aria-label="Extensión" value={config.filenameExtension} onChange={e => change('filenameExtension', e.target.value)} className="studio-input">{['.jpg','.jpeg','.png','.webp','.avif'].map(ext => <option key={ext}>{ext}</option>)}</select></label>
        </div>
      </EditorPropertyRow>
    </EditorSection>
    <EditorSection number={2} title="Formato de salida" detail="Tótem TV, vertical u horizontal y cuadros por segundo.">
      <EditorPropertyRow label="Proyecto"><input aria-label="Nombre del proyecto" maxLength={120} value={config.name} onChange={e => change('name', e.target.value)} className="studio-input" /></EditorPropertyRow>
      <EditorPropertyRow label="Formato">
        <select aria-label="Formato" value={output.rotation ? 'totem-' + output.rotation : config.width + 'x' + config.height} onChange={e => {
          if (e.target.value.startsWith('totem-')) {
            onConfigChange({ ...config, width: 1080, height: 1920, aspectRatio: '9:16', outputRotation: e.target.value === 'totem-90' ? 90 : 270 });
            return;
          }
          const [width,height] = e.target.value.split('x').map(Number);
          onConfigChange({ ...config, width, height, outputRotation: 0, aspectRatio: width === height ? '1:1' : width > height ? '16:9' : height === 1350 ? '4:5' : '9:16' });
        }} className="studio-input">
          <option value="totem-90">Tótem TV · Giro 90° a la derecha</option>
          <option value="totem-270">Tótem TV · Giro 90° a la izquierda</option>
          {[[1080,1920,'Vertical 9:16'],[1080,1080,'Cuadrado 1:1'],[1920,1080,'Horizontal 16:9'],[1080,1350,'Retrato 4:5']].map(([w,h,label]) => <option key={String(w) + 'x' + h} value={String(w) + 'x' + h}>{label}</option>)}
          {!['1080x1920','1080x1080','1920x1080','1080x1350'].includes(config.width + 'x' + config.height) && <option value={config.width + 'x' + config.height}>{config.width} × {config.height}</option>}
        </select>
      </EditorPropertyRow>
      <EditorPropertyRow label="FPS"><select aria-label="FPS" value={config.fps} onChange={e => change('fps', Number(e.target.value))} className="studio-input property-small-input">{[24,25,30,50,60].map(fps => <option key={fps}>{fps}</option>)}</select>
        {output.rotation !== 0 && <span className="property-note" title="Editás en vertical; fotos, textos y fondos se giran juntos al exportar. No hace falta girar todas las fotos.">Salida Tótem: {output.width} × {output.height}</span>}
      </EditorPropertyRow>
    </EditorSection>
    <EditorSection number={3} title="Encuadre y giro" detail="Rellenar el cuadro, mover, ampliar y girar cada foto.">
        <EditorPropertyRow label="Ajuste de imagen">
          <div role="group" aria-label="Encuadre de las fotos" className="property-buttons">
            <button type="button" aria-pressed={config.photoFit === 'contain'} onClick={() => change('photoFit', 'contain')} className="property-choice" title="Mantiene toda la foto y usa el fondo elegido en los márgenes.">Mostrar foto completa</button>
            <button type="button" aria-pressed={config.photoFit === 'cover'} onClick={() => change('photoFit', 'cover')} className="property-choice" title="Cubre el cuadro sin franjas. Recorta los bordes sin deformar la foto.">Rellenar cuadro (recortar)</button>
          </div>
        </EditorPropertyRow>
        <EditorPropertyRow label="Fondo" help="Se usa cuando mostrás la foto completa. Rellenar cuadro cubre los márgenes."><select aria-label="Fondo" disabled={config.photoFit === 'cover'} value={config.backgroundStyle} onChange={e => change('backgroundStyle', e.target.value as SequenceConfig['backgroundStyle'])} className="studio-input disabled:opacity-50">
          <option value="blur">Blur difuminado (Studio)</option><option value="black">Negro minimalista</option><option value="gradient">Gradiente moderno</option><option value="mirror">Espejo</option></select></EditorPropertyRow>

      <div ref={props.onFramingTargetChange} />
    </EditorSection>
    <EditorSection number={4} title="Composición de escenas" detail="Una, dos o tres fotos por escena y separación.">
      <EditorPropertyRow label="Agrupación" help="Redistribuye las escenas conservando el orden y los movimientos.">
        <div className="property-buttons" role="group" aria-label="Agrupar fotos horizontales">
          {modes.map(mode => <button type="button" key={mode.value} aria-label={mode.title} title={mode.detail} aria-pressed={config.horizontalGrouping === mode.value} onClick={() => change('horizontalGrouping', mode.value)} className="property-choice">{mode.slots === 1 ? 'Individual' : mode.slots ? mode.slots + ' en 1' : 'Adaptativo'}</button>)}
        </div>
      </EditorPropertyRow>
      <EditorPropertyRow label="Separación" help="Elegí 0px para quitar la línea entre las fotos.">
        <div className="property-buttons" role="group" aria-label="Separación entre fotos">{[0,4,8,12,16].map(gap => <button type="button" key={gap} aria-pressed={config.splitGapSize === gap}
          onClick={() => change('splitGapSize', gap)} className="property-choice font-mono">{gap}px</button>)}</div>
      </EditorPropertyRow>
      <EditorPropertyRow label="Reagrupar"><button type="button" onClick={props.onRegroup} disabled={!props.sceneCount} className="quick-button" title="Volvé a aplicar este modo si cambiaste cuadros en la línea de tiempo.">Reagrupar montaje con este modo</button></EditorPropertyRow>
    </EditorSection>
    <EditorSection number={5} title="Ritmo y estilo" detail="Duración de las escenas y estilos rápidos.">
      <EditorPropertyRow label="Estilo rápido"><div className="property-buttons">{presets.map(preset => <button type="button" key={preset.name} className="quick-button" title={preset.detail}
        onClick={() => onConfigChange({ ...config, defaultDuration: preset.duration, musicTrack: preset.music, horizontalGrouping: preset.group, backgroundStyle: preset.background })}>
        {preset.name}
      </button>)}</div></EditorPropertyRow>
      <EditorPropertyRow label="Duración por escena">
        <input id="scene-duration" aria-label="Duración de las escenas" type="range" min="0.4" max={Math.max(5, config.defaultDuration)} step="0.1" value={config.defaultDuration} onChange={e => change('defaultDuration', Number(e.target.value))} className="property-range accent-amber-500" />
        <output htmlFor="scene-duration" className="property-value text-amber-400" title={Math.round(config.defaultDuration * config.fps) + ' cuadros'}>{config.defaultDuration.toFixed(1)}s</output>
      </EditorPropertyRow>
    </EditorSection>
    <EditorSection number={6} title="Textos y marca" detail="Título, subtítulo y firma del fotógrafo.">
      <EditorPropertyRow label="Título"><input aria-label="Título" maxLength={120} value={config.eventTitle} onChange={e => change('eventTitle', e.target.value)} placeholder="Ej: Boda Valentina & Mateo" className="studio-input" /></EditorPropertyRow>
      <EditorPropertyRow label="Subtítulo"><input aria-label="Subtítulo" maxLength={120} value={config.eventSubtitle} onChange={e => change('eventSubtitle', e.target.value)} className="studio-input" /></EditorPropertyRow>
      <EditorPropertyRow label="Marca de agua"><input aria-label="Marca de agua" maxLength={120} value={config.watermark} onChange={e => change('watermark', e.target.value)} placeholder="Ej: @tu_fotografia" className="studio-input" /></EditorPropertyRow>
      <EditorPropertyRow label="Visibilidad"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={config.showOverlayText} onChange={e => change('showOverlayText', e.target.checked)} className="accent-indigo-500" />Mostrar textos</label></EditorPropertyRow>
    </EditorSection>
    <EditorSection number={7} title="Música y volumen" detail="Elegir música, cargar un archivo y ajustar su volumen.">
      <EditorPropertyRow label="Música"><select aria-label="Música" value={config.musicTrack} onChange={e => change('musicTrack', e.target.value)} className="studio-input">
          <option value="chill">Chill · Sintética (112 BPM)</option><option value="upbeat">Fiesta · Sintética (124 BPM)</option><option value="cinematic">Cinemática · Sintética (95 BPM)</option><option value="none">Sin música</option></select></EditorPropertyRow>
      <EditorPropertyRow label="Archivo de audio" help="El archivo cargado reemplaza la música sintética. Usá música con permiso de uso."><label className="quick-button">Cargar música<input aria-label="Cargar música" type="file" accept="audio/*" onChange={props.onMusicUpload} className="sr-only" /></label>
        {props.musicName && <><span className="property-note break-all">{props.musicName}</span><button type="button" className="quick-button" onClick={props.onClearMusic}>Quitar música cargada</button></>}</EditorPropertyRow>
      <EditorPropertyRow label="Volumen"><input aria-label="Volumen" type="range" min="0" max="1" step="0.05" value={config.musicVolume} onChange={e => change('musicVolume', Number(e.target.value))} className="property-range accent-indigo-500" /><span className="property-value">{Math.round(config.musicVolume * 100)}%</span></EditorPropertyRow>
    </EditorSection>
    <EditorSection number={8} title="Premiere y Google Drive" detail="Opcional: vincular los originales en el proyecto XML.">
      <EditorPropertyRow label="Ruta de originales" help="Solo para el XML de Premiere. Copiá la ruta del Explorador; no hace falta para grabar el video.">
        <input aria-label="Ruta de esa carpeta" value={config.localBasePath} onChange={e => change('localBasePath', e.target.value)} placeholder="D:\Fotos\Bodas_2024\FamiliaPerez\" className="studio-input font-mono" />
      </EditorPropertyRow>
      <EditorPropertyRow label="Google Drive" help="Enlace de referencia. Para usar las fotos, descargá o sincronizá la carpeta y cargalas desde tu computadora.">
        <input aria-label="Link de Google Drive de la sesión" type="url" value={config.driveLink} onChange={e => change('driveLink', e.target.value)} placeholder="https://drive.google.com/drive/folders/…" className="studio-input font-mono" />
        {drive.isValid && <a href={config.driveLink} target="_blank" rel="noopener noreferrer" className="quick-button text-indigo-300" title="Enlace válido de Drive">Abrir carpeta en Drive ↗</a>}
      </EditorPropertyRow>
    </EditorSection>
    </fieldset>
    </div>
  </section>;
}
