import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Check, Music2, ScanLine, X } from 'lucide-react';
import type { SequenceConfig } from '../types';
import { audioEngine } from '../utils/audioSynthesizer';
import { countdownStart, DEFAULT_ENTRANCE, normalizeEntrance } from '../utils/entrance';
import { EditorPropertyRow } from './EditorPropertyRow';
import { EditorTool, EditorToolButton } from './EditorTool';

interface Props { config: SequenceConfig; onChange: (config: SequenceConfig) => void; musicName: string; musicRevision: number; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onError: (message: string) => void }
export function EntranceControls({ config, onChange, musicName, musicRevision, onUpload, onError }: Props) {
  const entry = config.entrance || DEFAULT_ENTRANCE;
  const [analyzing, setAnalyzing] = useState(false), [notice, setNotice] = useState('');
  const [manual, setManual] = useState(() => entry.beatTimes.join(', '));
  const worker = useRef<Worker | null>(null);
  const currentConfig = useRef(config); currentConfig.current = config;
  const trackDuration = audioEngine.getTrack()?.duration;
  const counterStart = countdownStart(entry);
  useEffect(() => { setManual((config.entrance?.beatTimes || []).join(', ')); }, [config.entrance?.beatTimes]);
  useEffect(() => { worker.current?.terminate(); worker.current = null; setAnalyzing(false); setNotice(''); }, [musicRevision]);
  useEffect(() => () => worker.current?.terminate(), []);
  const update = (value: Partial<typeof entry>) => onChange({ ...config, entrance: { ...entry, ...value } });
  const detect = () => {
    const track = audioEngine.getTrack();
    if (!track) { onError('Cargá la canción de la entrada.'); return; }
    setAnalyzing(true); setNotice('Analizando golpes…');
    const analyzer = new Worker(new URL('../utils/beatDetection.worker.ts', import.meta.url), { type: 'module' }); worker.current = analyzer;
    analyzer.onmessage = (event: MessageEvent<number[]>) => {
      analyzer.terminate(); worker.current = null; setAnalyzing(false);
      const latest = currentConfig.current;
      const latestEntry = latest.entrance || DEFAULT_ENTRANCE;
      if (latestEntry.musicEnd !== entry.musicEnd) { setNotice('La canción cambió. Volvé a detectar los golpes.'); return; }
      onChange({ ...latest, entrance: { ...latestEntry, beatTimes: event.data } });
      setNotice(event.data.length ? event.data.length + ' golpes detectados. Ajustá el desfase o los tiempos si hace falta.' : 'No se detectaron golpes claros. Ingresá tiempos manualmente o probá otro tramo.');
    };
    analyzer.onerror = () => { analyzer.terminate(); worker.current = null; setAnalyzing(false); setNotice('No se pudo analizar. Podés ingresar los cortes manualmente.'); };
    const samples = track.getChannelData(0).slice();
    analyzer.postMessage({ samples, sampleRate: track.sampleRate, start: 0 }, [samples.buffer]);
  };
  return <>
    <EditorPropertyRow label="Modo"><EditorTool label="Entrada de quince en pantalla horizontal"><label className="editor-switch"><input aria-label="Activar entrada de quince" type="checkbox" checked={entry.enabled} onChange={event => {
      const enabled = event.target.checked;
      const duration = trackDuration ?? entry.musicEnd;
      onChange({ ...config, ...(enabled ? { width: 1920, height: 1080, aspectRatio: '16:9', outputRotation: 0, fps: 60, musicTrack: config.musicTrack === 'none' ? 'chill' : config.musicTrack } : {}), entrance: { ...entry, enabled, musicStart: 0, musicEnd: duration, beatStart: Math.min(entry.beatStart, Math.max(0, duration - entry.countdown)) } });
    }} /><span aria-hidden="true" className="editor-switch-track"><span /></span></label></EditorTool><span className="property-note">Horizontal · Fotos en ciclo · Contador final</span></EditorPropertyRow>
    <EditorPropertyRow label="Canción"><EditorTool label="Cargar canción de entrada"><label className="editor-icon-button"><Music2 aria-hidden="true" /><span className="editor-tile-caption">Cargar</span><input aria-label="Cargar canción de entrada" type="file" accept="audio/*" onChange={onUpload} className="sr-only" /></label></EditorTool><span className="property-note">{musicName ? musicName + ' · ' + trackDuration?.toFixed(1) + 's' : 'Cargá o reconectá la canción'}</span></EditorPropertyRow>
    <fieldset disabled={analyzing} className="min-w-0">
      <EditorPropertyRow label="Inicio" help="La canción completa empieza desde cero. Hasta el inicio de golpes, cada foto dura este tiempo."><div className="property-inline-fields">
        <label>Segundos por foto<input aria-label="Duración inicial por foto" className="studio-input" type="number" min="0.1" max="60" step="0.1" value={entry.initialDuration} onChange={event => update({ initialDuration: Math.max(0.1, Math.min(60, Number(event.target.value))) })} /></label>
        <label>Golpes desde (s)<input aria-label="Golpes desde segundo" className="studio-input" type="number" min="0" max={counterStart} step="0.01" value={entry.beatStart} onChange={event => update({ beatStart: Math.max(0, Math.min(counterStart, Number(event.target.value))) })} /></label>
      </div></EditorPropertyRow>
      <EditorPropertyRow label="Contador"><div role="group" aria-label="Duración del contador" className="property-buttons">{[5,10].map(seconds => <button type="button" className="property-choice" key={seconds} aria-pressed={entry.countdown === seconds} onClick={() => {
        const start = Math.min(counterStart, Math.max(0, entry.musicEnd - seconds));
        update({ countdown: seconds as 5 | 10, countdownStart: entry.countdownStart === null ? null : start, beatStart: Math.min(entry.beatStart, entry.countdownStart === null ? Math.max(0, entry.musicEnd - seconds) : start) });
      }}>{seconds} → 0</button>)}</div><div className="property-inline-fields"><label>Desde (s)<input aria-label="Inicio del contador" className="studio-input" type="number" min={entry.beatStart} max={Math.max(0, entry.musicEnd - entry.countdown)} step="0.01" value={Number(counterStart.toFixed(3))} onChange={event => update({ countdownStart: Math.max(entry.beatStart, Math.min(Math.max(0, entry.musicEnd - entry.countdown), Number(event.target.value))) })} /></label><button type="button" className="property-choice" aria-pressed={entry.countdownStart === null} onClick={() => update({ countdownStart: null })}>Al final</button></div><span className="property-note">Cero: {(counterStart + entry.countdown).toFixed(2)}s · Total: {entry.musicEnd.toFixed(2)}s</span></EditorPropertyRow>
      <EditorPropertyRow label="Golpes"><EditorToolButton label="Detectar golpes" caption="Detectar" disabled={!trackDuration} onClick={detect}><ScanLine aria-hidden="true" /></EditorToolButton><select aria-label="Cambiar cada cuántos golpes" value={entry.everyBeats} onChange={event => update({ everyBeats: Number(event.target.value) })} className="studio-input property-small-input">{[1,2,4,8].map(n => <option key={n} value={n}>Cada {n}</option>)}</select></EditorPropertyRow>
      <EditorPropertyRow label="Desfase"><input aria-label="Desfase de golpes" className="studio-input property-small-input" type="number" min="-2" max="2" step="0.01" value={entry.beatShift} onChange={event => update({ beatShift: Number(event.target.value) })} /><span className="property-note">Segundos · negativo adelanta, positivo retrasa</span></EditorPropertyRow>
      <EditorPropertyRow label="Cortes" help="Segundos absolutos de la canción, separados por coma. Podés agregar, mover o quitar golpes detectados."><textarea aria-label="Tiempos de los cortes" rows={2} className="studio-input selection-input font-mono" value={manual} onChange={event => setManual(event.target.value)} maxLength={100000} /><EditorToolButton label="Aplicar tiempos de cortes" caption="Aplicar" onClick={() => {
        const values = manual.trim() ? manual.split(/[\s,;]+/).map(Number) : [];
        if (!values.length || values.some(value => !Number.isFinite(value) || value < 0 || value > entry.musicEnd)) { onError('Ingresá tiempos válidos dentro de la canción, usando punto decimal.'); return; }
        update({ beatTimes: normalizeEntrance({ ...entry, beatTimes: values }).beatTimes }); setNotice('Cortes aplicados.');
      }}><Check aria-hidden="true" /></EditorToolButton></EditorPropertyRow>
    </fieldset>
    {notice && <p role="status" className="text-xs text-indigo-200 p-2">{notice}</p>}
    {analyzing && <div className="flex items-center gap-2 p-2"><progress aria-label="Detección de golpes" /><EditorToolButton label="Cancelar detección" caption="Cancelar" onClick={() => { worker.current?.terminate(); worker.current = null; setAnalyzing(false); setNotice('Detección cancelada.'); }}><X aria-hidden="true" /></EditorToolButton></div>}
    <p className="property-note p-2">Duración fija → golpes → aceleración hasta una foto por cuadro. La canción suena completa. Si el contador termina antes, las fotos siguen a velocidad máxima hasta el final.</p>
  </>;
}
