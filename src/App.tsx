/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { lazy, Suspense, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Navbar } from './components/Navbar';
import { ClientInputPanel } from './components/ClientInputPanel';
import { VideoPreviewPlayer, type PreviewHandle } from './components/VideoPreviewPlayer';
import { PreparationProgress } from './components/PreparationProgress';
import type { SequenceSlide, SequenceConfig, ViewTab, ParsedPremiereProject, FilePreparationProgress } from './types';
import { parseClientSelectionText, resolveSelection, buildSlidesFromPhotos } from './utils/photoParser';
import { DEFAULT_CONFIG, clampDuration } from './utils/config';
import { updateProjectConfig } from './utils/projectConfig';
import { importPhotos } from './utils/importPhotos';
import { audioEngine } from './utils/audioSynthesizer';
import { decodeProject, serializeProject, STORAGE_KEY, type SavedProject } from './utils/projectStorage';
import { downloadBlob } from './utils/download';

const TimelineView = lazy(() => import('./components/TimelineView').then(module => ({ default: module.TimelineView })));
const PremiereInspectorModal = lazy(() => import('./components/PremiereInspectorModal').then(module => ({ default: module.PremiereInspectorModal })));
const ExportModal = lazy(() => import('./components/ExportModal').then(module => ({ default: module.ExportModal })));
const FaqGuideModal = lazy(() => import('./components/FaqGuideModal').then(module => ({ default: module.FaqGuideModal })));

function DeferredDialog({ open, children }: { open: boolean; children: ReactNode }) {
  const [wasOpened, setWasOpened] = useState(false);
  useEffect(() => { if (open) setWasOpened(true); }, [open]);
  // Keep opened tools mounted so inspecting an XML survives closing the dialog.
  return open || wasOpened ? <Suspense fallback={<p role="status" className="fixed bottom-4 right-4 z-50 rounded-xl bg-neutral-800 p-3 text-sm">Abriendo herramienta…</p>}>{children}</Suspense> : null;
}

function initialProject(): SavedProject {
  try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) return decodeProject(stored); } catch { /* An invalid or unavailable saved draft never prevents opening the app. */ }
  return { version: 1, rawText: '', config: { ...DEFAULT_CONFIG }, library: [], slides: [] };
}
export default function App() {
  const [project, setProject] = useState(initialProject);
  const [tab, setTab] = useState<ViewTab>('editor');
  const [premiereOpen, setPremiereOpen] = useState(false), [exportOpen, setExportOpen] = useState(false), [guideOpen, setGuideOpen] = useState(false);
  const [busy, setBusy] = useState(false), [importing, setImporting] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [importProgress, setImportProgress] = useState<FilePreparationProgress | null>(null);
  const [message, setMessage] = useState(''), [saveStatus, setSaveStatus] = useState('Guardando…');
  const [musicName, setMusicName] = useState(''), [musicRevision, setMusicRevision] = useState(0);
  const preview = useRef<PreviewHandle>(null), importAbort = useRef<AbortController | null>(null);
  const urls = useRef(new Set<string>());
  const { config, rawText, slides, library } = project;
  const reconnect = library.filter(photo => !photo.previewUrl).length;
  const connectedCount = library.length - reconnect;
  const selectedCount = slides.reduce((sum, slide) => sum + slide.photos.length, 0);
  const totalDuration = slides.reduce((sum, slide) => sum + slide.duration, 0);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY,serializeProject(project)); setSaveStatus('Guardado en este navegador'); }
      catch { setSaveStatus('No se pudo guardar automáticamente. Descargá el proyecto JSON.'); }
    },600);
    return () => window.clearTimeout(timer);
  }, [project]);
  useEffect(() => () => { importAbort.current?.abort(); urls.current.forEach(url => URL.revokeObjectURL(url)); audioEngine.stop(); }, []);
  const notify = (value: string) => setMessage(value);
  const changeConfig = (newConfig: SequenceConfig) => setProject(prev => updateProjectConfig(prev, newConfig));
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []); event.target.value = ''; if (!files.length || importing || busy) return;
    setImporting(true); setImportProgress(null); setMessage(''); importAbort.current = new AbortController();
    try {
      const imported = await importPhotos(files,config,importAbort.current.signal,setImportProgress);
      const merged = new Map(library.map(photo => [photo.id,photo]));
      const previousPhotos = new Map(merged);
      imported.forEach(photo => merged.set(photo.id,photo));
      if (merged.size > 400) { imported.forEach(photo => URL.revokeObjectURL(photo.previewUrl)); throw new Error('La biblioteca admite hasta 400 fotos. Abrí otro proyecto para una sesión distinta.'); }
      imported.forEach(photo => {
        const old = previousPhotos.get(photo.id);
        if (old?.previewUrl) { URL.revokeObjectURL(old.previewUrl); urls.current.delete(old.previewUrl); }
        urls.current.add(photo.previewUrl);
      });
      const createMontage = !slides.length && !rawText.trim();
      setProject(prev => ({ ...prev, library: [...merged.values()], slides: createMontage
        ? buildSlidesFromPhotos([...merged.values()].filter(photo => photo.previewUrl), config.horizontalGrouping, config.defaultDuration)
        : prev.slides.map(slide => ({ ...slide, photos: slide.photos.map(photo => ({
          ...photo, ...merged.get(photo.id), orientation: photo.orientation, kenBurns: photo.kenBurns })) })) }));
      setMessage(imported.length + (createMontage ? ' fotos conectadas. El montaje ya está listo: tocá Reproducir.' : ' fotos conectadas. Aplicá la selección o usá todas.'));
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudieron cargar las fotos.'); }
    finally { setImporting(false); setImportProgress(null); importAbort.current = null; }
  };
  const applySelection = () => {
    try {
      const requested = parseClientSelectionText(rawText,{ localBasePath: config.localBasePath, prefix: config.filenamePrefix, padding: config.filenamePadding, extension: config.filenameExtension, defaultDuration: config.defaultDuration });
      if (!requested.length) throw new Error('Ingresá números o nombres de fotos.');
      const selection = resolveSelection(requested,library);
      if (selection.missing.length || selection.ambiguous.length) throw new Error([
        selection.missing.length ? 'Fotos faltantes o sin conectar: ' + selection.missing.join(', ') : '',
        selection.ambiguous.length ? 'Nombres ambiguos (hay más de un archivo): ' + selection.ambiguous.join(', ') : ''
      ].filter(Boolean).join('. ') + '. El montaje anterior se conserva.');
      setProject(prev => ({ ...prev, slides: buildSlidesFromPhotos(selection.resolved.map(photo => ({ ...photo, duration: config.defaultDuration, transition: config.defaultTransition })),config.horizontalGrouping,config.defaultDuration) }));
      notify(selection.resolved.length + ' fotos seleccionadas.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Selección inválida.'); }
  };
  const useAll = () => {
    if (!library.length || reconnect) { notify('Conectá las fotos de la biblioteca antes de usarlas.'); return; }
    setProject(prev => ({ ...prev, slides: buildSlidesFromPhotos(library.map(photo => ({ ...photo, duration: config.defaultDuration, transition: config.defaultTransition })),config.horizontalGrouping,config.defaultDuration) }));
    notify('Se agregaron todas las fotos al montaje.');
  };
  const regroup = () => setProject(prev => ({ ...prev, slides: buildSlidesFromPhotos(prev.slides.flatMap(slide => slide.photos.map(photo => ({ ...photo, duration: slide.duration, transition: slide.transition }))),config.horizontalGrouping,config.defaultDuration) }));
  const updateSlide = (index: number, update: Partial<SequenceSlide>) => {
    if (update.layout) {
      const desired = update.layout === 'split-3' ? 3 : update.layout === 'split-2' ? 2 : 1;
      const current = slides[index];
      if (!current) return;
      if (desired === 1 && current.photos.length > 1) {
        setProject(prev => ({ ...prev, slides: prev.slides.flatMap((slide,i) => i === index ? slide.photos.map(photo => ({ ...slide, id: crypto.randomUUID(), layout: 'single' as const, photos: [photo] })) : [slide]) }));
        return;
      }
      let end = index, available = [...current.photos];
      while (available.length < desired && end + 1 < slides.length) { end++; available.push(...slides[end].photos); }
      if (available.length < desired) { notify('No hay suficientes fotos consecutivas para ese diseño.'); return; }
      const replacement: SequenceSlide[] = [{ ...current, layout: update.layout, photos: available.slice(0,desired) }];
      available.slice(desired).forEach(photo => replacement.push({ ...current, id: crypto.randomUUID(), layout: 'single', photos: [photo] }));
      setProject(prev => ({ ...prev, slides: [...prev.slides.slice(0,index), ...replacement, ...prev.slides.slice(end+1)] }));
      return;
    }
    setProject(prev => ({ ...prev, slides: prev.slides.map((slide,i) => i === index ? { ...slide, ...update, duration: update.duration === undefined ? slide.duration : clampDuration(update.duration) } : slide) }));
  };
  const moveSlide = (index: number, direction: 'left' | 'right') => setProject(prev => {
    const next = index + (direction === 'left' ? -1 : 1);
    if (next < 0 || next >= prev.slides.length) return prev;
    const reordered = [...prev.slides]; [reordered[index],reordered[next]] = [reordered[next],reordered[index]];
    return { ...prev, slides: reordered };
  });
  const toggleOrientation = (slideIndex: number, photoIndex: number) => setProject(prev => ({ ...prev, slides: prev.slides.map((slide,i) => i === slideIndex ? {
    ...slide, photos: slide.photos.map((photo,j) => j === photoIndex ? { ...photo, orientation: photo.orientation === 'horizontal' ? 'vertical' : 'horizontal' } : photo)
  } : slide) }));
  const applyPremiere = (parsed: ParsedPremiereProject) => {
    if (![24,25,30,50,60].includes(parsed.timebase)) { notify('El XML usa FPS fraccionarios. Elegí un formato compatible en el editor.'); setPremiereOpen(false); return; }
    changeConfig({ ...config, width: parsed.width, height: parsed.height, fps: parsed.timebase, name: parsed.sequenceName });
    setPremiereOpen(false); notify('Se aplicó el formato del XML.');
  };
  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      if (file.size > 2000000) throw new Error('El archivo de proyecto es demasiado grande.');
      const restored = decodeProject(await file.text());
      urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear();
      audioEngine.clearTrack(); setMusicName(''); setMusicRevision(value => value + 1);
      setProject(restored); notify('Proyecto abierto. Volvé a conectar su carpeta de fotos y su música.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Proyecto inválido.'); }
  };
  const uploadMusic = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setImporting(true); setImportProgress(null);
    try { await audioEngine.loadTrack(file); setMusicName(file.name); setMusicRevision(value => value + 1); if (config.musicTrack === 'none') changeConfig({ ...config, musicTrack: 'chill' }); }
    catch (error) { notify(error instanceof Error ? error.message : 'Audio no compatible.'); }
    finally { setImporting(false); }
  };
  const newProject = () => {
    if (library.length || slides.length) downloadBlob(new Blob([serializeProject(project)], { type:'application/json' }), (config.name || 'AutoReel') + '_respaldo.autoreel.json');
    urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear();
    audioEngine.clearTrack(); setMusicName(''); setMusicRevision(value => value + 1);
    setProject({ version:1, rawText:'', config:{ ...DEFAULT_CONFIG }, library:[], slides:[] }); setTab('editor');
    notify('Proyecto nuevo. Si había un montaje, se descargó su respaldo JSON.');
  };
  return <div className="min-h-screen bg-neutral-950 text-neutral-100">
    <Navbar currentTab={tab} onTabChange={setTab} onOpenPremiereModal={() => !busy && !importing && setPremiereOpen(true)} onOpenExportModal={() => !busy && !importing && setExportOpen(true)} onOpenFaqModal={() => setGuideOpen(true)} totalPhotos={selectedCount} totalDuration={totalDuration} formatLabel={config.width + ' × ' + config.height} busy={busy || importing} />
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 items-center"><span className="text-xs text-neutral-500">{saveStatus}</span>
          <button className="control" disabled={busy || importing} onClick={newProject}>Nuevo proyecto</button>
          <button className="control" disabled={busy || importing} onClick={() => downloadBlob(new Blob([serializeProject(project)],{ type:'application/json' }), (config.name || 'AutoReel') + '.autoreel.json')}>Guardar proyecto JSON</button>
          <label className="control">Abrir proyecto<input aria-label="Abrir proyecto" type="file" accept=".json" disabled={busy || importing} className="sr-only" onChange={event => void loadProject(event)} /></label>
        </div>
      </div>
      {message && <div role="status" className="flex justify-between gap-3 rounded-xl border border-indigo-800 bg-indigo-950/40 p-3 text-sm text-indigo-100"><p>{message}</p><button aria-label="Cerrar aviso" onClick={() => setMessage('')}>✕</button></div>}
      {importing && <PreparationProgress title={importProgress ? (reconnect > 0 ? 'Reconectando fotos' : 'Preparando fotos') : 'Preparando archivos locales'} progress={importProgress} />}
      {reconnect > 0 && !importing && <p role="status" className="text-sm text-amber-300">Hay {reconnect} fotos guardadas sin conectar. Volvé a elegir su carpeta para recuperar la vista previa.</p>}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          {tab === 'editor' ? <ClientInputPanel rawText={rawText} onRawTextChange={text => setProject(prev => ({ ...prev,rawText:text }))} config={config} onConfigChange={changeConfig}
            libraryCount={connectedCount} selectedCount={selectedCount} sceneCount={slides.length} onError={notify}
            onUploadPhotos={event => void upload(event)} onApplySelection={applySelection} onUseAll={useAll} onRegroup={regroup}
            onMusicUpload={event => void uploadMusic(event)} musicName={musicName} onClearMusic={() => { audioEngine.clearTrack(); setMusicName(''); setMusicRevision(value => value+1); }} busy={busy || importing} />
            : <Suspense fallback={<p role="status" className="panel">Abriendo línea de tiempo…</p>}><fieldset disabled={busy || importing}><TimelineView slides={slides} onUpdateSlide={updateSlide} onMoveSlide={moveSlide} onRemoveSlide={index => setProject(prev => ({ ...prev,slides:prev.slides.filter((_,i) => i !== index) }))}
              onTogglePhotoOrientation={toggleOrientation} config={config} onApplyGlobalTransition={transition => setProject(prev => ({ ...prev, config: { ...prev.config, defaultTransition: transition }, slides: prev.slides.map(slide => ({ ...slide, transition })) }))} onUpdatePhoto={(slideIndex,photoIndex,motion) => setProject(prev => ({ ...prev, slides: prev.slides.map((slide,i) => i === slideIndex ? { ...slide, photos: slide.photos.map((photo,j) => j === photoIndex ? { ...photo,kenBurns:motion } : photo) } : slide) }))} /></fieldset></Suspense>}
        </div>
        <div className="min-w-0 lg:sticky lg:top-24 lg:col-span-5"><VideoPreviewPlayer ref={preview} slides={slides} config={config} busy={busy} importing={importing} onBusy={setBusy} onReadyChange={setPreviewReady} onError={notify} musicRevision={musicRevision} libraryCount={connectedCount} /></div>
      </div>
    </main>
    <footer className="mx-auto max-w-7xl px-4 py-6 text-xs text-neutral-500">AutoReel Studio · Fotos locales, escenas editables y exportación para Premiere · Sin cuentas ni claves API.</footer>
    <DeferredDialog open={premiereOpen}><PremiereInspectorModal isOpen={premiereOpen} onClose={() => setPremiereOpen(false)} onApplyPremiereSettings={applyPremiere} /></DeferredDialog>
    <DeferredDialog open={exportOpen}><ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} slides={slides} config={config} canRecord={previewReady && !busy && !importing} onTriggerDirectVideoRender={() => preview.current?.record()} /></DeferredDialog>
    <DeferredDialog open={guideOpen}><FaqGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} /></DeferredDialog>
  </div>;
}


