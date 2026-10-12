import { useState } from 'react';
import type { SequenceSlide, SequenceConfig } from '../types';
import { generatePremiereXml } from '../utils/premiereXmlGenerator';
import { downloadBlob } from '../utils/download';
import { recordingFormat } from '../utils/videoRecorder';
import { canChooseVideoLocation } from '../utils/saveVideo';
import { supportsBackgroundExport } from '../utils/videoRecorder';
import { videoOutput } from '../utils/videoOutput';
import { Modal } from './Modal';
export function ExportModal({ isOpen, onClose, slides, config, canRecord, onTriggerDirectVideoRender }: { isOpen: boolean; onClose: () => void; slides: SequenceSlide[]; config: SequenceConfig; canRecord: boolean; onTriggerDirectVideoRender: (chooseLocation: boolean) => void }) {
  const [error, setError] = useState('');
  const [chooseLocation, setChooseLocation] = useState(false);
  const locationAvailable = canChooseVideoLocation();
  const format = recordingFormat();
  const output = videoOutput(config);
  const unresolved = slides.some(slide => slide.photos.some(photo => !photo.previewUrl));
  const downloadXml = () => {
    try { const xml = generatePremiereXml(slides,config); downloadBlob(new Blob([xml], { type: 'application/xml;charset=utf-8' }), (config.name || 'AutoReel') + '_Premiere.xml'); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo generar el XML.'); }
  };
  return <Modal open={isOpen} onClose={onClose} title="Exportar montaje">
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    <section className="rounded-2xl border border-emerald-800 p-4 space-y-3"><h3 className="font-bold">Video final · {format?.extension.toUpperCase() ?? 'No disponible'}</h3>
      <p className="text-sm text-indigo-300">{output.width} × {output.height} · {config.fps} FPS{output.rotation !== 0 ? ' · Tótem TV: montaje completo girado 90° a la ' + (output.rotation === 90 ? 'derecha' : 'izquierda') : ''}</p>
      <p className="text-sm text-neutral-400">Incluye la composición, movimientos, transiciones, títulos y música. En Chrome/Edge compatibles se genera cuadro por cuadro con los originales; la velocidad depende de tu equipo. {supportsBackgroundExport(format?.extension) ? 'Podés cambiar de pestaña; dejá la app abierta hasta que termine.' : 'Con este formato o navegador, cambiar de pestaña pausa la grabación. Volvé para continuar; no se cancela.'}</p>
      <p className="text-xs text-neutral-500">Se comprueba que el MP4 incluya todos los cuadros. Navegadores sin codificación por cuadros usan la grabación en tiempo real; probá Chrome o Edge actualizado para la mejor calidad.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={chooseLocation && locationAvailable} disabled={!locationAvailable} onChange={event => setChooseLocation(event.target.checked)} className="accent-indigo-500" />Elegir dónde guardar al terminar</label>
      <p className="text-xs text-neutral-400">{locationAvailable ? 'Al terminar, tocá Elegir ubicación y guardar video para elegir la carpeta y el nombre. Si cancelás, el video queda listo para reintentar.' : 'Tu navegador usa su configuración de descargas. Activá que pregunte dónde guardar cada archivo para elegir la carpeta.'}</p>
      <button disabled={!slides.length || unresolved || !format || !canRecord} onClick={() => { onClose(); onTriggerDirectVideoRender(chooseLocation && locationAvailable); }} className="control">{chooseLocation && locationAvailable ? 'Grabar y elegir dónde guardar' : 'Grabar y descargar video'}</button>
      {slides.length > 0 && !unresolved && !canRecord && <p className="text-xs text-indigo-300">Esperá a que termine de prepararse la vista previa.</p>}
      {unresolved && <p className="text-xs text-amber-300">Volvé a conectar las fotos del proyecto antes de grabar.</p>}
    </section>
    <section className="rounded-2xl border border-violet-800 p-4 space-y-3"><h3 className="font-bold">Secuencia editable para Premiere · XML</h3>
      <p className="text-sm text-neutral-400">Exporta nombres, rutas, orden, duración y pistas de fotos. Los grupos de dos o tres fotos se distribuyen en pistas simultáneas con escala y posición básicas.</p>
      <p className="text-xs text-amber-200">El XML conserva las escenas base; no incluye los cortes musicales ni el contador de Entrada. Tampoco incluye el encuadre manual, giro, fondo difuminado, textos, música ni transiciones y animaciones del navegador. Verificá escala y posición al importar en tu versión de Premiere. Para conservar todo el diseño, descargá el video final.</p>
      {output.rotation !== 0 && <p className="text-xs text-amber-200">Tótem TV se aplica al video final. El XML conserva la secuencia vertical sin girar.</p>}
      {config.photoFit === 'cover' && <p className="text-xs text-amber-200">Rellenar cuadro se conserva en el video final. El XML base usa la foto completa.</p>}
      <button disabled={!slides.length} onClick={downloadXml} className="control">Descargar XML de Premiere</button>
      <p className="text-xs text-neutral-500">En Premiere: Archivo → Importar. Los originales deben existir en la ruta de carpeta que indicaste.</p>
    </section>
    <button disabled={!slides.length} className="control" onClick={() => downloadBlob(new Blob([slides.flatMap(slide => slide.photos.map(photo => photo.fullLocalPath)).join('\n')], { type: 'text/plain;charset=utf-8' }), (config.name || 'AutoReel') + '_archivos.txt')}>Descargar lista de archivos</button>
  </Modal>;
}

