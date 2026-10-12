/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Navbar } from './components/Navbar';
import { NewProjectModal } from './components/NewProjectModal';
import { FolderOpen, Plus, Save } from 'lucide-react';
import { ClientInputPanel } from './components/ClientInputPanel';
import { VideoPreviewPlayer, type PreviewHandle } from './components/VideoPreviewPlayer';
import { PreparationProgress } from './components/PreparationProgress';
import type { PhotoFraming, SequenceSlide, SequenceConfig, ViewTab, ParsedPremiereProject, FilePreparationProgress, PhotoItem } from './types';
import { parseClientSelectionText, resolveSelection, buildSlidesFromPhotos } from './utils/photoParser';
import { DEFAULT_CONFIG, clampDuration } from './utils/config';
import { rotateProjectPhotos, setProjectPhotoMotion, setProjectPhotoRotations, updateClipStart, updatePhotoFraming, updateProjectConfig } from './utils/projectConfig';
import type { QuarterTurn } from './utils/faceOrientation';
import { importPhotos } from './utils/importPhotos';
import { reconnectPhotoFiles, selectPhotoFiles } from './utils/photoFiles';
import { reconnectPhotos } from './utils/reconnectPhotos';
import { audioEngine } from './utils/audioSynthesizer';
import { decodeProject, serializeProject, STORAGE_KEY, type SavedProject } from './utils/projectStorage';
import { sequenceDuration } from './utils/entrance';
import { setMusicTrim } from './utils/musicTrim';
import { downloadBlob } from './utils/download';
import { authorizeLocalLinks, chooseLocalMusic, chooseLocalPhotos, readLocalLinks, reconnectLocalLinks, rememberLocalLinks, supportsLocalLinks, type LocalFileLinks, type PhotoLink } from './utils/localFileLinks';
import { photoFileInfo } from './utils/photoFiles';

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
  try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) { const saved = decodeProject(stored); return { ...saved, localLinkId: saved.localLinkId || crypto.randomUUID() }; } } catch { /* An invalid or unavailable saved draft never prevents opening the app. */ }
  return { version: 1, localLinkId: crypto.randomUUID(), rawText: '', config: { ...DEFAULT_CONFIG }, library: [], slides: [] };
}
export default function App() {
  const [project, setProject] = useState(initialProject);
  const [tab, setTab] = useState<ViewTab>('editor');
  const [editorSection, setEditorSection] = useState(1);
  const [premiereOpen, setPremiereOpen] = useState(false), [exportOpen, setExportOpen] = useState(false), [guideOpen, setGuideOpen] = useState(false);
  const [busy, setBusy] = useState(false), [importing, setImporting] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [purgingCache, setPurgingCache] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [previewSession, setPreviewSession] = useState(0);
  const [framingControlsTarget, setFramingControlsTarget] = useState<HTMLDivElement | null>(null);
  const [importProgress, setImportProgress] = useState<FilePreparationProgress | null>(null);
  const [message, setMessage] = useState(''), [saveStatus, setSaveStatus] = useState('Guardando…');
  const [musicName, setMusicName] = useState(''), [musicRevision, setMusicRevision] = useState(0);
  const [linkPermissionNeeded, setLinkPermissionNeeded] = useState(false);
  const linkedFiles = useRef<LocalFileLinks | null>(null), linkEpoch = useRef(0);
  const preview = useRef<PreviewHandle>(null), importAbort = useRef<AbortController | null>(null);
  const urls = useRef(new Set<string>());
  const { config, rawText, slides, library } = project;
  const latestProject = useRef(project); latestProject.current = project;
  const reconnect = library.filter(photo => !photo.previewUrl).length;
  const connectedCount = library.length - reconnect;
  const selectedCount = slides.reduce((sum, slide) => sum + slide.photos.length, 0);
  const totalDuration = sequenceDuration(slides, config);
  useEffect(() => {
    setSaveStatus('Guardando…');
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY,serializeProject(project)); setSaveStatus('Guardado en este navegador'); }
      catch { setSaveStatus('No se pudo guardar automáticamente. Descargá el proyecto JSON.'); }
    },600);
    return () => window.clearTimeout(timer);
  }, [project]);
  useEffect(() => {
    const flush = () => {
      try { localStorage.setItem(STORAGE_KEY, serializeProject(latestProject.current)); }
      catch { /* The regular autosave reports storage failures while the page is open. */ }
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);
  useEffect(() => () => { importAbort.current?.abort(); urls.current.forEach(url => URL.revokeObjectURL(url)); audioEngine.stop(); }, []);
  const notify = (value: string) => setMessage(value);
  const changeConfig = (newConfig: SequenceConfig) => setProject(prev => updateProjectConfig(prev, newConfig));
  const changePhotoFraming = useCallback((slideIndex: number, photoIndex: number, framing: PhotoFraming) => {
    setProject(prev => updatePhotoFraming(prev, slideIndex, photoIndex, framing));
  }, []);
  const rotatePhotos = useCallback((ids: string[], direction: -90 | 90) => setProject(previous => rotateProjectPhotos(previous, ids, direction)), []);
  const autoRotatePhotos = useCallback((rotations: Record<string, QuarterTurn>) => setProject(previous => setProjectPhotoRotations(previous, rotations)), []);
  const changePhotoMotion = useCallback((ids: string[], motion: PhotoItem['kenBurns']) => setProject(previous => setProjectPhotoMotion(previous, ids, motion)), []);
  const pauseForAudition = useCallback(() => preview.current?.pause(), []);
  const syncAudition = useCallback((time: number, running: boolean) => preview.current?.syncAudition(time, running), []);
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const fromFolder = event.currentTarget.hasAttribute('webkitdirectory');
    const files = Array.from(event.target.files || []); event.target.value = ''; if (!files.length || importing || busy) return;
    linkEpoch.current++;
    await importLocalPhotos(files, fromFolder);
  };
  const importLocalPhotos = async (files: File[], fromFolder: boolean, handles?: Map<string, PhotoLink['handle']>, restoring = false) => {
    setImporting(true); setImportProgress(null); setMessage(''); importAbort.current = new AbortController();
    try {
      const requested = fromFolder && rawText.trim() && !reconnect ? parseClientSelectionText(rawText, {
        localBasePath: config.localBasePath, prefix: config.filenamePrefix, padding: config.filenamePadding,
        extension: config.filenameExtension, defaultDuration: config.defaultDuration,
      }) : null;
      if (requested && !requested.length) throw new Error('La selección no contiene números ni nombres de fotos. Corregila o limpiá la lista para cargar la carpeta completa.');
      const filtered = requested ? selectPhotoFiles(files, requested) : null;
      if (filtered && (filtered.missing.length || filtered.ambiguous.length)) throw new Error([
        filtered.missing.length ? 'No están en la carpeta: ' + filtered.missing.join(', ') : '',
        filtered.ambiguous.length ? 'Hay nombres o números repetidos: ' + filtered.ambiguous.join(', ') + '. Usá el nombre completo o elegí la subcarpeta correspondiente' : '',
      ].filter(Boolean).join('. ') + '. No se cargó ninguna imagen; el montaje anterior se conserva.');
      const candidates = filtered ? filtered.files : fromFolder && reconnect ? reconnectPhotoFiles(files, library) : files;
      if (!candidates.length) throw new Error('Esta carpeta no contiene las fotos del proyecto. Elegí su carpeta original.');
      const imported = await importPhotos(candidates,config,importAbort.current.signal,setImportProgress);
      const result = reconnectPhotos(library, imported, config.localBasePath);
      const merged = new Map(result.library.map(photo => [photo.id, photo]));
      const previousPhotos = new Map(library.map(photo => [photo.id, photo]));
      if (merged.size > 400) { imported.forEach(photo => { URL.revokeObjectURL(photo.previewUrl); if (photo.sourceUrl) URL.revokeObjectURL(photo.sourceUrl); }); throw new Error('La biblioteca admite hasta 400 fotos. Abrí otro proyecto para una sesión distinta.'); }
      result.connected.forEach(photo => {
        const old = previousPhotos.get(photo.id);
        if (old?.previewUrl) { URL.revokeObjectURL(old.previewUrl); urls.current.delete(old.previewUrl); }
        if (old?.sourceUrl) { URL.revokeObjectURL(old.sourceUrl); urls.current.delete(old.sourceUrl); }
        urls.current.add(photo.previewUrl);
        if (photo.sourceUrl) urls.current.add(photo.sourceUrl);
      });
      const createMontage = !slides.length && (!rawText.trim() || !!requested);
      const montagePhotos = requested ? resolveSelection(requested, result.connected).resolved : [...merged.values()].filter(photo => photo.previewUrl);
      setProject(prev => ({ ...prev, library: [...merged.values()], slides: createMontage
        ? buildSlidesFromPhotos(montagePhotos, config.horizontalGrouping, config.defaultDuration, config)
        : prev.slides.map(slide => ({ ...slide, photos: slide.photos.map(photo => ({
          ...photo, ...merged.get(photo.id), orientation: photo.orientation, kenBurns: photo.kenBurns })) })) }));
      let linkWarning = '';
      if (!restoring && project.localLinkId) {
        const links = result.connected.flatMap((photo, index) => {
          const handle = handles?.get(imported[index].id);
          return handle ? [{ id: photo.id, path: photo.relativePath || photo.filename, handle }] : [];
        });
        try {
          await rememberLocalLinks(project.localLinkId, links, undefined, handles ? [] : result.connected.map(photo => photo.id));
          linkedFiles.current = await readLocalLinks(project.localLinkId);
          if (result.library.every(photo => photo.previewUrl) && (audioEngine.getTrack() || !config.musicFingerprint)) setLinkPermissionNeeded(false);
        }
        catch { linkWarning = ' Se cargaron los archivos, pero Chrome no pudo recordar su acceso.'; }
      }
      const pending = result.library.filter(photo => !photo.previewUrl);
      const pendingNotice = pending.length ? ' Quedan ' + pending.length + ' sin conectar: ' + pending.slice(0, 3).map(photo => photo.relativePath || photo.filename).join(', ') + '. Elegí la carpeta original si hay nombres repetidos.' : '';
      setMessage((result.reconnected
        ? `Se reconectaron ${result.reconnected} fotos. Se conservó la edición.${pendingNotice}`
        : filtered
          ? `Se cargaron ${imported.length} de ${filtered.total} fotos de la carpeta. ` + (createMontage ? 'Selección aplicada; el montaje está listo.' : 'Aplicá la selección para actualizar el montaje.') + pendingNotice
          : imported.length + (createMontage ? ' fotos conectadas. El montaje ya está listo: tocá Reproducir.' : ' fotos conectadas. Aplicá la selección o usá todas.') + pendingNotice) + linkWarning);
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudieron cargar las fotos.'); }
    finally { if (!restoring) setImporting(false); setImportProgress(null); importAbort.current = null; }
  };
  const pickPhotos = async (folder: boolean) => {
    if (importing || busy) return;
    linkEpoch.current++;
    try {
      const items = await chooseLocalPhotos(folder, () => { setImporting(true); setImportProgress(null); setMessage(''); });
      if (items.length) await importLocalPhotos(items.map(item => item.file), folder, new Map(items.map(item => [photoFileInfo(item.file).id, item.handle])));
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) notify(error instanceof Error ? error.message : 'No se pudo abrir la carpeta.'); }
    finally { setImporting(false); }
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
      setProject(prev => ({ ...prev, slides: buildSlidesFromPhotos(selection.resolved.map(photo => ({ ...photo, duration: config.defaultDuration, transition: config.defaultTransition })),config.horizontalGrouping,config.defaultDuration,config) }));
      notify(selection.resolved.length + ' fotos seleccionadas.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Selección inválida.'); }
  };
  const useAll = () => {
    const connected = library.filter(photo => photo.previewUrl);
    if (!connected.length) { notify('Conectá las fotos con Subir fotos locales o Elegir carpeta antes de usarlas.'); return; }
    setProject(prev => ({ ...prev, slides: buildSlidesFromPhotos(connected.map(photo => ({ ...photo, duration: config.defaultDuration, transition: config.defaultTransition })),config.horizontalGrouping,config.defaultDuration,config) }));
    notify(`Se agregaron ${connected.length} fotos conectadas al montaje.${reconnect ? ' Las ' + reconnect + ' fotos sin conectar siguen guardadas en la biblioteca.' : ''}`);
  };
  const regroup = () => setProject(prev => ({ ...prev, slides: buildSlidesFromPhotos(prev.slides.flatMap(slide => slide.photos.map(photo => ({ ...photo, duration: slide.duration, transition: slide.transition }))),config.horizontalGrouping,config.defaultDuration,config) }));
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
      restored.localLinkId ||= crypto.randomUUID(); linkEpoch.current++; linkedFiles.current = null; setLinkPermissionNeeded(false);
      try { localStorage.setItem(STORAGE_KEY, serializeProject(restored)); }
      catch { setSaveStatus('No se pudo guardar automáticamente. Descargá el proyecto JSON.'); }
      urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear();
      audioEngine.clearTrack(); setMusicName(''); setMusicRevision(value => value + 1);
      setPreviewReady(false); setPreviewSession(value => value + 1); setEditorSection(1);
      setProject(restored); notify('Proyecto abierto. Recuperando los originales que Chrome tenga vinculados.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Proyecto inválido.'); }
  };
  const uploadMusic = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    linkEpoch.current++;
    await loadMusicFile(file);
  };
  const loadMusicFile = async (file: File, handle?: PhotoLink['handle'], restoring = false) => {
    setImporting(true); setImportProgress(null);
    try {
      const fingerprint = await audioEngine.loadTrack(file);
      const sameTrack = fingerprint === config.musicFingerprint;
      if (restoring && !sameTrack) { audioEngine.clearTrack(); throw new Error('La canción original cambió. Volvé a elegirla para revisar sus cortes.'); }
      const loadedConfig = { ...config, musicFingerprint: fingerprint, musicTrack: config.musicTrack === 'none' ? 'chill' : config.musicTrack,
        ...(config.entrance ? { entrance: { ...config.entrance, beatTimes: sameTrack ? config.entrance.beatTimes : [] } } : {}) };
      changeConfig(setMusicTrim(loadedConfig, sameTrack ? config.musicTrim : undefined, audioEngine.getTrack()!.duration));
      setMusicName(file.name); setMusicRevision(value => value + 1);
      if (!restoring && project.localLinkId) {
        try {
          await rememberLocalLinks(project.localLinkId, [], handle ? { handle, fingerprint } : null);
          linkedFiles.current = await readLocalLinks(project.localLinkId);
          if (library.every(photo => photo.previewUrl)) setLinkPermissionNeeded(false);
        }
        catch { notify('La canción se cargó, pero Chrome no pudo recordar su acceso.'); }
      }
    }
    catch (error) { notify(error instanceof Error ? error.message : 'Audio no compatible.'); }
    finally { if (!restoring) setImporting(false); }
  };
  const pickMusic = async () => {
    if (importing || busy) return;
    linkEpoch.current++;
    try { const selected = await chooseLocalMusic(); await loadMusicFile(selected.file, selected.handle); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) notify(error instanceof Error ? error.message : 'No se pudo elegir la canción.'); }
  };
  const restoreLocalFiles = async (signal?: AbortSignal) => {
    if (!project.localLinkId || !supportsLocalLinks()) return;
    const epoch = linkEpoch.current;
    try {
      const links = await readLocalLinks(project.localLinkId);
      if (signal?.aborted || epoch !== linkEpoch.current) return;
      linkedFiles.current = links; setLinkPermissionNeeded(false);
      if (!links) return;
      setImporting(true); setImportProgress(null);
      const result = await reconnectLocalLinks(links, library, config.musicFingerprint);
      if (signal?.aborted || epoch !== linkEpoch.current) return;
      setLinkPermissionNeeded(result.permissionNeeded);
      if (result.files.length) await importLocalPhotos(result.files, true, undefined, true);
      if (signal?.aborted || epoch !== linkEpoch.current) return;
      if (result.music && !audioEngine.getTrack()) await loadMusicFile(result.music, undefined, true);
      if (result.unavailable.length) notify('No se encontraron los originales vinculados: ' + result.unavailable.slice(0,3).join(', ') + '. Elegí su nueva ubicación.');
      else if (result.permissionNeeded) notify('Chrome necesita renovar el permiso. Tocá «Reconectar originales»; no hace falta volver a elegirlos.');
    } catch { if (!signal?.aborted) notify('No se pudo recuperar el acceso guardado. Elegí los originales una vez para volver a vincularlos.'); }
    finally { if (!signal?.aborted && epoch === linkEpoch.current) setImporting(false); }
  };
  const restoreAction = useRef(restoreLocalFiles); restoreAction.current = restoreLocalFiles;
  useEffect(() => {
    const controller = new AbortController(); void restoreAction.current(controller.signal);
    return () => { controller.abort(); linkEpoch.current++; };
  }, [project.localLinkId, previewSession]);
  const renewLocalPermission = async () => {
    if (!linkedFiles.current || importing || busy) return;
    await authorizeLocalLinks(linkedFiles.current);
    await restoreLocalFiles();
  };
  const clearMusic = () => {
    linkEpoch.current++; audioEngine.clearTrack(); setMusicName(''); setMusicRevision(value => value + 1);
    setProject(previous => ({ ...previous, config: { ...previous.config, musicFingerprint: undefined, musicTrim: undefined,
      ...(previous.config.entrance ? { entrance: { ...previous.config.entrance, beatTimes: [] } } : {}) } }));
    if (!reconnect) setLinkPermissionNeeded(false);
    if (project.localLinkId) void rememberLocalLinks(project.localLinkId, [], null).catch(() => notify('No se pudo quitar el vínculo guardado de la música.'));
  };
  const newProject = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 120 || busy || importing) return;
    const backedUp = library.length > 0 || slides.length > 0;
    if (backedUp) downloadBlob(new Blob([serializeProject(project)], { type:'application/json' }), (config.name || 'AutoReel') + '_respaldo.autoreel.json');
    urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear();
    audioEngine.clearTrack(); setMusicName(''); setMusicRevision(value => value + 1);
    linkEpoch.current++; linkedFiles.current = null; setLinkPermissionNeeded(false);
    const fresh: SavedProject = { version:1, localLinkId: crypto.randomUUID(), rawText:'', config:{ ...DEFAULT_CONFIG, name: trimmedName }, library:[], slides:[] };
    setPreviewReady(false); setPreviewSession(value => value + 1);
    setProject(fresh); setTab('editor'); setEditorSection(1); setNewProjectOpen(false);
    try { localStorage.setItem(STORAGE_KEY, serializeProject(fresh)); setSaveStatus('Guardado en este navegador'); }
    catch { setSaveStatus('No se pudo guardar automáticamente. Descargá el proyecto JSON.'); }
    notify('Proyecto «' + trimmedName + '» creado. Cargá sus fotos.' + (backedUp ? ' Se descargó el respaldo JSON del proyecto anterior.' : ''));
  };
  const purgeCache = async () => {
    if (busy || importing || purgingCache || !preview.current) return;
    setPurgingCache(true); notify('Purgando caché de vista previa…');
    try {
      await preview.current.purgeCache();
      notify('Caché de vista previa purgada. Se conservaron el proyecto, las fotos y la música.');
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo reconstruir la vista previa.'); }
    finally { setPurgingCache(false); }
  };
  return <div className="app-shell bg-neutral-950 text-neutral-100">
    <Navbar currentTab={tab} onTabChange={setTab} onOpenPremiereModal={() => !busy && !importing && setPremiereOpen(true)} onOpenExportModal={() => !busy && !importing && setExportOpen(true)} onOpenFaqModal={() => setGuideOpen(true)} totalPhotos={selectedCount} totalDuration={totalDuration} formatLabel={config.width + ' × ' + config.height} busy={busy || importing || purgingCache} purgingCache={purgingCache} onPurgeCache={() => void purgeCache()}
      projectActions={<>
        <span className="project-save-status" title={saveStatus} aria-label={saveStatus}>{saveStatus === 'Guardado en este navegador' ? 'Guardado' : saveStatus === 'Guardando…' ? 'Guardando…' : 'Sin guardar'}</span>
        <button className="project-button" aria-label="Nuevo proyecto" title="Nuevo proyecto" disabled={busy || importing || purgingCache} onClick={() => setNewProjectOpen(true)}><Plus aria-hidden="true" /><span className="project-button-label">Nuevo</span></button>
        <button className="project-button" aria-label="Guardar proyecto JSON" title="Guardar proyecto JSON" disabled={busy || importing || purgingCache} onClick={() => downloadBlob(new Blob([serializeProject(project)],{ type:'application/json' }), (config.name || 'AutoReel') + '.autoreel.json')}><Save aria-hidden="true" /><span className="project-button-label">Guardar</span></button>
        <label className="project-button" title="Abrir proyecto"><FolderOpen aria-hidden="true" /><span className="project-button-label">Abrir</span><input aria-label="Abrir proyecto" type="file" accept=".json" disabled={busy || importing || purgingCache} className="sr-only" onChange={event => void loadProject(event)} /></label>
      </>} />
    <main className="app-main">
      {(message || importing || reconnect > 0 || linkPermissionNeeded) && <div className="app-notices">
        {message && <div role="status" className="app-notice"><p>{message}</p><button aria-label="Cerrar aviso" onClick={() => setMessage('')}>✕</button></div>}
        {importing && <PreparationProgress title={importProgress ? (reconnect > 0 ? 'Reconectando fotos' : 'Preparando fotos') : 'Preparando archivos locales'} progress={importProgress} />}
        {linkPermissionNeeded && <button type="button" className="project-button" disabled={busy || importing || purgingCache} onClick={() => void renewLocalPermission()}><FolderOpen aria-hidden="true" />Reconectar originales</button>}
        {reconnect > 0 && !importing && <p role="status" className="app-notice text-amber-300">Hay {reconnect} fotos guardadas sin conectar. Volvé a elegir las fotos o su carpeta para recuperar la vista previa.</p>}
      </div>}
      <div className="editor-workspace">
        <div className="editor-column min-w-0">
          {tab === 'editor' ? <ClientInputPanel activeSection={editorSection} onSectionChange={setEditorSection} rawText={rawText} onRawTextChange={text => setProject(prev => ({ ...prev,rawText:text }))} config={config} onConfigChange={changeConfig}
            slides={slides} libraryCount={connectedCount} selectedCount={selectedCount} sceneCount={slides.length} onError={notify} onFramingTargetChange={setFramingControlsTarget}
            onUploadPhotos={event => void upload(event)} onApplySelection={applySelection} onUseAll={useAll} onRegroup={regroup}
            onAuditionStart={pauseForAudition} onAuditionFrame={syncAudition} onMusicUpload={event => void uploadMusic(event)} onChoosePhotos={supportsLocalLinks() ? folder => void pickPhotos(folder) : undefined} onChooseMusic={supportsLocalLinks() ? () => void pickMusic() : undefined} musicName={musicName} musicRevision={musicRevision} onClearMusic={clearMusic} busy={busy || importing || purgingCache} />
            : <Suspense fallback={<p role="status" className="panel">Abriendo línea de tiempo…</p>}><fieldset className="timeline-tools" disabled={busy || importing || purgingCache}><TimelineView slides={slides} onUpdateSlide={updateSlide} onMoveSlide={moveSlide} onRemoveSlide={index => setProject(prev => ({ ...prev,slides:prev.slides.filter((_,i) => i !== index) }))}
              onTogglePhotoOrientation={toggleOrientation} config={config} onApplyGlobalTransition={transition => setProject(prev => ({ ...prev, config: { ...prev.config, defaultTransition: transition }, slides: prev.slides.map(slide => ({ ...slide, transition })) }))} onUpdatePhoto={(slideIndex,photoIndex,motion) => setProject(prev => {
                const photo = prev.slides[slideIndex]?.photos[photoIndex];
                return photo ? setProjectPhotoMotion(prev, [photo.id], motion) : prev;
              })} /></fieldset></Suspense>}
        </div>
        <div className="preview-column min-w-0"><VideoPreviewPlayer key={previewSession} ref={preview} slides={slides} config={config} busy={busy} importing={importing} onBusy={setBusy} onReadyChange={setPreviewReady} onError={notify} onPhotoFramingChange={changePhotoFraming} onPhotoRotate={rotatePhotos} onPhotoAutoRotate={autoRotatePhotos} onPhotoMotion={changePhotoMotion} onClipStart={(id, start) => setProject(previous => updateClipStart(previous, id, start))} musicRevision={musicRevision} libraryCount={connectedCount} framingControlsTarget={framingControlsTarget} framingToolsVisible={tab !== 'editor' || editorSection === 3} /></div>
      </div>
    </main>
    <footer className="app-footer text-xs text-neutral-500">AutoReel Studio · Fotos locales, escenas editables y exportación para Premiere · Sin cuentas ni claves API.</footer>
    {newProjectOpen && <NewProjectModal open onClose={() => setNewProjectOpen(false)} onCreate={newProject} hasPhotos={library.length > 0 || slides.length > 0} />}
    <DeferredDialog open={premiereOpen}><PremiereInspectorModal isOpen={premiereOpen} onClose={() => setPremiereOpen(false)} onApplyPremiereSettings={applyPremiere} /></DeferredDialog>
    <DeferredDialog open={exportOpen}><ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} slides={slides} config={config} canRecord={previewReady && !busy && !importing} onTriggerDirectVideoRender={chooseLocation => preview.current?.record(chooseLocation)} /></DeferredDialog>
    <DeferredDialog open={guideOpen}><FaqGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} /></DeferredDialog>
  </div>;
}


