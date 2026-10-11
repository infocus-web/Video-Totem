import { LoaderCircle } from 'lucide-react';
import type { FilePreparationProgress } from '../types';

export function PreparationProgress({ title, progress }: { title: string; progress: FilePreparationProgress | null }) {
  const total = progress?.total ?? 0;
  const completed = Math.min(total, Math.max(0, progress?.completed ?? 0));
  const percent = total ? Math.round(completed / total * 100) : null;
  return <div className="w-full min-w-0 space-y-3 rounded-xl border border-indigo-500/30 bg-neutral-950/95 p-4 text-left">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-indigo-200">
      <span className="flex min-w-0 items-center gap-2"><LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" /><span role="status">{title}…</span></span>
      {percent !== null && <span className="font-mono font-semibold tabular-nums">{percent}%</span>}
    </div>
    <progress aria-label={title} aria-valuetext={total ? `${completed} de ${total} fotos listas, ${percent}%` : undefined}
      value={total ? completed : undefined} max={total || 1} className="preparation-progress block h-2.5 w-full" />
    <p className="text-xs text-neutral-400">{total ? `${completed} de ${total} fotos listas` : 'Preparando el archivo. Puede tardar unos segundos.'}</p>
  </div>;
}
