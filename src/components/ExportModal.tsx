import { useState } from 'react';
import type { SequenceSlide, SequenceConfig } from '../types';
import { generatePremiereXml } from '../utils/premiereXmlGenerator';
import { downloadBlob } from '../utils/download';
import { recordingFormat } from '../utils/videoRecorder';
import { Modal } from './Modal';
export function ExportModal({ isOpen, onClose, slides, config, onTriggerDirectVideoRender }: { isOpen: boolean; onClose: () => void; slides: SequenceSlide[]; config: SequenceConfig; onTriggerDirectVideoRender: () => void }) {
  const [error, setError] = useState('');
  const format = recordingFormat();
  const unresolved = slides.some(slide => slide.photos.some(photo => !photo.previewUrl));
  const downloadXml = () => {
    try { const xml = generatePremiereXml(slides,config); downloadBlob(new Blob([xml], { type: 'application/xml;charset=utf-8' }), (config.name || 'AutoReel') + '_Premiere.xml'); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo generar el XML.'); }
  };
  return <Modal open={isOpen} onClose={onClose} title="Exportar montaje">
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    <section className="rounded-2xl border border-emerald-800 p-4 space-y-3"><h3 className="font-bold">Video final · {format?.extension.toUpperCase() ?? 'No disponible'}</h3>
      <p className="text-sm text-neutral-400">Incluye la composición, movimientos, transiciones, títulos y música. Se graba en tiempo real: mantené la pestaña visible.</p>
      <button disabled={!slides.length || unresolved || !format} onClick={() => { onClose(); onTriggerDirectVideoRender(); }} className="control">Grabar y descargar video</button>
      {unresolved && <p className="text-xs text-amber-300">Volvé a conectar las fotos del proyecto antes de grabar.</p>}
    </section>
    <section className="rounded-2xl border border-violet-800 p-4 space-y-3"><h3 className="font-bold">Secuencia editable para Premiere · XML</h3>
      <p className="text-sm text-neutral-400">Exporta nombres, rutas, orden, duración y pistas de fotos. Los grupos de dos o tres fotos se distribuyen en pistas simultáneas con escala y posición básicas.</p>
      <p className="text-xs text-amber-200">El XML no incluye el fondo difuminado, textos, música ni transiciones y animaciones del navegador. Verificá escala y posición al importar en tu versión de Premiere. Para conservar todo el diseño, descargá el video final.</p>
      {config.photoFit === 'cover' && <p className="text-xs text-amber-200">Rellenar cuadro se conserva en el video final. El XML base usa la foto completa.</p>}
      <button disabled={!slides.length} onClick={downloadXml} className="control">Descargar XML de Premiere</button>
      <p className="text-xs text-neutral-500">En Premiere: Archivo → Importar. Los originales deben existir en la ruta de carpeta que indicaste.</p>
    </section>
    <button disabled={!slides.length} className="control" onClick={() => downloadBlob(new Blob([slides.flatMap(slide => slide.photos.map(photo => photo.fullLocalPath)).join('\n')], { type: 'text/plain;charset=utf-8' }), (config.name || 'AutoReel') + '_archivos.txt')}>Descargar lista de archivos</button>
  </Modal>;
}

