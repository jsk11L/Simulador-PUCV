import { BarChart3, History } from 'lucide-react';
import type { ResultadoPasado } from '../types';

interface ResultadosPasadosViewProps {
  resultadosPasados: ResultadoPasado[];
}

export default function ResultadosPasadosView({ resultadosPasados }: ResultadosPasadosViewProps) {
  return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-4 sm:p-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
        <History size={28} className="text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Resultados Pasados</h2>
          <p className="text-sm text-slate-500">{resultadosPasados.length} simulaciones registradas</p>
        </div>
      </div>
      {resultadosPasados.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg font-medium">Aun no has ejecutado ninguna simulacion.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {resultadosPasados.map((r) => (
            <div key={r.id} className="p-5 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all bg-white">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-800 text-lg">{r.malla_nombre}</h4>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{new Date(r.created_at).toLocaleString('es-CL')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Malla</p>
                  <p className="text-sm text-slate-700"><strong>{r.total_asignaturas}</strong> asignaturas · <strong>{r.total_semestres}</strong> semestres</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Simulacion</p>
                  <p className="text-sm text-slate-700"><strong>{r.metricas_globales?.alumnos_simulados}</strong> alumnos simulados</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className={`px-3 py-1 rounded-lg font-bold ${r.metricas_globales?.tasa_titulacion_pct >= 50 ? 'bg-green-100 text-green-700' : r.metricas_globales?.tasa_titulacion_pct >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  PPE: {r.metricas_globales?.tasa_titulacion_pct}%
                </span>
                <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">PSCE: {r.metricas_globales?.semestres_promedio}</span>
                <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">EE: {r.metricas_globales?.eficiencia_egreso}</span>
                <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold">PEO: {r.metricas_globales?.egreso_oportuno_pct}%</span>
                <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold">Ret 1°: {r.metricas_globales?.retencion_1er_anio_pct}%</span>
                <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold">Ret 3°: {r.metricas_globales?.retencion_3er_anio_pct}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
