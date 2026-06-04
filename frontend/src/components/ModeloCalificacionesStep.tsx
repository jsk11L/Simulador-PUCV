import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ModeloCalificaciones } from '../types';
import HelpTip from './HelpTip';

const VMAP_HELP =
  'Valor medio de aprobación: la nota/probabilidad promedio que el motor asigna al evaluar un ramo en este ciclo. Más alto = estudiantes más fuertes en promedio.';
const DELTA_HELP =
  'Desviación: cuánta dispersión aleatoria (ruido gaussiano) se suma al valor medio. Más alto = resultados más variables entre estudiantes y ramos.';

type ModeloCalificacionesStepProps = {
  modeloCalif: ModeloCalificaciones;
  setModeloCalif: (modelo: ModeloCalificaciones) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function ModeloCalificacionesStep({
  modeloCalif,
  setModeloCalif,
  onBack,
  onNext,
}: ModeloCalificacionesStepProps) {
  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in relative">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 z-10 relative">
        <div className="flex items-center gap-3">
          <BarChart3 size={20} className="text-blue-600" />
          <h3 className="font-bold text-slate-800">Modelo de Calificaciones</h3>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Configurar Modelo Estocastico de Calificaciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2 flex items-center gap-1.5">
              Ciclo Basico (Sem 1 al 4)
              <HelpTip side="bottom" text="Parámetros del modelo estocástico de notas para los primeros 4 semestres. Suele ser el ciclo más exigente (alta reprobación en ramos de ciencias básicas)." />
            </h4>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">VMap1234 (Valor Medio Aprob.) <HelpTip side="bottom" text={VMAP_HELP} /></label>
              <input
                type="number"
                step="0.01"
                value={modeloCalif.vmap1234}
                onChange={(e) => setModeloCalif({ ...modeloCalif, vmap1234: Number(e.target.value) })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">Delta1234 (Desviacion) <HelpTip side="bottom" text={DELTA_HELP} /></label>
              <input
                type="number"
                step="0.01"
                value={modeloCalif.delta1234}
                onChange={(e) => setModeloCalif({ ...modeloCalif, delta1234: Number(e.target.value) })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2 flex items-center gap-1.5">
              Ciclo Profesional (Sem 5 al 8)
              <HelpTip side="bottom" text="Parámetros de notas para los semestres 5 a 8, donde predominan las asignaturas de especialidad de la carrera." />
            </h4>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">VMap5678 (Valor Medio Aprob.)</label>
              <input
                type="number"
                step="0.01"
                value={modeloCalif.vmap5678}
                onChange={(e) => setModeloCalif({ ...modeloCalif, vmap5678: Number(e.target.value) })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Delta5678 (Desviacion)</label>
              <input
                type="number"
                step="0.01"
                value={modeloCalif.delta5678}
                onChange={(e) => setModeloCalif({ ...modeloCalif, delta5678: Number(e.target.value) })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2 flex items-center gap-1.5">
              Ciclo Titulacion (Sem 9+)
              <HelpTip side="bottom" text="Parámetros de notas del tramo final (semestre 9 en adelante): práctica, electivos y proyecto de título. Suele tener menor reprobación." />
            </h4>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">VMapM (Valor Medio Aprob.)</label>
              <input
                type="number"
                step="0.01"
                value={modeloCalif.vmapm}
                onChange={(e) => setModeloCalif({ ...modeloCalif, vmapm: Number(e.target.value) })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">DeltaM (Desviacion)</label>
              <input
                type="number"
                step="0.01"
                value={modeloCalif.deltam}
                onChange={(e) => setModeloCalif({ ...modeloCalif, deltam: Number(e.target.value) })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 mt-4 border-t border-slate-200 shrink-0">
        <button
          onClick={onBack}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
        >
          <ChevronLeft size={18} /> Volver a Variables
        </button>
        <button
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all"
        >
          Siguiente: Revision Final <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
