import { ChevronLeft, ChevronRight } from 'lucide-react';

interface KanbanTopControlsProps {
  onScrollLeft: () => void;
  onScrollRight: () => void;
}

export default function KanbanTopControls({ onScrollLeft, onScrollRight }: KanbanTopControlsProps) {
  return (
    <div className="sticky top-0 z-20 mb-4 rounded-xl border border-blue-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs sm:text-sm font-semibold text-slate-600">
          Usa el desplazamiento vertical para recorrer el paso y las flechas para ver mas semestres.
        </p>
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 hidden xl:inline">Mover semestres</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onScrollLeft}
              className="h-10 w-10 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center"
              title="Ver semestres anteriores"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={onScrollRight}
              className="h-10 w-10 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center"
              title="Ver semestres siguientes"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
