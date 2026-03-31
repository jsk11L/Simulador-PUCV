import { ChevronRight } from 'lucide-react';

interface KanbanBottomCtaProps {
  onContinue: () => void;
}

export default function KanbanBottomCta({ onContinue }: KanbanBottomCtaProps) {
  return (
    <div className="sticky bottom-0 z-20 mt-4 rounded-xl border border-blue-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex justify-end">
        <button
          onClick={onContinue}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all"
        >
          Continuar a la siguiente fase <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
