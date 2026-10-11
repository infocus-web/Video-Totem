import { useState, type ChangeEvent } from 'react';
import { CheckCircle2, Clock, Copy, FolderOpen, HardDrive, Link2, PlusCircle, SlidersHorizontal, Sparkles, SplitSquareVertical } from 'lucide-react';
import type { HorizontalGroupMode, SequenceConfig } from '../types';
import { parseGoogleDriveLink } from '../utils/photoParser';

interface Props {
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

export function ClientInputPanel(props: Props) {
  const { config, onConfigChange, busy } = props;
  const [namingOpen, setNamingOpen] = useState(false);
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
  return <fieldset disabled={busy} className="min-w-0 space-y-5 text-sm disabled:opacity-60">
    <section className="studio-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="section-heading"><span className="step-badge step-indigo">1</span><div>
          <h2>Selección de Fotos del Cliente</h2><p>Pegá los números que te mandó el cliente (WhatsApp, email o lista).</p>
        </div></div>
        <div className="flex flex-wrap gap-2"><span className="count-badge count-indigo">{props.selectedCount} fotos</span><span className="count-badge count-green">{props.sceneCount} escenas {config.aspectRatio}</span></div>
      </div>
      <textarea aria-label="Selección del cliente" value={props.rawText} onChange={e => props.onRawTextChange(e.target.value)} rows={4} maxLength={20000}
        placeholder="004, 012, 025-028, DSC_1020.jpg · o pegá el mensaje completo" className="studio-input min-h-28 resize-y p-3.5 font-mono text-xs" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-neutral-500">Rápido:</span>
        <button type="button" onClick={() => void paste()} className="quick-button"><Copy aria-hidden="true" />Pegar mensaje de WhatsApp</button>
        <button type="button" onClick={() => props.onRawTextChange('')} className="quick-button">Limpiar lista</button>
        <label className="quick-button !border-indigo-500/30 !text-indigo-300"><PlusCircle aria-hidden="true" />Subir fotos locales
          <input aria-label="Elegir fotos" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={props.onUploadPhotos} className="sr-only" /></label>
        <label className="quick-button"><FolderOpen aria-hidden="true" />Elegir carpeta
          <input aria-label="Elegir carpeta" type="file" multiple {...{ webkitdirectory: '', directory: '' }} onChange={props.onUploadPhotos} className="sr-only" /></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-3">
        <span className="text-xs text-neutral-400"><span>{props.libraryCount} fotos conectadas</span> · se procesan en tu navegador</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={props.onApplySelection} disabled={!props.libraryCount || !props.rawText.trim()} className="primary-button">Aplicar selección</button>
          <button type="button" onClick={props.onUseAll} disabled={!props.libraryCount} className="control">Usar todas las fotos</button>
        </div>
      </div>
      {!props.libraryCount && <p className="text-xs text-indigo-300">Empezá con Subir fotos locales o Elegir carpeta. Si la selección está vacía, armamos el montaje con todas.</p>}
    </section>

    <section className="studio-card stacking-card space-y-4">
      <div className="section-heading"><span className="step-badge !bg-indigo-500 !text-white"><SplitSquareVertical aria-hidden="true" className="h-4 w-4" /></span><div>
        <h2>Apilado de Fotos Horizontales (2 en 1 / 3 en 1)</h2><p>Dos fotos arriba y abajo, o tres apiladas para completar el cuadro vertical.</p>
      </div></div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="group" aria-label="Agrupar fotos horizontales">
        {modes.map(mode => <button type="button" key={mode.value} aria-pressed={config.horizontalGrouping === mode.value} onClick={() => change('horizontalGrouping', mode.value)}
          className={'stack-option ' + (config.horizontalGrouping === mode.value ? 'stack-option-selected' : '')}>
          <span aria-hidden="true" className={'stack-icon ' + (mode.slots === 1 ? 'justify-center' : '')}>
            {mode.slots ? Array.from({ length: mode.slots }, (_, i) => <span key={i} className={mode.slots === 1 ? 'h-4 w-full rounded-sm bg-neutral-500' : 'min-h-0 flex-1 rounded-sm bg-indigo-400/80'} />) : <Sparkles className="m-auto h-5 w-5 text-amber-400" />}
          </span>
          <span><span className="block text-xs font-bold text-neutral-100">{mode.title}</span><span className="mt-1 block text-xs leading-snug text-neutral-400">{mode.detail}</span></span>
        </button>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-3">
        <span className="text-xs text-neutral-400">Línea divisoria / separación entre fotos apiladas:</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Separación entre fotos">{[0,4,8,12,16].map(gap => <button type="button" key={gap} aria-pressed={config.splitGapSize === gap}
          onClick={() => change('splitGapSize', gap)} className={'rounded px-2 py-1 font-mono text-xs ' + (config.splitGapSize === gap ? 'bg-indigo-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white')}>{gap}px</button>)}</div>
      </div>
      <p className="text-xs text-neutral-500">Cambiar el modo redistribuye las escenas. Conserva el orden, los movimientos y usa la duración de la primera foto de cada grupo.</p>
      <details className="text-xs text-neutral-400"><summary className="cursor-pointer">Opciones de agrupación</summary><p className="my-2">Si cambiaste cuadros en la línea de tiempo, podés volver a aplicar este modo a todo el montaje.</p><button type="button" onClick={props.onRegroup} disabled={!props.sceneCount} className="quick-button">Reagrupar montaje con este modo</button></details>
    </section>

    <details className="studio-card space-y-4">
      <summary className="cursor-pointer text-sm font-bold text-neutral-200">Rutas de Archivos & Google Drive <span className="ml-2 text-xs font-normal text-neutral-400">Opcional · Premiere</span></summary>
      <p className="text-xs text-neutral-400">Para vincular los originales con Premiere Pro y tu disco.</p>
      <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-neutral-300"><HardDrive aria-hidden="true" className="h-3.5 w-3.5" />Ruta local en tu PC / Mac:</span>
        <input aria-label="Ruta de esa carpeta" value={config.localBasePath} onChange={e => change('localBasePath', e.target.value)} placeholder="D:\Fotos\Bodas_2024\FamiliaPerez\" className="studio-input font-mono text-xs" /></label>
      <p className="text-xs text-neutral-400">Solo para el XML de Premiere. Copiá la ruta del Explorador de archivos; no hace falta para grabar el video.</p>
      <div>
        <label className="block"><span className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-neutral-300"><span className="flex items-center gap-1.5"><Link2 aria-hidden="true" className="h-3.5 w-3.5" />Link de Google Drive de la sesión:</span>
          {drive.isValid && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />Enlace válido de Drive</span>}</span>
          <input type="url" value={config.driveLink} onChange={e => change('driveLink', e.target.value)} placeholder="https://drive.google.com/drive/folders/…" className="studio-input font-mono text-xs" /></label>
        <p className="mt-2 text-xs text-neutral-500">Descargá o sincronizá la carpeta y cargá las fotos locales. El enlace queda como referencia del proyecto.</p>
        {drive.isValid && <a href={config.driveLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-indigo-300 underline">Abrir carpeta en Drive ↗</a>}
      </div>
      <button type="button" aria-expanded={namingOpen} aria-controls="filename-options" onClick={() => setNamingOpen(value => !value)} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"><SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />{namingOpen ? 'Ocultar' : 'Configurar'} formato de nombres (IMG_, ceros, extensión)</button>
      {namingOpen && <div id="filename-options" className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3 sm:grid-cols-3">
        <label className="text-xs text-neutral-400">Prefijo<input value={config.filenamePrefix} onChange={e => change('filenamePrefix', e.target.value)} className="studio-input mt-1 font-mono" /></label>
        <label className="text-xs text-neutral-400">Dígitos<select value={config.filenamePadding} onChange={e => change('filenamePadding', Number(e.target.value))} className="studio-input mt-1">{[0,3,4,5,6].map(n => <option key={n} value={n}>{n || 'Exactos'}</option>)}</select></label>
        <label className="text-xs text-neutral-400">Extensión<select value={config.filenameExtension} onChange={e => change('filenameExtension', e.target.value)} className="studio-input mt-1">{['.jpg','.jpeg','.png','.webp','.avif'].map(ext => <option key={ext}>{ext}</option>)}</select></label>
      </div>}
    </details>

    <section className="studio-card space-y-4">
      <div className="section-heading"><span className="step-badge step-amber">3</span><div><h2>Ritmo, Estilo & Música del Video</h2><p>Adaptá la velocidad y los efectos al tipo de evento.</p></div></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{presets.map(preset => <button type="button" key={preset.name} className="preset-card"
        onClick={() => onConfigChange({ ...config, defaultDuration: preset.duration, musicTrack: preset.music, horizontalGrouping: preset.group, backgroundStyle: preset.background })}>
        <span className="block text-xs font-semibold text-neutral-200">{preset.name}</span><span className="mt-1 block text-xs text-neutral-400">{preset.detail}</span>
      </button>)}</div>
      <div className="space-y-2 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><label htmlFor="scene-duration" className="flex items-center gap-1.5 font-medium text-neutral-300"><Clock aria-hidden="true" className="h-3.5 w-3.5" />Duración por escena:</label>
          <span className="font-mono font-bold text-amber-400">{config.defaultDuration.toFixed(1)}s <span className="font-normal text-neutral-500">({Math.round(config.defaultDuration * config.fps)} frames)</span></span></div>
        <input id="scene-duration" aria-label="Duración de las escenas" type="range" min="0.4" max={Math.max(5, config.defaultDuration)} step="0.1" value={config.defaultDuration} onChange={e => change('defaultDuration', Number(e.target.value))} className="w-full accent-amber-500" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <p className="text-xs font-semibold text-neutral-300">Cómo encuadrar las fotos</p>
          <div role="group" aria-label="Encuadre de las fotos" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" aria-pressed={config.photoFit === 'contain'} onClick={() => change('photoFit', 'contain')} className={'stack-option ' + (config.photoFit === 'contain' ? 'stack-option-selected' : '')}>
              <span><span className="block text-xs font-bold">Mostrar foto completa</span><span className="mt-1 block text-xs text-neutral-400">Mantiene toda la foto y usa el fondo elegido en los márgenes.</span></span>
            </button>
            <button type="button" aria-pressed={config.photoFit === 'cover'} onClick={() => change('photoFit', 'cover')} className={'stack-option ' + (config.photoFit === 'cover' ? 'stack-option-selected' : '')}>
              <span><span className="block text-xs font-bold">Rellenar cuadro (recortar)</span><span className="mt-1 block text-xs text-neutral-400">Cubre todo el cuadro sin franjas. Recorta los bordes sin deformar la foto.</span></span>
            </button>
          </div>
          <p className="text-[11px] text-neutral-500">Se aplica a cada foto, también en 2 en 1 y 3 en 1, en la vista previa y el video. Para quitar la línea entre fotos, elegí 0px en la separación.</p>
        </div>
        <label className="text-xs text-neutral-400">Música de fondo:<select aria-label="Música" value={config.musicTrack} onChange={e => change('musicTrack', e.target.value)} className="studio-input mt-1">
          <option value="chill">Chill · Sintética (112 BPM)</option><option value="upbeat">Fiesta · Sintética (124 BPM)</option><option value="cinematic">Cinemática · Sintética (95 BPM)</option><option value="none">Sin música</option></select></label>
        <label className="text-xs text-neutral-400">Fondo al mostrar la foto completa:<select aria-label="Fondo" disabled={config.photoFit === 'cover'} value={config.backgroundStyle} onChange={e => change('backgroundStyle', e.target.value as SequenceConfig['backgroundStyle'])} className="studio-input mt-1 disabled:opacity-50">
          <option value="blur">Blur difuminado (Studio)</option><option value="black">Negro minimalista</option><option value="gradient">Gradiente moderno</option><option value="mirror">Espejo</option></select></label>
        <label className="text-xs text-neutral-400">Título en pantalla:<input aria-label="Título" maxLength={120} value={config.eventTitle} onChange={e => change('eventTitle', e.target.value)} placeholder="Ej: Boda Valentina & Mateo" className="studio-input mt-1" /></label>
        <label className="text-xs text-neutral-400">Marca de agua / Fotógrafo:<input aria-label="Marca de agua" maxLength={120} value={config.watermark} onChange={e => change('watermark', e.target.value)} placeholder="Ej: @tu_fotografia" className="studio-input mt-1" /></label>
        <label className="text-xs text-neutral-400">Subtítulo:<input maxLength={120} value={config.eventSubtitle} onChange={e => change('eventSubtitle', e.target.value)} className="studio-input mt-1" /></label>
        <label className="flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={config.showOverlayText} onChange={e => change('showOverlayText', e.target.checked)} className="accent-indigo-500" />Mostrar textos</label>
      </div>
      <div className="flex flex-wrap items-center gap-2"><label className="quick-button">Cargar música<input aria-label="Cargar música" type="file" accept="audio/*" onChange={props.onMusicUpload} className="sr-only" /></label>
        {props.musicName && <><span className="max-w-full break-all text-xs text-neutral-300">{props.musicName}</span><button type="button" className="quick-button" onClick={props.onClearMusic}>Quitar música cargada</button></>}</div>
      <p className="text-xs text-neutral-500">El archivo cargado reemplaza la música sintética. Usá música con permiso de uso.</p>
      <label className="block text-xs text-neutral-400">Volumen · {Math.round(config.musicVolume * 100)}%<input aria-label="Volumen" type="range" min="0" max="1" step="0.05" value={config.musicVolume} onChange={e => change('musicVolume', Number(e.target.value))} className="mt-2 w-full accent-indigo-500" /></label>
      <div className="grid grid-cols-1 gap-3 border-t border-neutral-800 pt-4 sm:grid-cols-2">
        <label className="text-xs text-neutral-400 sm:col-span-2">Nombre del proyecto<input maxLength={120} value={config.name} onChange={e => change('name', e.target.value)} className="studio-input mt-1" /></label>
        <label className="text-xs text-neutral-400">Formato<select aria-label="Formato" value={config.width + 'x' + config.height} onChange={e => { const [width,height] = e.target.value.split('x').map(Number); onConfigChange({ ...config, width, height, aspectRatio: width === height ? '1:1' : width > height ? '16:9' : height === 1350 ? '4:5' : '9:16' }); }} className="studio-input mt-1">
          {[[1080,1920,'Vertical 9:16'],[1080,1080,'Cuadrado 1:1'],[1920,1080,'Horizontal 16:9'],[1080,1350,'Retrato 4:5']].map(([w,h,label]) => <option key={String(w) + 'x' + h} value={String(w) + 'x' + h}>{label}</option>)}
          {!['1080x1920','1080x1080','1920x1080','1080x1350'].includes(config.width + 'x' + config.height) && <option value={config.width + 'x' + config.height}>{config.width} × {config.height}</option>}
        </select></label>
        <label className="text-xs text-neutral-400">FPS<select aria-label="FPS" value={config.fps} onChange={e => change('fps', Number(e.target.value))} className="studio-input mt-1">{[24,25,30,50,60].map(fps => <option key={fps}>{fps}</option>)}</select></label>
      </div>
    </section>
  </fieldset>;
}

