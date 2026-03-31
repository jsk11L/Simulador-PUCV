import { Activity, BarChart3 } from 'lucide-react';
import type { Asignatura, ModeloCalificaciones, SimulacionResponse, VariablesSimulacion } from '../types';

interface UltimoResultadoViewProps {
  simResults: SimulacionResponse | null;
  nombreMalla: string;
  malla: Asignatura[];
  totalSemestres: number;
  variables: VariablesSimulacion;
  modeloCalif: ModeloCalificaciones;
  onVerDashboardCompleto: () => void;
}

export default function UltimoResultadoView({
  simResults,
  nombreMalla,
  malla,
  totalSemestres,
  variables,
  modeloCalif,
  onVerDashboardCompleto,
}: UltimoResultadoViewProps) {
  return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-4 sm:p-8">
      {simResults ? (
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <BarChart3 size={28} className="text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Ultimo Resultado</h2>
              <p className="text-sm text-slate-500">Malla: {nombreMalla} · {malla.length} asignaturas · {totalSemestres} semestres · {malla.reduce((s, a) => s + a.cred, 0)} creditos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Tasa Titulacion (PPE)</p>
              <p className="text-2xl font-black text-blue-600">{simResults.metricas_globales?.tasa_titulacion_pct}%</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Semestres Promedio (PSCE)</p>
              <p className="text-2xl font-black text-slate-800">{simResults.metricas_globales?.semestres_promedio}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Egreso Oportuno (PEO)</p>
              <p className="text-2xl font-black text-green-600">{simResults.metricas_globales?.egreso_oportuno_pct}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase">NE</p>
              <p className="text-lg font-black text-slate-700">{simResults.metricas_globales?.alumnos_simulados}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase">Eficiencia</p>
              <p className="text-lg font-black text-slate-700">{simResults.metricas_globales?.eficiencia_egreso}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase">Ret. 1° ano</p>
              <p className="text-lg font-black text-slate-700">{simResults.metricas_globales?.retencion_1er_anio_pct}%</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase">Ret. 3° ano</p>
              <p className="text-lg font-black text-slate-700">{simResults.metricas_globales?.retencion_3er_anio_pct}%</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Hiperparametros usados</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">NCSmax: {variables.ncsmax}</span>
              <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">TAmin: {variables.tamin}</span>
              <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">NapTAmin: {variables.naptamin}</span>
              <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">Opor: {variables.opor}</span>
              <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">VMap Basico: {modeloCalif.vmap1234}</span>
              <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">VMap Prof: {modeloCalif.vmap5678}</span>
              <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">VMap Tit: {modeloCalif.vmapm}</span>
            </div>
          </div>

          <button onClick={onVerDashboardCompleto} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
            <BarChart3 size={16} /> Ver Dashboard Completo
          </button>
        </div>
      ) : (
        <div className="text-center py-20">
          <Activity size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Sin resultados recientes</h2>
          <p className="text-slate-500">Ejecuta una simulacion primero para ver resultados aqui.</p>
        </div>
      )}
    </div>
  );
}
