import type { ChangeEvent } from 'react';
import type { SequenceConfig } from '../types';
import { parseGoogleDriveLink } from '../utils/photoParser';

interface Props {
  rawText: string; onRawTextChange: (value: string) => void;
  config: SequenceConfig; onConfigChange: (config: SequenceConfig) => void;
  libraryCount: number; onUploadPhotos: (event: ChangeEvent<HTMLInputElement>) => void;
  onApplySelection: () => void; onUseAll: () => void; onRegroup: () => void;
  onMusicUpload: (event: ChangeEvent<HTMLInputElement>) => void; musicName: string;
  onClearMusic: () => void; busy: boolean;
}
const inputClass = 'w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none';
const buttonClass = 'rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50';
export function ClientInputPanel(props: Props) {
  const { config, onConfigChange, busy } = props;
  const change = <K extends keyof SequenceConfig>(key: K, value: SequenceConfig[K]) => onConfigChange({ ...config, [key]: value });
  const drive = parseGoogleDriveLink(config.driveLink);
  return <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
    <section className="panel space-y-4">
      <div><h2 className="font-bold">1. Conectá las fotos de la sesión</h2>
        <p className="mt-1 text-sm text-neutral-400">Se procesan en tu navegador. No se suben a un servidor.</p></div>
      <div className="flex flex-wrap gap-3">
        <label className={buttonClass}>Elegir fotos<input aria-label="Elegir fotos" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={props.onUploadPhotos} className="sr-only" /></label>
        <label className={buttonClass}>Elegir carpeta<input aria-label="Elegir carpeta" type="file" multiple {...{ webkitdirectory: '', directory: '' }} onChange={props.onUploadPhotos} className="sr-only" /></label>
        <span className="self-center text-sm text-indigo-300">{props.libraryCount} fotos conectadas</span>
      </div>
      <label className="block text-sm">Ruta de esa carpeta en tu computadora (para Premiere)
        <input value={config.localBasePath} onChange={e => change('localBasePath', e.target.value)} placeholder="D:\Fotos\Sesion o /Users/usuario/Fotos/Sesion" className={inputClass + ' mt-1 font-mono'} /></label>
      <p className="text-xs text-neutral-400">El navegador no conoce la ruta absoluta. Copiala del Explorador de archivos para vincular los originales en Premiere.</p>
      <details className="text-sm"><summary className="cursor-pointer text-neutral-300">Tengo las fotos en Google Drive</summary>
        <p className="mt-3 text-neutral-400">Descargá o sincronizá la carpeta con Drive para escritorio y seleccioná los archivos locales arriba.</p>
        <label className="block mt-3">Enlace de referencia<input type="url" value={config.driveLink} onChange={e => change('driveLink', e.target.value)} className={inputClass + ' mt-1'} /></label>
        {drive.isValid && <a href={config.driveLink} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-indigo-300 underline">Abrir en Drive ↗</a>}
      </details>
    </section>
    <section className="panel space-y-4">
      <div><h2 className="font-bold">2. Elegí las fotos del reel</h2><p className="mt-1 text-sm text-neutral-400">Pegá números, nombres o rangos. Revisá que el mensaje no incluya números ajenos a la selección.</p></div>
      <label className="block text-sm">Selección del cliente<textarea value={props.rawText} onChange={e => props.onRawTextChange(e.target.value)} rows={4} maxLength={20000} placeholder="004, 012, 025-028, DSC_1020.jpg" className={inputClass + ' mt-1 font-mono'} /></label>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs">Prefijo<input value={config.filenamePrefix} onChange={e => change('filenamePrefix', e.target.value)} className={inputClass + ' mt-1'} /></label>
        <label className="text-xs">Dígitos<select value={config.filenamePadding} onChange={e => change('filenamePadding', Number(e.target.value))} className={inputClass + ' mt-1'}>{[0,3,4,5,6].map(n => <option key={n} value={n}>{n || 'Exactos'}</option>)}</select></label>
        <label className="text-xs">Extensión<select value={config.filenameExtension} onChange={e => change('filenameExtension', e.target.value)} className={inputClass + ' mt-1'}>{['.jpg','.jpeg','.png','.webp','.avif'].map(ext => <option key={ext}>{ext}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap gap-3"><button onClick={props.onApplySelection} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500">Aplicar selección</button><button onClick={props.onUseAll} className={buttonClass}>Usar todas las fotos</button></div>
      <p className="text-xs text-neutral-500">Aplicar selección reconstruye las escenas. Editar el texto solo no cambia el montaje.</p>
    </section>
    <section className="panel space-y-4">
      <h2 className="font-bold">3. Ajustá el estilo</h2>
      <div className="flex flex-wrap gap-2">
        {[
          { name:'Boda',duration:1.8,music:'cinematic',group:'auto-split-2',background:'blur' },
          { name:'Fiesta',duration:0.9,music:'upbeat',group:'auto-split-3',background:'blur' },
          { name:'Portfolio',duration:1.4,music:'chill',group:'auto-adaptive',background:'blur' },
          { name:'Inmobiliaria',duration:2.2,music:'chill',group:'auto-split-2',background:'black' },
        ].map(preset => <button key={preset.name} className={buttonClass} onClick={() => onConfigChange({ ...config, defaultDuration:preset.duration, musicTrack:preset.music,
          horizontalGrouping:preset.group as SequenceConfig['horizontalGrouping'], backgroundStyle:preset.background as SequenceConfig['backgroundStyle'] })}>{preset.name}</button>)}
      </div>
      <label className="block text-sm">Nombre del proyecto<input value={config.name} onChange={e => change('name', e.target.value)} className={inputClass + ' mt-1'} maxLength={120} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">Formato<select aria-label="Formato" value={config.width + 'x' + config.height} onChange={e => { const [width,height] = e.target.value.split('x').map(Number); onConfigChange({ ...config, width, height, aspectRatio: width === height ? '1:1' : width > height ? '16:9' : height === 1350 ? '4:5' : '9:16' }); }} className={inputClass + ' mt-1'}>
          {[[1080,1920,'Vertical 9:16'],[1080,1080,'Cuadrado 1:1'],[1920,1080,'Horizontal 16:9'],[1080,1350,'Retrato 4:5']].map(([w,h,label]) => <option key={String(w)+'x'+h} value={String(w)+'x'+h}>{label}</option>)}
          {!['1080x1920','1080x1080','1920x1080','1080x1350'].includes(config.width+'x'+config.height) && <option value={config.width+'x'+config.height}>{config.width} × {config.height}</option>}
        </select></label>
        <label className="text-sm">FPS<select value={config.fps} onChange={e => change('fps', Number(e.target.value))} className={inputClass + ' mt-1'}>{[24,25,30,50,60].map(fps => <option key={fps}>{fps}</option>)}</select></label>
        <label className="text-sm">Duración de las escenas<input type="number" min="0.4" max="60" step="0.1" value={config.defaultDuration} onChange={e => change('defaultDuration', Number(e.target.value))} className={inputClass + ' mt-1'} /></label>
        <label className="text-sm">Fondo<select value={config.backgroundStyle} onChange={e => change('backgroundStyle', e.target.value as SequenceConfig['backgroundStyle'])} className={inputClass + ' mt-1'}><option value="blur">Difuminado</option><option value="black">Negro</option><option value="gradient">Gradiente</option><option value="mirror">Espejo</option></select></label>
      </div>
      <label className="block text-sm">Agrupar fotos horizontales<select value={config.horizontalGrouping} onChange={e => change('horizontalGrouping', e.target.value as SequenceConfig['horizontalGrouping'])} className={inputClass + ' mt-1'}><option value="single">Una por escena</option><option value="auto-split-2">Dos por escena</option><option value="auto-split-3">Tres por escena</option><option value="auto-adaptive">Adaptativo (hasta tres)</option></select></label>
      <button className={buttonClass} onClick={props.onRegroup}>Reagrupar montaje con este modo</button>
      <p className="text-xs text-neutral-500">Reagrupar reemplaza la distribución de las escenas. Los cambios de orden y duración se conservan hasta que lo apliques.</p>
      <label className="block text-sm">Música<select value={config.musicTrack} onChange={e => change('musicTrack', e.target.value)} className={inputClass + ' mt-1'}><option value="chill">Sintética · Chill</option><option value="upbeat">Sintética · Fiesta</option><option value="cinematic">Sintética · Cinemática</option><option value="none">Sin música</option></select></label>
      <div className="flex flex-wrap items-center gap-3"><label className={buttonClass}>Cargar música<input aria-label="Cargar música" type="file" accept="audio/*" onChange={props.onMusicUpload} className="sr-only" /></label>
        {props.musicName && <><span className="text-xs text-neutral-300">{props.musicName}</span><button className={buttonClass} onClick={props.onClearMusic}>Quitar música cargada</button></>}</div>
      <p className="text-xs text-neutral-500">El archivo cargado reemplaza la música sintética. Al reabrir el proyecto tenés que cargarlo otra vez. Usá música con permiso de uso.</p>
      <label className="block text-sm">Volumen · {Math.round(config.musicVolume*100)}%<input aria-label="Volumen" type="range" min="0" max="1" step="0.05" value={config.musicVolume} onChange={e => change('musicVolume', Number(e.target.value))} className="mt-2 w-full accent-indigo-500" /></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={config.showOverlayText} onChange={e => change('showOverlayText', e.target.checked)} />Mostrar textos</label>
      {(['eventTitle','eventSubtitle','watermark'] as const).map((key,index) => <label key={key} className="block text-sm">{['Título','Subtítulo','Marca de agua'][index]}<input maxLength={120} value={config[key]} onChange={e => change(key, e.target.value)} className={inputClass + ' mt-1'} /></label>)}
    </section>
  </fieldset>;
}

