import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Clock,
  Sparkles,
  Move,
  Film,
  Layers,
  HardDrive,
  SplitSquareVertical,
  Maximize2
} from 'lucide-react';
import type { SequenceSlide, SequenceConfig, PhotoItem, TransitionType } from '../types';

interface TimelineViewProps {
  slides: SequenceSlide[];
  onUpdateSlide: (index: number, updated: Partial<SequenceSlide>) => void;
  onMoveSlide: (index: number, direction: 'left' | 'right') => void;
  onRemoveSlide: (index: number) => void;
  onTogglePhotoOrientation: (slideIndex: number, photoIndex: number) => void;
  onUpdatePhoto: (slideIndex: number, photoIndex: number, motion: PhotoItem['kenBurns']) => void;
  config: SequenceConfig;
  onApplyGlobalTransition: (transition: TransitionType) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  slides,
  onUpdateSlide,
  onMoveSlide,
  onRemoveSlide,
  onTogglePhotoOrientation,
  onUpdatePhoto,
  config,
  onApplyGlobalTransition,
}) => {
  const totalDuration = slides.reduce((acc, s) => acc + s.duration, 0);
  const totalPhotosCount = slides.reduce((acc, s) => acc + s.photos.length, 0);

  if (slides.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400">
        <Film className="w-12 h-12 mx-auto text-neutral-600 mb-3" />
        <h3 className="text-base font-semibold text-neutral-200">
          No hay escenas en la línea de tiempo
        </h3>
        <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
          Escribe o pega los números de las fotos del cliente en la pestaña de Editor para comenzar a armar el video vertical.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sequence Header Stats */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-200">
              Secuencia: {config.name || 'AutoReel_Vertical_9x16'}
            </h3>
            <p className="text-[11px] text-neutral-400">
              {config.width}x{config.height} @ {config.fps} FPS • {slides.length} escenas editables
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-neutral-300">
          <div className="bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block text-[10px]">TOTAL ESCENAS</span>
            <span className="font-mono font-bold text-white">{slides.length} escenas ({totalPhotosCount} fotos)</span>
          </div>
          <div className="bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block text-[10px]">DURACIÓN TOTAL</span>
            <span className="font-mono font-bold text-amber-400">{totalDuration.toFixed(1)} segundos</span>
          </div>
        </div>
      </div>

      <div className="studio-card space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-indigo-400" aria-hidden="true" />Transiciones para todas las escenas</p>
        <div className="flex flex-wrap gap-2">{(['dissolve', 'zoom', 'wipe', 'none'] as const).map(transition => <button key={transition} className="quick-button" aria-pressed={slides.every(slide => (slide.transition === 'fade' ? 'dissolve' : slide.transition) === transition)} onClick={() => onApplyGlobalTransition(transition)}>{transition === 'dissolve' ? 'Todas: Fundido' : transition === 'zoom' ? 'Todas: Zoom' : transition === 'wipe' ? 'Todas: Wipe' : 'Todas: corte directo'}</button>)}</div>
        <p className="text-[11px] text-neutral-400">Se aplican en la vista previa y el video exportado. También podés cambiar cada escena.</p>
      </div>
      {/* Grid of Slide Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {slides.map((slide, slideIndex) => {
          const isStacked2 = slide.layout === 'split-2';
          const isStacked3 = slide.layout === 'split-3';

          return (
            <div
              key={slide.id}
              className={`bg-neutral-900 border rounded-2xl p-3.5 space-y-3 transition flex flex-col justify-between group ${
                isStacked2
                  ? 'border-indigo-500/40 hover:border-indigo-500/80 shadow-md shadow-indigo-950/20'
                  : isStacked3
                  ? 'border-amber-500/40 hover:border-amber-500/80 shadow-md shadow-amber-950/20'
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Header: Slide # & Layout badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-200 border border-neutral-700">
                    Escena #{slideIndex + 1}
                  </span>
                  {isStacked2 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                      <SplitSquareVertical className="w-3 h-3" /> 2 en 1
                    </span>
                  )}
                  {isStacked3 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> 3 en 1
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={slideIndex === 0}
                    onClick={() => onMoveSlide(slideIndex, 'left')}
                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30 transition"
                    title="Mover a la izquierda"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={slideIndex === slides.length - 1}
                    onClick={() => onMoveSlide(slideIndex, 'right')}
                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30 transition"
                    title="Mover a la derecha"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveSlide(slideIndex)}
                    className="p-1 rounded bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 transition ml-1"
                    title="Eliminar escena"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Thumbnails: Stacked or Single */}
              <div className={'relative rounded-xl overflow-hidden bg-black border border-neutral-800 p-1 flex justify-between gap-1 ' + (config.width > config.height ? 'flex-row' : 'flex-col')} style={{ aspectRatio: config.width / config.height }}>
                {slide.photos.map((photo, pIdx) => (
                  <div
                    key={photo.id}
                    className="relative w-full min-w-0 min-h-0 rounded-lg overflow-hidden bg-neutral-900 group/item flex-1"
                  >
                    {photo.previewUrl ? <img
                      src={photo.previewUrl}
                      alt={photo.filename}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    /> : <div className="p-3 text-xs text-amber-300">Reconectá {photo.filename}</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/70 text-white">
                          #{photo.number}
                        </span>
                        {/* Orientation pill */}
                        <button
                          type="button"
                          onClick={() => onTogglePhotoOrientation(slideIndex, pIdx)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800/90 text-neutral-300 hover:text-white transition"
                          title="Clic para cambiar horizontal/vertical"
                        >
                          {photo.orientation === 'horizontal' ? '↔ Horiz' : '↕ Vert'}
                        </button>
                      </div>
                      <span className="text-[10px] text-white/90 truncate font-mono">
                        {photo.filename}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Slide Settings */}
              <div className="space-y-2 pt-1 text-xs">
                {/* Duration */}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3" /> Duración escena:
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.4"
                      max="60"
                      value={slide.duration}
                      aria-label={'Duración escena ' + (slideIndex + 1)}
                      onChange={(e) =>
                        onUpdateSlide(slideIndex, {
                          duration: parseFloat(e.target.value) || 1.5,
                        })
                      }
                      className="w-14 bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-amber-400 font-mono text-center"
                    />
                    <span className="text-[11px] text-neutral-500">seg</span>
                  </div>
                </div>

                {/* Transition */}
                {slide.photos.map((photo, photoIndex) => <label key={photo.id} className="block text-[10px] text-neutral-400">
                  Movimiento · {photo.filename}
                  <select aria-label={'Movimiento ' + photo.filename} value={photo.kenBurns} onChange={event => onUpdatePhoto(slideIndex, photoIndex, event.target.value as PhotoItem['kenBurns'])} className="mt-1 w-full rounded bg-neutral-950 p-1 text-neutral-200">
                    <option value="static">Fijo</option><option value="zoom-in">Acercar</option><option value="zoom-out">Alejar</option><option value="pan-up">Subir</option><option value="pan-down">Bajar</option>
                  </select>
                </label>)}
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Transición:</label>
                  <select
                    aria-label={'Transición escena ' + (slideIndex + 1)}
                    value={slide.transition === 'fade' ? 'dissolve' : slide.transition}
                    onChange={(e) =>
                      onUpdateSlide(slideIndex, {
                        transition: e.target.value as SequenceSlide['transition'],
                      })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-[11px] text-neutral-200"
                  >
                    <option value="dissolve">Fundido</option>
                    <option value="wipe">Wipe · Barrido lateral</option>
                    <option value="zoom">Zoom Punch</option>
                    <option value="flash">Flash Blanco</option>
                    <option value="pan">Whip Pan</option>
                    <option value="none">Corte Directo</option>
                  </select>
                </div>

                {/* Layout Switcher */}
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Modo de cuadro:</label>
                  <select
                    aria-label={'Diseño escena ' + (slideIndex + 1)}
                    value={slide.layout}
                    onChange={(e) =>
                      onUpdateSlide(slideIndex, {
                        layout: e.target.value as SequenceSlide['layout'],
                      })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-[11px] text-neutral-200"
                  >
                    <option value="single">1 Foto (Pantalla completa)</option>
                    <option value="split-2">{config.width > config.height ? '2 en 1 (Lado a lado)' : '2 en 1 (Arriba y abajo)'}</option>
                    <option value="split-3">{config.width > config.height ? '3 en 1 (Lado a lado)' : '3 en 1 (Completa el cuadro)'}</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
