import { useRef, type ReactNode, type ChangeEvent, type KeyboardEvent } from 'react';
import { Camera, Check, Copy, Crop, ExternalLink, FileCode2, FolderOpen, Heart, House, Images, Layers, LayoutTemplate, Maximize, Music2, PartyPopper, PlusCircle, RefreshCw, Sparkles, Timer, Trash2, Type } from 'lucide-react';
import { EditorPropertyRow } from './EditorPropertyRow';
import { EditorTool, EditorToolButton } from './EditorTool';
import { EntranceControls } from './EntranceControls';
import { MusicTimeline } from './MusicTimeline';
import { TextOverlayControls } from './TextOverlayControls';
import { LocalFilePicker } from './LocalFilePicker';
import type { HorizontalGroupMode, SequenceConfig, SequenceSlide } from '../types';
import { parseGoogleDriveLink } from '../utils/photoParser';
import { videoOutput } from '../utils/videoOutput';

interface Props {
  activeSection: number; onSectionChange: (section: number) => void;
  onFramingTargetChange: (target: HTMLDivElement | null) => void;
  rawText: string; onRawTextChange: (value: string) => void;
  config: SequenceConfig; onConfigChange: (config: SequenceConfig) => void;
  slides: SequenceSlide[]; libraryCount: number; selectedCount: number; sceneCount: number;
  onUploadPhotos: (event: ChangeEvent<HTMLInputElement>) => void;
  onApplySelection: () => void; onUseAll: () => void; onRegroup: () => void;
  onMusicUpload: (event: ChangeEvent<HTMLInputElement>) => void; musicName: string; musicRevision: number;
  onClearMusic: () => void; onError: (message: string) => void; busy: boolean;
  onAuditionStart: () => void; onAuditionFrame: (time: number, running: boolean) => void;
  onChoosePhotos?: (folder: boolean) => void; onChooseMusic?: () => void;
}
const modes: { value: HorizontalGroupMode; title: string; detail: string; slots: number; caption: string }[] = [
  { value: 'auto-split-2', title: '2 en 1 (Arriba y Abajo)', detail: 'Apilá dos fotos horizontales en pares, dividiendo la pantalla al 50%.', slots: 2, caption: '2 en 1' },
  { value: 'auto-split-3', title: '3 en 1 (Completa el Cuadro)', detail: 'Tres fotos horizontales apiladas para completar el cuadro vertical.', slots: 3, caption: '3 en 1' },
  { value: 'auto-adaptive', title: 'Inteligente / Adaptativo', detail: 'Agrupá en tres o dos según las fotos horizontales que sigan en orden.', slots: 0, caption: 'Auto' },
  { value: 'single', title: 'Individual (1 foto por escena)', detail: 'Una foto a la vez con el fondo que elijas para tu video.', slots: 1, caption: 'Individual' },
];
const presets: { name: string; detail: string; duration: number; music: string; group: HorizontalGroupMode; background: SequenceConfig['backgroundStyle'] }[] = [
  { name: '💍 Boda Emotiva', detail: '1.8s · 2 en 1 · Música cinemática', duration: 1.8, music: 'cinematic', group: 'auto-split-2', background: 'blur' },
  { name: '🎉 Fiesta / 15 Años', detail: '0.9s · 3 en 1 + Beats rápidos', duration: 0.9, music: 'upbeat', group: 'auto-split-3', background: 'blur' },
  { name: '📸 Portfolio / Sesión', detail: '1.4s · Agrupación inteligente', duration: 1.4, music: 'chill', group: 'auto-adaptive', background: 'blur' },
  { name: '🏡 Inmobiliaria / Tour', detail: '2.2s · 2 en 1 · Fondo negro', duration: 2.2, music: 'chill', group: 'auto-split-2', background: 'black' },
];
const presetIcons = [Heart, PartyPopper, Camera, House];
const presetCaptions = ['Boda', 'Fiesta', 'Sesión', 'Tour'];
const shortcuts = [
  { label: 'Fotos', icon: Images }, { label: 'Formato', icon: LayoutTemplate }, { label: 'Encuadre', icon: Crop }, { label: 'Escenas', icon: Layers },
  { label: 'Ritmo', icon: Timer }, { label: 'Textos', icon: Type }, { label: 'Música', icon: Music2 }, { label: 'Premiere', icon: FileCode2 }, { label: 'Entrada', icon: PartyPopper },
];
const tabs = shortcuts.map((shortcut, index) => ({ ...shortcut, section: index + 1 }));

function LayoutGlyph({ slots, horizontal = false }: { slots: number; horizontal?: boolean }) {
  if (!slots) return <Sparkles aria-hidden="true" />;
  return <svg aria-hidden="true" className="layout-glyph" viewBox="0 0 22 30" fill="none">
    <rect x="1" y="1" width="20" height="28" rx="3" stroke="currentColor" />
    {Array.from({ length: slots }, (_, index) => <rect key={index} x={horizontal ? 4 + index * (14 / slots) : 4} y={horizontal ? 4 : 4 + index * (22 / slots)} width={horizontal ? 14 / slots - 1 : 14} height={horizontal ? 22 : 22 / slots - 2} rx="1" fill="currentColor" opacity="0.8" />)}
  </svg>;
}

function EditorSection({ number, activeSection, title, detail, children }: { number: number; activeSection: number; title: string; detail: string; children: ReactNode }) {
  return <section id={'editor-section-' + number} className="editor-section" hidden={activeSection !== number}
    role="tabpanel" aria-labelledby={'editor-tab-' + number} tabIndex={0}>
    <div className="editor-section-heading" title={detail}><span className="step-badge step-indigo">{number}</span><h3 id={'editor-heading-' + number} tabIndex={-1} className="text-xs font-semibold">{title}</h3></div>
    <div className="editor-section-body">{children}</div>
  </section>;
}

export function ClientInputPanel(props: Props) {
  const { config, onConfigChange, busy, activeSection, onSectionChange } = props;
  const tools = useRef<HTMLDivElement>(null);
  const selectSection = (number: number) => {
    onSectionChange(number);
    tools.current?.scrollTo({ top: 0 });
  };
  const navigateTabs = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectSection(tabs[next].section);
    event.currentTarget.closest('[role="tablist"]')?.querySelector<HTMLButtonElement>('#editor-tab-' + tabs[next].section)?.focus();
  };
  const output = videoOutput(config);
  const horizontal = config.width > config.height;
  const frameModes = horizontal ? modes.map(mode => ({ ...mode,
    title: mode.slots === 2 ? '2 en 1 (Lado a lado)' : mode.slots === 3 ? '3 en 1 (Lado a lado)' : mode.title,
    detail: mode.slots === 2 ? 'Dos fotos verticales una al lado de la otra.' : mode.slots === 3 ? 'Tres fotos verticales en columnas para completar el cuadro horizontal.' : mode.slots === 0 ? 'Agrupá fotos verticales consecutivas en dos o tres columnas.' : mode.detail,
  })) : modes;
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
    <div className="editor-shortcuts" role="tablist" aria-label="Herramientas de edición">
      {tabs.map(({ label, icon: Icon, section }, index) => <EditorToolButton key={label} label={label} role="tab" id={'editor-tab-' + section}
        aria-controls={'editor-section-' + section} aria-selected={activeSection === section} tabIndex={activeSection === section ? 0 : -1}
        onClick={() => selectSection(section)} onKeyDown={event => navigateTabs(event, index)} className="editor-shortcut"><Icon aria-hidden="true" /></EditorToolButton>)}
    </div>
    <div ref={tools} className="editor-tools focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400" role="region" aria-label="Controles de edición" tabIndex={0}>
    <fieldset disabled={busy} className="editor-section-grid min-w-0 text-sm disabled:opacity-60">
    <EditorSection activeSection={activeSection} number={1} title="Fotos del proyecto" detail="Cargar fotos y aplicar la selección del cliente.">
      <EditorPropertyRow label="Archivos" help="Pegá la selección antes de elegir Carpeta: solo se preparan esas fotos. Fotos permite elegir archivos manualmente.">
        <LocalFilePicker label="Elegir fotos" caption="Fotos / clips" icon={<PlusCircle aria-hidden="true" />} multiple accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime,.mov" onChange={props.onUploadPhotos} onChoose={props.onChoosePhotos ? () => props.onChoosePhotos!(false) : undefined} />
        <LocalFilePicker label="Elegir carpeta" caption="Carpeta" icon={<FolderOpen aria-hidden="true" />} multiple directory onChange={props.onUploadPhotos} onChoose={props.onChoosePhotos ? () => props.onChoosePhotos!(true) : undefined} />
        <span className="property-note">{props.libraryCount} fotos conectadas</span>
      </EditorPropertyRow>
      <EditorPropertyRow label="Selección" help="Pegá números, rangos o nombres y elegí Carpeta para cargar solo esas imágenes.">
        <textarea aria-label="Selección del cliente" value={props.rawText} onChange={e => props.onRawTextChange(e.target.value)} rows={1} maxLength={20000}
          placeholder="004, 012, 025-028, DSC_1020.jpg" className="studio-input selection-input font-mono" />
        <EditorToolButton label="Pegar mensaje de WhatsApp" caption="Pegar" onClick={() => void paste()}><Copy aria-hidden="true" /></EditorToolButton>
        <EditorToolButton label="Limpiar lista" caption="Limpiar" onClick={() => props.onRawTextChange('')}><Trash2 aria-hidden="true" /></EditorToolButton>
      </EditorPropertyRow>
      <EditorPropertyRow label="Montaje">
          <EditorToolButton label="Aplicar selección" caption="Aplicar" onClick={props.onApplySelection} disabled={!props.libraryCount || !props.rawText.trim()} variant="primary"><Check aria-hidden="true" /></EditorToolButton>
          <EditorToolButton label="Usar todas las fotos" caption="Todas" onClick={props.onUseAll} disabled={!props.libraryCount}><Images aria-hidden="true" /></EditorToolButton>
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
    <EditorSection activeSection={activeSection} number={2} title="Formato de salida" detail="Tótem TV, vertical u horizontal y cuadros por segundo.">
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
    <EditorSection activeSection={activeSection} number={3} title="Encuadre y giro" detail="Rellenar el cuadro, mover, ampliar y girar cada foto.">
        <EditorPropertyRow label="Ajuste">
          <div role="group" aria-label="Encuadre de las fotos" className="property-buttons">
            <EditorToolButton label="Mostrar foto completa" caption="Completa" hint="Mostrar foto completa: conserva los bordes y usa el fondo." aria-pressed={config.photoFit === 'contain'} onClick={() => change('photoFit', 'contain')}><Maximize aria-hidden="true" /></EditorToolButton>
            <EditorToolButton label="Rellenar cuadro (recortar)" caption="Rellenar" hint="Rellenar cuadro: recorta los bordes para cubrir los márgenes." aria-pressed={config.photoFit === 'cover'} onClick={() => change('photoFit', 'cover')}><Crop aria-hidden="true" /></EditorToolButton>
          </div>
        </EditorPropertyRow>
        <EditorPropertyRow label="Fondo" help="Se usa cuando mostrás la foto completa. Rellenar cuadro cubre los márgenes."><select aria-label="Fondo" disabled={config.photoFit === 'cover'} value={config.backgroundStyle} onChange={e => change('backgroundStyle', e.target.value as SequenceConfig['backgroundStyle'])} className="studio-input disabled:opacity-50">
          <option value="blur">Blur difuminado (Studio)</option><option value="black">Negro minimalista</option><option value="gradient">Gradiente moderno</option><option value="mirror">Espejo</option></select></EditorPropertyRow>

      <div ref={props.onFramingTargetChange} />
    </EditorSection>
    <EditorSection activeSection={activeSection} number={4} title="Composición de escenas" detail="Una, dos o tres fotos por escena y separación.">
      <EditorPropertyRow label="Agrupación" help="En horizontal, fotos verticales en columnas; en vertical, fotos horizontales en filas. Conserva el orden y los movimientos.">
        <div className="property-buttons" role="group" aria-label={horizontal ? 'Agrupar fotos verticales' : 'Agrupar fotos horizontales'}>
          {frameModes.map(mode => <EditorToolButton key={mode.value} label={mode.title} caption={mode.caption} hint={mode.title + ': ' + mode.detail} aria-pressed={config.horizontalGrouping === mode.value} onClick={() => change('horizontalGrouping', mode.value)} className="layout-choice"><LayoutGlyph slots={mode.slots} horizontal={horizontal} /></EditorToolButton>)}
        </div>
      </EditorPropertyRow>
      <EditorPropertyRow label="Separación" help="Elegí 0px para quitar la línea entre las fotos.">
        <div className="property-buttons" role="group" aria-label="Separación entre fotos">{[0,4,8,12,16].map(gap => <button type="button" key={gap} aria-pressed={config.splitGapSize === gap}
          onClick={() => change('splitGapSize', gap)} className="property-choice font-mono">{gap}px</button>)}</div>
      </EditorPropertyRow>
      <EditorPropertyRow label="Reagrupar"><EditorToolButton label="Reagrupar montaje con este modo" caption="Reagrupar" hint="Reagrupar con el modo elegido. Conserva el orden y los ajustes de las fotos." onClick={props.onRegroup} disabled={!props.sceneCount}><RefreshCw aria-hidden="true" /></EditorToolButton></EditorPropertyRow>
    </EditorSection>
    <EditorSection activeSection={activeSection} number={5} title="Ritmo y estilo" detail="Duración de las escenas y estilos rápidos.">
      <EditorPropertyRow label="Estilo"><div className="property-buttons">{presets.map((preset, index) => { const Icon = presetIcons[index]; return <EditorToolButton key={preset.name} label={preset.name} caption={presetCaptions[index]} hint={preset.name + ' · ' + preset.detail} aria-pressed={config.defaultDuration === preset.duration && config.musicTrack === preset.music && config.horizontalGrouping === preset.group && config.backgroundStyle === preset.background}
        onClick={() => onConfigChange({ ...config, defaultDuration: preset.duration, musicTrack: preset.music, horizontalGrouping: preset.group, backgroundStyle: preset.background })}>
        <Icon aria-hidden="true" />
      </EditorToolButton>; })}</div></EditorPropertyRow>
      <EditorPropertyRow label="Duración">
        <input id="scene-duration" aria-label="Duración de las escenas" type="range" min="0.4" max={Math.max(5, config.defaultDuration)} step="0.1" value={config.defaultDuration} onChange={e => change('defaultDuration', Number(e.target.value))} className="property-range accent-amber-500" />
        <output htmlFor="scene-duration" className="property-value text-amber-400" title={Math.round(config.defaultDuration * config.fps) + ' cuadros'}>{config.defaultDuration.toFixed(1)}s</output>
      </EditorPropertyRow>
    </EditorSection>
    <EditorSection activeSection={activeSection} number={6} title="Textos y marca" detail="Título, subtítulo y firma del fotógrafo.">
      <EditorPropertyRow label="Título"><input aria-label="Título" maxLength={120} value={config.eventTitle} onChange={e => change('eventTitle', e.target.value)} placeholder="Ej: Boda Valentina & Mateo" className="studio-input" /></EditorPropertyRow>
      <EditorPropertyRow label="Subtítulo"><input aria-label="Subtítulo" maxLength={120} value={config.eventSubtitle} onChange={e => change('eventSubtitle', e.target.value)} className="studio-input" /></EditorPropertyRow>
      <EditorPropertyRow label="Marca de agua"><input aria-label="Marca de agua" maxLength={120} value={config.watermark} onChange={e => change('watermark', e.target.value)} placeholder="Ej: @tu_fotografia" className="studio-input" /></EditorPropertyRow>
      <EditorPropertyRow label="Visibilidad"><EditorTool label={config.showOverlayText ? 'Ocultar textos' : 'Mostrar textos'}><label className="editor-switch"><input aria-label="Mostrar textos" type="checkbox" checked={config.showOverlayText} onChange={e => change('showOverlayText', e.target.checked)} /><span aria-hidden="true" className="editor-switch-track"><span /></span></label></EditorTool></EditorPropertyRow>
      <TextOverlayControls config={config} onChange={onConfigChange} />
    </EditorSection>
    <EditorSection activeSection={activeSection} number={7} title="Música y volumen" detail="Elegir música, cargar un archivo y ajustar su volumen.">
      <EditorPropertyRow label="Música"><select aria-label="Música" value={config.musicTrack} onChange={e => change('musicTrack', e.target.value)} className="studio-input">
          <option value="chill">Chill · Sintética (112 BPM)</option><option value="upbeat">Fiesta · Sintética (124 BPM)</option><option value="cinematic">Cinemática · Sintética (95 BPM)</option><option value="none">Sin música</option></select></EditorPropertyRow>
      <EditorPropertyRow label="Audio" help="El archivo cargado reemplaza la música sintética. Usá música con permiso de uso."><LocalFilePicker label="Cargar música" caption="Cargar" icon={<Music2 aria-hidden="true" />} accept="audio/*" onChange={props.onMusicUpload} onChoose={props.onChooseMusic} />
        {props.musicName && <><span className="property-note break-all">{props.musicName}</span><EditorToolButton label="Quitar música cargada" caption="Quitar" onClick={props.onClearMusic}><Trash2 aria-hidden="true" /></EditorToolButton></>}</EditorPropertyRow>
      <EditorPropertyRow label="Volumen"><input aria-label="Volumen" type="range" min="0" max="1" step="0.05" value={config.musicVolume} onChange={e => change('musicVolume', Number(e.target.value))} className="property-range accent-indigo-500" /><span className="property-value">{Math.round(config.musicVolume * 100)}%</span></EditorPropertyRow>
      {activeSection === 7 && <MusicTimeline config={config} onChange={onConfigChange} musicRevision={props.musicRevision} active disabled={props.busy} onAuditionStart={props.onAuditionStart} onAuditionFrame={props.onAuditionFrame} onError={props.onError} />}
    </EditorSection>
    <EditorSection activeSection={activeSection} number={8} title="Premiere y Google Drive" detail="Opcional: vincular los originales en el proyecto XML.">
      <EditorPropertyRow label="Ruta local" help="Solo para el XML de Premiere. Copiá la ruta del Explorador; no hace falta para grabar el video.">
        <input aria-label="Ruta de esa carpeta" value={config.localBasePath} onChange={e => change('localBasePath', e.target.value)} placeholder="D:\Fotos\Bodas_2024\FamiliaPerez\" className="studio-input font-mono" />
      </EditorPropertyRow>
      <EditorPropertyRow label="Google Drive" help="Enlace de referencia. Para usar las fotos, descargá o sincronizá la carpeta y cargalas desde tu computadora.">
        <input aria-label="Link de Google Drive de la sesión" type="url" value={config.driveLink} onChange={e => change('driveLink', e.target.value)} placeholder="https://drive.google.com/drive/folders/…" className="studio-input font-mono" />
        {drive.isValid && <EditorTool label="Abrir carpeta en Drive"><a href={config.driveLink} target="_blank" rel="noopener noreferrer" aria-label="Abrir carpeta en Drive" className="editor-icon-button"><ExternalLink aria-hidden="true" /><span aria-hidden="true" className="editor-tile-caption">Abrir</span></a></EditorTool>}
      </EditorPropertyRow>
    </EditorSection>
    <EditorSection activeSection={activeSection} number={9} title="Entrada de quince" detail="Fotos en ciclo, cambios al golpe de la canción y contador final.">
      <EntranceControls slides={props.slides} config={config} onChange={onConfigChange} musicName={props.musicName} musicRevision={props.musicRevision} onUpload={props.onMusicUpload} onChooseMusic={props.onChooseMusic} onError={props.onError} active={activeSection === 9} disabled={props.busy} onAuditionStart={props.onAuditionStart} onAuditionFrame={props.onAuditionFrame} onEditPhotos={() => props.onSectionChange(3)} />
    </EditorSection>
    </fieldset>
    </div>
  </section>;
}
