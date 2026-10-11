import { Film, FileCode2, HelpCircle, Download } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import type { ViewTab } from '../types';
interface Props {
  currentTab: ViewTab; onTabChange: (tab: ViewTab) => void;
  onOpenPremiereModal: () => void; onOpenExportModal: () => void; onOpenFaqModal: () => void;
  totalPhotos: number; totalDuration: number; formatLabel: string; busy: boolean;
  projectActions: ReactNode;
}
export function Navbar(props: Props) {
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const updateHeight = () => document.documentElement.style.setProperty('--app-header-height', element.getBoundingClientRect().height + 'px');
    updateHeight();
    const observer = new ResizeObserver(updateHeight); observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--app-header-height'); };
  }, []);
  return <header ref={header} className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur">
    <div className="app-navbar-inner">
      <div className="app-brand">
        <div className="app-brand-icon"><Film aria-hidden="true" className="h-4 w-4" /></div>
        <h1 className="font-extrabold tracking-tight">AutoReel Studio</h1><span className="app-format-badge">{props.formatLabel}</span>
      </div>
      <nav aria-label="Editor" className="app-editor-nav">
        <button aria-current={props.currentTab === 'editor' ? 'page' : undefined} onClick={() => props.onTabChange('editor')} className={'rounded-md px-2 py-1 font-medium transition ' + (props.currentTab === 'editor' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white')}>Editor</button>
        <button aria-current={props.currentTab === 'timeline' ? 'page' : undefined} onClick={() => props.onTabChange('timeline')} className={'flex items-center gap-1.5 rounded-md px-2 py-1 font-medium transition ' + (props.currentTab === 'timeline' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white')}>
          <span>Línea de tiempo</span><span aria-hidden="true" className="rounded-full bg-neutral-700 px-1.5 text-[10px] text-neutral-300">{props.totalPhotos}</span>
        </button>
      </nav>
      <div className="app-project-actions">{props.projectActions}</div>
      <div className="app-main-actions">
        <button aria-label="Inspector XML" disabled={props.busy} onClick={props.onOpenPremiereModal} className="quick-button" title="Examinar XML de intercambio para Premiere"><FileCode2 aria-hidden="true" className="!text-violet-400" /><span className="app-inspector-label">Inspector XML</span></button>
        <button aria-label="Cómo usar AutoReel" onClick={props.onOpenFaqModal} className="preview-control"><HelpCircle aria-hidden="true" className="h-4 w-4" /></button>
        <button disabled={props.busy} onClick={props.onOpenExportModal} className="primary-button"><Download aria-hidden="true" className="app-export-icon h-3.5 w-3.5" />Exportar ({props.totalDuration.toFixed(1)}s)</button>
      </div>
    </div>
  </header>;
}

