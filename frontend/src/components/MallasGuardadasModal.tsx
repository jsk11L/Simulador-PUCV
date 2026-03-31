import { LayoutGrid, Search, X } from 'lucide-react';
import type { MallaGuardada } from '../types';

type MallasGuardadasModalProps = {
  isOpen: boolean;
  mallasGuardadas: MallaGuardada[];
  onClose: () => void;
  onSelectMalla: (malla: MallaGuardada) => void;
};

export default function MallasGuardadasModal({
  isOpen,
  mallasGuardadas,
  onClose,
  onSelectMalla,
}: MallasGuardadasModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-100 p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 relative animate-in zoom-in-95 flex flex-col max-h-[80vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6 shrink-0">
          <Search className="text-blue-600" size={28} />
          <h3 className="text-xl font-bold text-slate-800">Seleccionar Malla Guardada</h3>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {mallasGuardadas.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <LayoutGrid size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No tienes ninguna malla guardada por ahora.</p>
            </div>
          ) : (
            mallasGuardadas.map((mg) => (
              <div
                key={mg.id}
                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 transition-colors shadow-sm"
              >
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{mg.nombre}</h4>
                  <div className="flex gap-4 mt-1 text-xs font-semibold text-slate-500">
                    <span>{mg.asignaturas.length} Asignaturas</span>
                    <span>{mg.totalSemestres} Semestres</span>
                    <span>Guardado el: {mg.fecha}</span>
                  </div>
                </div>
                <button
                  onClick={() => onSelectMalla(mg)}
                  className="bg-green-100 text-green-700 hover:bg-green-200 font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Utilizar Malla
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
