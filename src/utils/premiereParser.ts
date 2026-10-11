import type { ParsedPremiereProject } from '../types';

export async function parsePremiereFile(file: File): Promise<ParsedPremiereProject> {
  if (file.size > 20 * 1024 * 1024) throw new Error('El inspector admite archivos XML de hasta 20 MB.');
  // Native .prproj is not a stable interchange format. Never invent data on parse failure.
  if (/\.prproj$/i.test(file.name)) throw new Error('Para un análisis confiable, abrí el proyecto en Premiere y exportá Archivo → Exportar → Final Cut Pro XML. Luego cargá ese XML.');
  return parsePremiereXml(await file.text(), file.name);
}
export function parsePremiereXml(xml: string, filename = 'Proyecto.xml'): ParsedPremiereProject {
  if (/<!ENTITY/i.test(xml)) throw new Error('El XML contiene entidades no admitidas.');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror') || doc.documentElement.tagName !== 'xmeml') throw new Error('Usá un XML de intercambio Final Cut Pro 7 (xmeml), exportado desde Premiere. FCPXML y XML nativo no son compatibles.');
  const sequence = doc.querySelector('sequence');
  if (!sequence) throw new Error('No se encontró una secuencia en el XML.');
  const text = (parent: Element | null, selector: string) => parent?.querySelector(selector)?.textContent?.trim() ?? '';
  const numeric = (value: string, fallback: number) => Number.isFinite(Number(value)) && value !== '' ? Number(value) : fallback;
  const rate = sequence.querySelector(':scope > rate');
  const base = numeric(text(rate, 'timebase'), 30);
  const fps = text(rate, 'ntsc') === 'TRUE' ? base / 1.001 : base;
  const characteristics = sequence.querySelector(':scope > media > video > format > samplecharacteristics');
  const width = numeric(text(characteristics, 'width'), 0), height = numeric(text(characteristics, 'height'), 0);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 128 || height < 128 || width > 4096 || height > 4096 || fps <= 0 || fps > 120) throw new Error('La secuencia tiene una resolución o una frecuencia no compatible.');
  const videoTracks = [...sequence.querySelectorAll(':scope > media > video > track')];
  const clips: ParsedPremiereProject['clips'] = [];
  let maximumEnd = 0;
  for (const track of videoTracks) {
    for (const clip of track.querySelectorAll(':scope > clipitem')) {
      const start = numeric(text(clip, ':scope > start'), -1), end = numeric(text(clip, ':scope > end'), -1);
      // -1 denotes a transition boundary in FCP XML and needs a dedicated resolver.
      if (start < 0 || end < 0) throw new Error('Este XML usa límites de transición especiales. Exportá una secuencia con cortes directos para inspeccionarla.');
      if (end <= start) throw new Error('El XML contiene un clip con tiempos inválidos.');
      const file = clip.querySelector('file');
      const fileId = file?.getAttribute('id');
      const definition = fileId ? [...doc.querySelectorAll('file')].find(node => node.getAttribute('id') === fileId && node.querySelector('pathurl')) : file;
      const hasMotion = !!clip.querySelector('filter effect');
      clips.push({ name: text(clip, ':scope > name'), startFrame: start, durationFrames: end - start,
        durationSeconds: (end - start) / fps, mediaPath: text(definition ?? null, 'pathurl'),
        hasTransitions: !!track.querySelector('transitionitem'), hasMotionEffects: hasMotion });
      maximumEnd = Math.max(maximumEnd, end);
    }
  }
  if (!clips.length) throw new Error('La secuencia no contiene clips de video para inspeccionar.');
  clips.sort((a,b) => a.startFrame - b.startFrame);
  const total = Math.max(maximumEnd, numeric(text(sequence, ':scope > duration'), maximumEnd));
  return { filename, version: 'XML de intercambio xmeml ' + doc.documentElement.getAttribute('version'),
    sequenceName: text(sequence, ':scope > name') || 'Secuencia', width, height, timebase: fps,
    videoTracksCount: videoTracks.length, audioTracksCount: sequence.querySelectorAll(':scope > media > audio > track').length,
    totalDurationFrames: total, totalDurationSeconds: total / fps, clipsCount: clips.length, clips, rawXmlPreview: xml.slice(0,4000) };
}

