import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

export function NewProjectModal({ open, onClose, onCreate, hasPhotos }: {
  open: boolean; onClose: () => void; onCreate: (name: string) => void; hasPhotos: boolean;
}) {
  const [name, setName] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) { setName(''); input.current?.focus(); }
  }, [open]);
  return <Modal open={open} onClose={onClose} title="Nuevo proyecto" compact>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (name.trim()) onCreate(name.trim()); }}>
      <label className="block space-y-2 text-sm">
        <span>Nombre del nuevo proyecto</span>
        <input ref={input} value={name} onChange={event => setName(event.target.value)} required maxLength={120}
          placeholder="Ej: Aylu · Tótem TV" autoComplete="off" className="studio-input w-full" />
      </label>
      {hasPhotos && <p className="text-xs text-neutral-400">Al crear, se descarga un respaldo JSON del proyecto actual.</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="control" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={!name.trim()}>Crear proyecto</button>
      </div>
    </form>
  </Modal>;
}
