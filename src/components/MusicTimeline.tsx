import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import type { SequenceConfig } from '../types';
import { audioEngine } from '../utils/audioSynthesizer';
import { musicRange, setMusicTrim } from '../utils/musicTrim';

interface Props {
  config: SequenceConfig; onChange: (config: SequenceConfig) => void; musicRevision: number;
  active: boolean; disabled: boolean; onAuditionStart: () => void; onError: (message: string) => void;
  counter?: { start: number; duration: number; onChange: (time: number) => void };
}
const clock = (time: number) => Math.floor(time / 60) + ':' + (time % 60).toFixed(2).padStart(5, '0');
const waveformBins = 9600;

export function MusicTimeline({ config, onChange, musicRevision, active, disabled, onAuditionStart, onError, counter }: Props) {
  const track = audioEngine.getTrack(), duration = track?.duration ?? 0;
  const range = musicRange(config, duration);
  const [autoplay, setAutoplay] = useState(true), [listening, setListening] = useState(false), [cursor, setCursor] = useState(0);
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null), zoomValue = useRef(1);
  const zoomAnchor = useRef<{ fraction: number; pixel: number } | null>(null);
  const changeZoom = useCallback((value: number, pixel?: number) => {
    const element = viewport.current;
    const next = Math.max(1, Math.min(32, value));
    if (!element || next === zoomValue.current) return;
    const anchor = pixel ?? element.clientWidth / 2;
    zoomAnchor.current = { fraction: (element.scrollLeft + anchor) / element.scrollWidth, pixel: anchor };
    zoomValue.current = next; setZoom(next);
  }, []);
  useLayoutEffect(() => {
    const element = viewport.current, anchor = zoomAnchor.current;
    if (element && anchor) element.scrollLeft = anchor.fraction * element.scrollWidth - anchor.pixel;
    zoomAnchor.current = null;
  }, [zoom]);
  useEffect(() => { zoomValue.current = 1; setZoom(1); if (viewport.current) viewport.current.scrollLeft = 0; }, [musicRevision]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (disabled || event.shiftKey || !event.deltaY) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      changeZoom(zoomValue.current * Math.exp(-Math.max(-200, Math.min(200, delta)) * 0.003), event.clientX - element.getBoundingClientRect().left);
    };
    // La rueda controla el zoom aquí; el resto del panel conserva su scroll.
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [duration, disabled, changeZoom]);
  const generation = useRef(0), timer = useRef<number | null>(null), frame = useRef<number | null>(null), ownsAudio = useRef(false);
  const auditionPosition = useRef<(() => number) | null>(null);
  const stop = useCallback(() => {
    generation.current++;
    if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null;
    if (ownsAudio.current) audioEngine.stopAudition(); ownsAudio.current = false;
    auditionPosition.current = null;
    setListening(false);
  }, []);
  useEffect(() => { stop(); setCursor(0); return stop; }, [active, disabled, musicRevision, stop]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hidden); return () => document.removeEventListener('visibilitychange', hidden);
  }, [stop]);
  const waveform = useMemo(() => {
    if (!track) return '';
    const samples = track.getChannelData(0), bins = waveformBins, points: string[] = [];
    for (let bin = 0; bin < bins; bin++) {
      const start = Math.floor(bin * samples.length / bins), end = Math.floor((bin + 1) * samples.length / bins);
      const stride = Math.max(1, Math.floor((end - start) / 64)); let peak = 0;
      for (let i = start; i < end; i += stride) peak = Math.max(peak, Math.abs(samples[i]));
      const height = Math.max(1, Math.min(32, peak * 32)); points.push(`M${bin},${(36-height).toFixed(1)}v${(height*2).toFixed(1)}`);
    }
    return points.join('');
  }, [track]);
  const listen = (start: number, end: number, delay = 0) => {
    stop(); setCursor(start);
    if (!active || disabled || !track || end <= start) return;
    const revision = generation.current;
    const run = async () => {
      timer.current = null; ownsAudio.current = true; onAuditionStart();
      try {
        await audioEngine.resume();
        if (generation.current !== revision) return;
        const position = audioEngine.auditionTrack(start, end, config.musicVolume, finished => {
          if (generation.current !== revision) return;
          ownsAudio.current = false; setListening(false);
          auditionPosition.current = null;
          if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null;
          if (finished) setCursor(end);
        });
        auditionPosition.current = position;
        setListening(true);
        const tick = () => { if (generation.current !== revision || !ownsAudio.current) return; setCursor(position()); frame.current = requestAnimationFrame(tick); };
        frame.current = requestAnimationFrame(tick);
      } catch (error) { if (generation.current === revision) { stop(); onError(error instanceof Error ? error.message : 'No se pudo escuchar la canción.'); } }
    };
    if (delay) timer.current = window.setTimeout(() => void run(), delay); else void run();
  };
  const toggleListening = () => {
    if (ownsAudio.current) { const position = auditionPosition.current?.() ?? cursor; stop(); setCursor(position); }
    else listen(cursor >= range.start && cursor < range.end ? cursor : range.start, range.end);
  };
  const keyboardToggle = useRef(toggleListening); keyboardToggle.current = toggleListening;
  useEffect(() => {
    if (!active || disabled || !track) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('textarea, select, input:not([type="range"])'))) return;
      if (document.querySelector('[role="dialog"], dialog[open]')) return;
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat) keyboardToggle.current();
    };
    window.addEventListener('keydown', keydown, true);
    return () => window.removeEventListener('keydown', keydown, true);
  }, [active, disabled, track]);
  const boundary = (side: 'start' | 'end', value: number) => {
    const minimum = Math.min(duration, config.entrance?.enabled ? config.entrance.countdown : 0.1);
    const start = side === 'start' ? Math.max(0, Math.min(value, range.end - minimum)) : range.start;
    const end = side === 'end' ? Math.min(duration, Math.max(value, range.start + minimum)) : range.end;
    onChange(setMusicTrim(config, { start, end }, duration));
    if (autoplay) listen(side === 'start' ? start : Math.max(start, end - 2), side === 'start' ? Math.min(end, start + 3) : end, 160);
    else { stop(); setCursor(side === 'start' ? start : end); }
  };
  if (!track) return null;
  const percent = (time: number) => duration ? time / duration * 100 : 0;
  const tickCount = Math.ceil(zoom * 4);
  return <div className="music-trim-panel" aria-label="Recorte de música">
    <div className="music-trim-toolbar"><strong>Recortar música</strong><span className="property-note">{clock(range.duration)} seleccionados</span>
      <label className="music-autoplay"><input aria-label="Escucha automática al mover" type="checkbox" checked={autoplay} disabled={disabled} onChange={event => { setAutoplay(event.target.checked); if (!event.target.checked) stop(); }} />Autoescucha</label>
    </div>
    <div className="music-zoom-toolbar">
      <label>Zoom<input aria-label="Zoom de la línea de tiempo musical" type="range" min="0" max="5" step="0.01" value={Math.log2(zoom)} disabled={disabled} onChange={event => changeZoom(2 ** Number(event.target.value))} /></label>
      <output aria-label="Nivel de zoom musical">{zoom.toFixed(1)}×</output>
      <button type="button" className="quick-button" disabled={disabled} onClick={() => changeZoom(1)}>Ajustar</button>
    </div>
    <div ref={viewport} className="music-timeline-viewport" aria-label="Línea de tiempo musical ampliable" tabIndex={0} title="Rueda: zoom · Shift + rueda o barra inferior: desplazamiento">
    <div className="music-timeline-content" style={{ width: `${zoom * 100}%` }}>
    <div className="music-waveform">
      <svg viewBox={`0 0 ${waveformBins} 72`} preserveAspectRatio="none" aria-hidden="true"><path d={waveform} stroke="#818cf8" strokeWidth="0.7" /></svg>
      <div className="music-wave-dim" style={{ left: 0, width: percent(range.start) + '%' }} />
      <div className="music-wave-dim" style={{ right: 0, width: (100-percent(range.end)) + '%' }} />
      {counter && <><div className="music-countdown-region" style={{ left: percent(counter.start) + '%', width: percent(counter.duration) + '%' }}><span>{counter.duration} → 0</span></div>
        <input aria-label="Inicio del contador en la música" className="music-marker-range music-countdown-marker" type="range" min="0" max={duration} step="0.01" value={counter.start} disabled={disabled} onChange={event => counter.onChange(Number(event.target.value))} /></>}
      <div className="music-playhead" style={{ left: percent(cursor) + '%' }} />
      <input aria-label="Inicio del recorte de música" className="music-marker-range music-start-marker" type="range" min="0" max={duration} step="0.01" value={range.start} disabled={disabled} onChange={event => boundary('start', Number(event.target.value))} />
      <input aria-label="Final del recorte de música" className="music-marker-range music-end-marker" type="range" min="0" max={duration} step="0.01" value={range.end} disabled={disabled} onChange={event => boundary('end', Number(event.target.value))} />
    </div>
    <div className="music-time-ruler" aria-hidden="true">{Array.from({ length: tickCount + 1 }, (_, index) => <span key={index} style={{ left: `${index / tickCount * 100}%` }}>{clock(duration * index / tickCount)}</span>)}</div>
    <input aria-label="Posición de escucha de la canción" type="range" min="0" max={duration} step="0.01" value={Math.min(cursor,duration)} disabled={disabled} className="music-listen-range accent-indigo-500" onChange={event => {
      const time = Number(event.target.value); if (autoplay) listen(time, Math.min(duration, time+3), 160); else { stop(); setCursor(time); }
    }} />
    </div></div>
    <div className="music-trim-toolbar property-inline-fields">
      <button type="button" className="property-choice music-audition-button" aria-label={listening ? 'Detener escucha de música' : 'Escuchar selección de música'} aria-keyshortcuts="Space" title="Barra espaciadora: Play / Pausa desde la posición de escucha" disabled={disabled} onClick={toggleListening}>{listening ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}<span>{listening ? 'Pausa' : 'Escuchar'}</span><kbd>Espacio</kbd></button>
      <label>Inicio (s)<input aria-label="Inicio de música en segundos" className="studio-input" type="number" min="0" max={range.end} step="0.01" value={Number(range.start.toFixed(2))} disabled={disabled} onChange={event => boundary('start', Number(event.target.value))} /></label>
      <label>Final (s)<input aria-label="Final de música en segundos" className="studio-input" type="number" min={range.start} max={duration} step="0.01" value={Number(range.end.toFixed(2))} disabled={disabled} onChange={event => boundary('end', Number(event.target.value))} /></label>
      <button type="button" className="property-choice music-audition-button" aria-label="Usar canción completa" disabled={disabled} onClick={() => { stop(); onChange(setMusicTrim(config,undefined,duration)); }}><RotateCcw aria-hidden="true" /><span>Toda</span></button>
      <output className="property-note" aria-label="Segundo de escucha">{clock(cursor)}</output>
      {counter && <button type="button" className="property-choice music-audition-button countdown-position-button" disabled={disabled} onClick={() => counter.onChange(auditionPosition.current?.() ?? cursor)}><Timer aria-hidden="true" /><span>Contador aquí</span></button>}
    </div>
  </div>;
}
