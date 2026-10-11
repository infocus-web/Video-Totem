import { Film, FileCode2, HelpCircle, Download } from 'lucide-react';
import type { ViewTab } from '../types';
interface Props {
  currentTab: ViewTab; onTabChange: (tab: ViewTab) => void;
  onOpenPremiereModal: () => void; onOpenExportModal: () => void; onOpenFaqModal: () => void;
  totalPhotos: number; totalDuration: number;
}
export function Navbar(props: Props) {
  return <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur">
    <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-2.5"><Film aria-hidden="true" className="h-5 w-5" /></div>
          <div><h1 className="font-extrabold text-lg">AutoReel Studio</h1><p className="hidden sm:block text-xs text-neutral-400">Fotos a video · Edición local · Premiere XML</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={props.onOpenPremiereModal} className="control flex items-center gap-1.5"><FileCode2 aria-hidden="true" className="h-4 w-4 text-violet-300" /><span>Inspector XML</span></button>
          <button aria-label="Cómo usar AutoReel" onClick={props.onOpenFaqModal} className="control"><HelpCircle aria-hidden="true" className="h-4 w-4" /></button>
          <button onClick={props.onOpenExportModal} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold hover:bg-indigo-500"><Download aria-hidden="true" className="h-4 w-4" />Exportar ({props.totalDuration.toFixed(1)}s)</button>
        </div>
      </div>
      <nav aria-label="Editor" className="mt-3 flex gap-2 text-sm">
        <button aria-current={props.currentTab === 'editor' ? 'page' : undefined} onClick={() => props.onTabChange('editor')} className={'rounded-lg px-3 py-1.5 ' + (props.currentTab === 'editor' ? 'bg-neutral-700' : 'text-neutral-400 hover:bg-neutral-800')}>Editor</button>
        <button aria-current={props.currentTab === 'timeline' ? 'page' : undefined} onClick={() => props.onTabChange('timeline')} className={'rounded-lg px-3 py-1.5 ' + (props.currentTab === 'timeline' ? 'bg-neutral-700' : 'text-neutral-400 hover:bg-neutral-800')}>Línea de tiempo</button>
        <span className="ml-auto self-center text-xs text-neutral-500">{props.totalPhotos} fotos</span>
      </nav>
    </div>
  </header>;
}

