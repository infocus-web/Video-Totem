import type { SequenceSlide, SequenceConfig } from '../types';
import { photoSlots } from './photoFraming.ts';

export function escapeXml(value: string) {
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
export function fileUrl(path: string) {
  const normalized = path.replace(/\\/g, '/');
  const encode = (value: string) => value.split('/').map(part => encodeURIComponent(part).replace(/%3A/gi, ':')).join('/');
  if (normalized.startsWith('//')) return 'file:' + encode(normalized);
  if (/^[A-Za-z]:\//.test(normalized)) return 'file://localhost/' + encode(normalized);
  if (normalized.startsWith('/')) return 'file://localhost' + encode(normalized);
  throw new Error('Indicá la ruta absoluta de la carpeta para exportar a Premiere.');
}
export function generatePremiereXml(slides: SequenceSlide[], config: SequenceConfig, fps = config.fps): string {
  if (!slides.length) throw new Error('El montaje está vacío.');
  if (![24,25,30,50,60].includes(fps)) throw new Error('Frecuencia de fotogramas no compatible.');
  let currentFrame = 0, id = 0;
  const tracks: string[][] = [[],[],[]];
  for (const slide of slides) {
    if (!slide.photos.length || slide.photos.length > 3 || !Number.isFinite(slide.duration) || slide.duration <= 0) throw new Error('Escena inválida.');
    const duration = Math.max(1,Math.round(slide.duration * fps)), start = currentFrame, end = start + duration;
    const count = slide.photos.length;
    const slots = photoSlots(count, config.width, config.height, config.splitGapSize);
    slide.photos.forEach((photo,index) => {
      id++;
      const width = photo.width || config.width, height = photo.height || config.height;
      const slot = slots[index];
      const scale = Math.min(slot.width / width, slot.height / height) * 100;
      const centerX = (slot.x + slot.width / 2 - config.width / 2) / config.width;
      const centerY = (slot.y + slot.height / 2 - config.height / 2) / config.height;
      tracks[index].push('<clipitem id="clip-' + id + '"><name>' + escapeXml(photo.filename) + '</name><duration>' + duration + '</duration><rate><timebase>' + fps + '</timebase><ntsc>FALSE</ntsc></rate><start>' + start + '</start><end>' + end + '</end><in>0</in><out>' + duration + '</out><file id="file-' + id + '"><name>' + escapeXml(photo.filename) + '</name><pathurl>' + escapeXml(fileUrl(photo.fullLocalPath)) + '</pathurl><rate><timebase>' + fps + '</timebase><ntsc>FALSE</ntsc></rate><duration>' + duration + '</duration><media><video><samplecharacteristics><width>' + width + '</width><height>' + height + '</height><pixelaspectratio>square</pixelaspectratio></samplecharacteristics></video></media></file><filter><effect><name>Basic Motion</name><effectid>basic</effectid><effectcategory>motion</effectcategory><effecttype>motion</effecttype><mediatype>video</mediatype><parameter><parameterid>scale</parameterid><name>Scale</name><value>' + scale.toFixed(4) + '</value></parameter><parameter><parameterid>center</parameterid><name>Center</name><value><horiz>' + centerX.toFixed(6) + '</horiz><vert>' + centerY.toFixed(6) + '</vert></value></parameter></effect></filter></clipitem>');
    });
    currentFrame = end;
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><sequence id="sequence-1"><name>' + escapeXml(config.name || 'AutoReel') + '</name><duration>' + currentFrame + '</duration><rate><timebase>' + fps + '</timebase><ntsc>FALSE</ntsc></rate><media><video><format><samplecharacteristics><width>' + config.width + '</width><height>' + config.height + '</height><pixelaspectratio>square</pixelaspectratio><rate><timebase>' + fps + '</timebase><ntsc>FALSE</ntsc></rate><fielddominance>none</fielddominance></samplecharacteristics></format>' + tracks.filter(track => track.length).map(track => '<track>' + track.join('\n') + '<enabled>TRUE</enabled><locked>FALSE</locked></track>').join('\n') + '</video></media></sequence></xmeml>';
}

