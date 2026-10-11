import { useEffect, useId, useRef, type ReactNode } from 'react';
export function Modal({ open, onClose, title, children, compact = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; compact?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null), titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}
    className={(compact ? 'm-auto w-[min(94vw,26rem)]' : 'w-[min(94vw,48rem)]') + ' max-h-[90vh] rounded-3xl border border-neutral-700 bg-neutral-900 p-0 text-neutral-100 backdrop:bg-black/80'}>
    <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
      <h2 id={titleId} className="font-bold text-lg">{title}</h2>
      <button aria-label="Cerrar ventana" onClick={onClose} className="rounded-lg px-3 py-1 hover:bg-neutral-800">✕</button>
    </header>
    <div className="p-6 space-y-4">{open ? children : null}</div>
  </dialog>;
}

