import type { ReactNode } from 'react';

export function EditorPropertyRow({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return <div className="property-row">
    <span className="property-label" title={help}>{label}</span>
    <div className="property-control">{children}</div>
  </div>;
}
