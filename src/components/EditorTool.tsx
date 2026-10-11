import { cloneElement, useEffect, useId, useRef, useState, type AriaAttributes, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function EditorTool({ label, children }: { label: string; children: ReactElement<AriaAttributes> }) {
  const trigger = useRef<HTMLSpanElement>(null);
  const id = useId();
  const [hint, setHint] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const show = () => {
    const box = trigger.current?.getBoundingClientRect();
    if (!box) return;
    const above = box.bottom + 120 > window.innerHeight;
    setHint({ left: Math.max(132, Math.min(window.innerWidth - 132, box.x + box.width / 2)), top: above ? box.top - 8 : box.bottom + 8, above });
  };
  useEffect(() => {
    if (!hint) return;
    const hide = () => setHint(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => { window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide); };
  }, [hint]);
  return <span ref={trigger} className="editor-tool" onPointerEnter={event => { if (event.pointerType !== 'touch') show(); }} onPointerLeave={() => { if (!trigger.current?.contains(document.activeElement)) setHint(null); }} onFocus={show} onBlur={() => setHint(null)} onClick={() => setHint(null)} onKeyDown={event => { if (event.key === 'Escape') setHint(null); }}>
    {cloneElement(children, { 'aria-describedby': hint ? id : undefined })}
    {hint && createPortal(<span id={id} role="tooltip" className="editor-tool-hint" style={{ left: hint.left, top: hint.top, transform: hint.above ? 'translate(-50%, -100%)' : 'translateX(-50%)' }}>{label}</span>, document.body)}
  </span>;
}

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string; caption?: string; hint?: string; children: ReactNode; variant?: 'primary';
}
export function EditorToolButton({ label, caption = label, hint, children, variant, className = '', ...props }: ButtonProps) {
  return <EditorTool label={hint || label}><button {...props} type="button" data-variant={variant} className={'editor-icon-button ' + className}>{children}<span aria-hidden="true" className="editor-tile-caption">{caption}</span><span className="sr-only">{label}</span></button></EditorTool>;
}
