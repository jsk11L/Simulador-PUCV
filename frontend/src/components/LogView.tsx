import { FileText } from 'lucide-react';
import type { Asignatura, SimulacionResponse } from '../types';

interface LogViewProps {
  simResults: SimulacionResponse | null;
  nombreMalla: string;
  malla: Asignatura[];
}

export default function LogView({ simResults, nombreMalla, malla }: LogViewProps) {
  return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-4 sm:p-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
        <FileText size={28} className="text-slate-600" />
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Log de Datos (JSON)</h2>
          {simResults && <p className="text-sm text-slate-500">Malla: {nombreMalla} · {malla.length} asignaturas · {simResults.metricas_globales?.alumnos_simulados} alumnos</p>}
        </div>
      </div>
      {simResults ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-xs font-bold text-slate-400">PPE</p>
              <p className="text-lg font-black text-blue-600">{simResults.metricas_globales?.tasa_titulacion_pct}%</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xs font-bold text-slate-400">PSCE</p>
              <p className="text-lg font-black text-slate-700">{simResults.metricas_globales?.semestres_promedio}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-xs font-bold text-slate-400">PEO</p>
              <p className="text-lg font-black text-green-600">{simResults.metricas_globales?.egreso_oportuno_pct}%</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xs font-bold text-slate-400">EE</p>
              <p className="text-lg font-black text-slate-700">{simResults.metricas_globales?.eficiencia_egreso}</p>
            </div>
          </div>
          <pre className="bg-slate-900 text-green-400 p-6 rounded-xl text-xs overflow-auto max-h-[60vh] font-mono leading-relaxed">
            {JSON.stringify(simResults, null, 2)}
          </pre>
        </>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg font-medium">No hay datos de simulacion para mostrar.</p>
        </div>
      )}
    </div>
  );
}
