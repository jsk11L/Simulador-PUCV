import { ChevronLeft, ChevronRight, Sliders } from 'lucide-react';
import type { VariablesSimulacion } from '../types';

type VariablesStepProps = {
  variables: VariablesSimulacion;
  setVariables: (variables: VariablesSimulacion) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function VariablesStep({ variables, setVariables, onBack, onNext }: VariablesStepProps) {
  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in relative">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 z-10 relative">
        <div className="flex items-center gap-3">
          <Sliders size={20} className="text-blue-600" />
          <h3 className="font-bold text-slate-800">Variables de Simulacion</h3>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Definir Variables de Simulacion (Estudiantes y Avance)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">NE (Numero de Estudiantes)</label>
              <input
                type="number"
                value={variables.ne}
                onChange={(e) => setVariables({ ...variables, ne: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">Cantidad de estudiantes virtuales a generar por iteracion.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">NCSmax (Creditos Maximos)</label>
              <input
                type="number"
                value={variables.ncsmax}
                onChange={(e) => setVariables({ ...variables, ncsmax: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">Tope de creditos permitidos en inscripcion semestral.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Opor (Oportunidades Maximas)</label>
              <input
                type="number"
                value={variables.opor}
                onChange={(e) => setVariables({ ...variables, opor: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">N maximo de veces para cursar y reprobar una misma asignatura.</p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">TAmin (Tasa de Avance Minima)</label>
              <input
                type="number"
                step="0.1"
                value={variables.tamin}
                onChange={(e) => setVariables({ ...variables, tamin: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">Creditos minimos que se deben aprobar para no ser eliminado.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">NapTAmin (Semestre Aplicacion TAmin)</label>
              <input
                type="number"
                value={variables.naptamin}
                onChange={(e) => setVariables({ ...variables, naptamin: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">Semestre en el que comienza a regir la eliminacion por TAmin.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 mt-4 border-t border-slate-200 shrink-0">
        <button
          onClick={onBack}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
        >
          <ChevronLeft size={18} /> Volver a la Malla
        </button>
        <button
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all"
        >
          Siguiente: Modelo Calificaciones <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
