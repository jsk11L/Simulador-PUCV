import { BarChart3, ChevronLeft, LayoutGrid, Play, Rocket, Sliders } from 'lucide-react';
import type { Asignatura, ModeloCalificaciones, VariablesSimulacion } from '../types';

type ResumenStepProps = {
  nombreMalla: string;
  malla: Asignatura[];
  totalSemestres: number;
  variables: VariablesSimulacion;
  modeloCalif: ModeloCalificaciones;
  onBack: () => void;
  onRunSimulation: () => void;
};

export default function ResumenStep({
  nombreMalla,
  malla,
  totalSemestres,
  variables,
  modeloCalif,
  onBack,
  onRunSimulation,
}: ResumenStepProps) {
  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in relative">
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-200">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <Rocket size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">Resumen de la Simulacion</h2>
            <p className="text-slate-500 font-medium mt-1">
              Verifica todos los parametros ingresados antes de ejecutar el motor de Montecarlo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
              <LayoutGrid className="text-blue-500" size={20} />
              <h3 className="font-bold text-slate-800 text-lg">Malla Curricular</h3>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">Nombre</span> <span className="font-black text-slate-900 truncate ml-2">{nombreMalla}</span></li>
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">Asignaturas</span> <span className="font-black text-slate-900">{malla.length}</span></li>
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">Semestres Totales</span> <span className="font-black text-slate-900">{totalSemestres}</span></li>
            </ul>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
              <Sliders className="text-blue-500" size={20} />
              <h3 className="font-bold text-slate-800 text-lg">Variables</h3>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">NE (Alumnos)</span> <span className="font-black text-slate-900">{variables.ne}</span></li>
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">NCSmax (Creditos Max)</span> <span className="font-black text-slate-900">{variables.ncsmax}</span></li>
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">TAmin (Avance Min)</span> <span className="font-black text-slate-900">{variables.tamin}</span></li>
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">NapTAmin (Semestre Aplic)</span> <span className="font-black text-slate-900">{variables.naptamin}</span></li>
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">Opor (Oportunidades)</span> <span className="font-black text-slate-900">{variables.opor}</span></li>
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">Iteraciones Montecarlo</span> <span className="font-black text-slate-900">{variables.iteraciones}</span></li>
            </ul>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
              <BarChart3 className="text-blue-500" size={20} />
              <h3 className="font-bold text-slate-800 text-lg">Modelo Estocastico</h3>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">VMap1234 (Media Basica)</span> <span className="font-black text-slate-900">{modeloCalif.vmap1234}</span></li>
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">Delta1234 (Desv Basica)</span> <span className="font-black text-slate-900">{modeloCalif.delta1234}</span></li>
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">VMap5678 (Media Prof.)</span> <span className="font-black text-slate-900">{modeloCalif.vmap5678}</span></li>
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">Delta5678 (Desv Prof.)</span> <span className="font-black text-slate-900">{modeloCalif.delta5678}</span></li>
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">VMapM (Media Titulacion)</span> <span className="font-black text-slate-900">{modeloCalif.vmapm}</span></li>
              <li className="flex justify-between"><span className="text-slate-500 font-semibold">DeltaM (Desv Titulacion)</span> <span className="font-black text-slate-900">{modeloCalif.deltam}</span></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 mt-4 border-t border-slate-200 shrink-0">
        <button
          onClick={onBack}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
        >
          <ChevronLeft size={18} /> Volver
        </button>
        <button
          onClick={onRunSimulation}
          className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-green-500/30 transition-all text-lg"
        >
          <Play size={20} className="fill-white" /> Iniciar Simulacion
        </button>
      </div>
    </div>
  );
}
