import type { ChangeEvent, ReactNode } from 'react';
import { EditorTool } from './EditorTool';

interface Props {
  label: string; caption: string; icon: ReactNode; accept?: string; directory?: boolean; multiple?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void; onChoose?: () => void;
}
export function LocalFilePicker({ label, caption, icon, accept, directory, multiple, onChange, onChoose }: Props) {
  const input = <input aria-label={label} type="file" accept={accept} multiple={multiple} {...(directory ? { webkitdirectory: '', directory: '' } : {})} onChange={onChange} className="sr-only" />;
  const content = <>{icon}<span aria-hidden="true" className="editor-tile-caption">{caption}</span></>;
  return <>
    <EditorTool label={onChoose ? label + ': se recuerda el acceso al original para reconectarlo automáticamente.' : label}>
      {onChoose ? <button type="button" aria-label={label + ' y recordar ubicación'} className="editor-icon-button" onClick={onChoose}>{content}</button> : <label className="editor-icon-button">{content}{input}</label>}
    </EditorTool>
    {onChoose && input}
  </>;
}
