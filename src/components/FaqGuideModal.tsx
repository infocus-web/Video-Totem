import { Modal } from './Modal';
export function FaqGuideModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return <Modal open={isOpen} onClose={onClose} title="Cómo usar AutoReel Studio">
    <ol className="list-decimal pl-5 space-y-3 text-sm">
      <li>Seleccioná la carpeta o las fotos de tu sesión. Con una selección vacía y sin escenas previas, se arma el montaje automáticamente. JPG, PNG, WebP y AVIF; hasta 400 fotos, 50 MB por archivo. RAW y HEIC requieren conversión previa.</li>
      <li>Para Premiere, pegá la ruta absoluta de esa carpeta. Al seleccionar subcarpetas, se conservan sus rutas relativas.</li>
      <li>Pegá la selección del cliente y pulsá Aplicar selección, o usá todas las fotos. Revisá el aviso de faltantes y nombres ambiguos.</li>
      <li>Configurá el formato, la duración, los textos y la música. Las tarjetas de apilado cambian la distribución del montaje al seleccionarlas. Al reagrupar se conservan el orden y los movimientos; cada grupo usa la duración de su primera foto.</li>
      <li>En Línea de tiempo podés reordenar, eliminar, dividir escenas y ajustar duración, transición y movimiento. Fade, Zoom y Wipe se aplican por escena o a todo el montaje y se conservan en el video exportado.</li>
      <li>Grabá el video final o descargá el XML editable. El XML exporta una secuencia base; el video conserva todos los efectos.</li>
    </ol>
    <p className="text-sm text-neutral-400">Tu proyecto se guarda automáticamente en este navegador. También podés descargarlo como JSON. Al reabrir, reconectá las fotos y la música: los archivos multimedia no se incluyen en el JSON.</p>
    <p className="text-sm text-neutral-400">Para Drive, descargá o sincronizá la carpeta y elegila desde tu computadora. La aplicación no pide credenciales ni tiene acceso directo a tu cuenta de Google.</p>
  </Modal>;
}

