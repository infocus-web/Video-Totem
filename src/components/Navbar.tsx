import { Film, FileCode2, HelpCircle, Download } from 'lucide-react';
import type { ViewTab } from '../types';
interface Props {
  currentTab: ViewTab; onTabChange: (tab: ViewTab) => void;
  onOpenPremiereModal: () => void; onOpenExportModal: () => void; onOpenFaqModal: () => void;
  totalPhotos: number; totalDuration: number;
}
export function Navbar(props: Props) {
  return <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-amber-400 shadow-lg shadow-indigo-500/20"><Film aria-hidden="true" className="h-5 w-5" /></div>
        <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-lg font-extrabold tracking-tight">AutoReel Studio</h1><span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-400">9:16 VERTICAL</span></div>
          <p className="hidden text-xs text-neutral-400 sm:block">Automatizador de videos para fotógrafos & editores de Premiere Pro</p>
        </div>
      </div>
      <nav aria-label="Editor" className="order-3 flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-950 p-1 text-xs xl:order-none">
        <button aria-current={props.currentTab === 'editor' ? 'page' : undefined} onClick={() => props.onTabChange('editor')} className={'rounded-lg px-3.5 py-1.5 font-medium transition ' + (props.currentTab === 'editor' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white')}>Editor</button>
        <button aria-current={props.currentTab === 'timeline' ? 'page' : undefined} onClick={() => props.onTabChange('timeline')} className={'flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-medium transition ' + (props.currentTab === 'timeline' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white')}>
          <span>Línea de tiempo</span><span aria-hidden="true" className="rounded-full bg-neutral-700 px-1.5 text-[10px] text-neutral-300">{props.totalPhotos}</span>
        </button>
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={props.onOpenPremiereModal} className="quick-button" title="Examinar XML de intercambio para Premiere"><FileCode2 aria-hidden="true" className="!text-violet-400" /><span>Inspector XML</span></button>
        <button aria-label="Cómo usar AutoReel" onClick={props.onOpenFaqModal} className="preview-control"><HelpCircle aria-hidden="true" className="h-4 w-4" /></button>
        <button onClick={props.onOpenExportModal} className="primary-button"><Download aria-hidden="true" className="h-3.5 w-3.5" />Exportar ({props.totalDuration.toFixed(1)}s)</button>
      </div>
    </div>
  </header>;
}

