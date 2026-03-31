import { FilePlus } from 'lucide-react';

interface KanbanAddSemesterCardProps {
  totalSemestres: number;
  maxSemestres: number;
  onAddSemestre: () => void;
}

export default function KanbanAddSemesterCard({
  totalSemestres,
  maxSemestres,
  onAddSemestre,
}: KanbanAddSemesterCardProps) {
  const reachedLimit = totalSemestres >= maxSemestres;

  return (
    <div className="min-w-[260px] sm:min-w-[280px] bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-xl p-3 flex items-center justify-center shrink-0 snap-start">
      <button
        onClick={onAddSemestre}
        disabled={reachedLimit}
        className="text-slate-400 font-bold hover:text-blue-600 transition-colors flex flex-col items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-slate-400"
      >
        <FilePlus size={24} />
        {reachedLimit ? `Límite máximo: ${maxSemestres}` : `Añadir Semestre ${totalSemestres + 1}`}
      </button>
    </div>
  );
}
