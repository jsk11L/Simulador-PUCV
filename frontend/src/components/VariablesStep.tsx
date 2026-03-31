import { ChevronLeft, ChevronRight, Sliders } from 'lucide-react';
import type { VariablesSimulacion } from '../types';

type VariablesStepProps = {
  variables: VariablesSimulacion;
  setVariables: (variables: VariablesSimulacion) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function VariablesStep({ variables, setVariables, onBack, onNext }: VariablesStepProps) {
  const fieldClass = 'w-40 sm:w-44 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in relative">
      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-4 z-10 relative">
        <div className="flex items-center gap-3">
          <Sliders size={18} className="text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm sm:text-base">Variables de Simulacion</h3>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 overflow-y-scroll max-h-[52vh] sm:max-h-[58vh] pr-2">
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-3">Definir Variables de Simulacion</h2>
        <div className="max-w-3xl space-y-2.5">
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-start justify-between gap-3 mb-2">
              <label className="text-base font-bold text-slate-700">NE</label>
              <span className="text-sm text-slate-500 text-right">Numero de estudiantes a simular por iteracion</span>
            </div>
            <input
              type="number"
              value={variables.ne}
              onChange={(e) => setVariables({ ...variables, ne: Number(e.target.value) })}
              className={fieldClass}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-start justify-between gap-3 mb-2">
              <label className="text-base font-bold text-slate-700">NCSmax</label>
              <span className="text-sm text-slate-500 text-right">Creditos maximos permitidos por semestre</span>
            </div>
            <input
              type="number"
              value={variables.ncsmax}
              onChange={(e) => setVariables({ ...variables, ncsmax: Number(e.target.value) })}
              className={fieldClass}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-start justify-between gap-3 mb-2">
              <label className="text-base font-bold text-slate-700">TAmin</label>
              <span className="text-sm text-slate-500 text-right">Tasa minima de avance para evitar eliminacion</span>
            </div>
            <input
              type="number"
              step="0.1"
              value={variables.tamin}
              onChange={(e) => setVariables({ ...variables, tamin: Number(e.target.value) })}
              className={fieldClass}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-start justify-between gap-3 mb-2">
              <label className="text-base font-bold text-slate-700">NapTAmin</label>
              <span className="text-sm text-slate-500 text-right">Semestre en que comienza a aplicarse TAmin</span>
            </div>
            <input
              type="number"
              value={variables.naptamin}
              onChange={(e) => setVariables({ ...variables, naptamin: Number(e.target.value) })}
              className={fieldClass}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-start justify-between gap-3 mb-2">
              <label className="text-base font-bold text-slate-700">Opor</label>
              <span className="text-sm text-slate-500 text-right">Maximo de oportunidades antes de eliminacion</span>
            </div>
            <input
              type="number"
              value={variables.opor}
              onChange={(e) => setVariables({ ...variables, opor: Number(e.target.value) })}
              className={fieldClass}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 mt-3 border-t border-slate-200 shrink-0">
        <button
          onClick={onBack}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
        >
          <ChevronLeft size={16} /> Volver a la Malla
        </button>
        <button
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all"
        >
          Siguiente: Modelo Calificaciones <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
