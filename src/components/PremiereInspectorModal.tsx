import { useState, type ChangeEvent } from 'react';
import type { ParsedPremiereProject } from '../types';
import { parsePremiereFile } from '../utils/premiereParser';
import { Modal } from './Modal';
export function PremiereInspectorModal({ isOpen, onClose, onApplyPremiereSettings }: { isOpen: boolean; onClose: () => void; onApplyPremiereSettings: (project: ParsedPremiereProject) => void }) {
  const [project, setProject] = useState<ParsedPremiereProject | null>(null), [error, setError] = useState(''), [processing, setProcessing] = useState(false);
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setProject(null); setError(''); setProcessing(true);
    try { setProject(await parsePremiereFile(file)); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo leer el proyecto.'); }
    finally { setProcessing(false); }
  };
  return <Modal open={isOpen} onClose={onClose} title="Inspector de XML de Premiere">
    <p className="text-sm text-neutral-400">En Premiere: Archivo → Exportar → Final Cut Pro XML. Cargá el archivo de intercambio para consultar sus pistas, tiempos y resolución.</p>
    <p className="text-xs text-neutral-500">Los proyectos .prproj nativos, FCPXML y efectos de plantillas no se reconstruyen automáticamente. Los archivos no reconocidos muestran un error.</p>
    <label className="block text-sm">Archivo XML<input aria-label="Archivo XML de Premiere" type="file" accept=".xml,.prproj" disabled={processing} onChange={event => void upload(event)} className="block mt-2" /></label>
    {processing && <p role="status">Analizando XML…</p>}
    {error && <p role="alert" className="text-amber-300 text-sm">{error}</p>}
    {project && <><p className="font-bold">{project.sequenceName}</p><p className="text-sm">{project.width} × {project.height} · {project.timebase.toFixed(3)} FPS · {project.totalDurationSeconds.toFixed(2)} s · {project.videoTracksCount} pistas de video · {project.clipsCount} clips</p>
      <div className="max-h-60 overflow-auto"><table className="w-full text-xs"><thead><tr><th className="text-left p-2">Clip</th><th>Inicio</th><th>Duración</th></tr></thead><tbody>{project.clips.map((clip,index) => <tr key={index} className="border-t border-neutral-800"><td className="p-2">{clip.name}</td><td className="text-center">{clip.startFrame}</td><td className="text-center">{clip.durationSeconds.toFixed(2)} s</td></tr>)}</tbody></table></div>
      <button onClick={() => onApplyPremiereSettings(project)} className="control">Aplicar resolución y FPS al editor</button>
      <p className="text-xs text-neutral-500">Esto cambia el formato del editor; conserva las fotos, el orden y la duración de tus escenas.</p>
      <details><summary className="text-xs cursor-pointer">Ver XML original</summary><pre className="mt-3 max-h-40 overflow-auto text-[10px]">{project.rawXmlPreview}</pre></details></>}
  </Modal>;
}

