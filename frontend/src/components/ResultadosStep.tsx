import { AlertCircle, ArrowLeft, BarChart, BarChart3, ChevronRight, Download, Loader2, Play, Sliders, X, Activity } from 'lucide-react';
import type { ModeloCalificaciones, SimulacionResponse, VariablesSimulacion, Asignatura } from '../types';

interface ResultadosStepProps {
  isSimulating: boolean;
  simResults: SimulacionResponse | null;
  totalSemestres: number;
  variables: VariablesSimulacion;
  modeloCalif: ModeloCalificaciones;
  malla: Asignatura[];
  handleDownloadZip: () => void;
  setWizardStep: (step: 1 | 2 | 3 | 4 | 5) => void;
  handleRunSimulation: () => void;
}

export default function ResultadosStep({
  isSimulating,
  simResults,
  totalSemestres,
  variables,
  modeloCalif,
  malla,
  handleDownloadZip,
  setWizardStep,
  handleRunSimulation,
}: ResultadosStepProps) {
  if (isSimulating) {
    return (
      <div className="flex-1 flex flex-col h-full animate-in fade-in relative">
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8 relative">
            <Loader2 size={48} className="text-blue-600 animate-spin absolute" />
            <Activity size={24} className="text-blue-400" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">Simulando...</h2>
          <p className="text-slate-500 max-w-md text-lg">El motor de Montecarlo está procesando a los estudiantes con Golang.</p>
        </div>
      </div>
    );
  }

  if (!simResults) return null;

  const m = simResults.metricas_globales;
  const dist = simResults.distribucion_semestres || {};
  const ramos = simResults.ramos_criticos || [];
  const semKeys = Object.keys(dist).map(Number).sort((a, b) => a - b);
  const maxCount = semKeys.length > 0 ? Math.max(...semKeys.map(k => dist[k])) : 1;

  const kpiColor = (value: number, thresholds: [number, number]) => {
    if (value >= thresholds[1]) return 'text-green-600';
    if (value >= thresholds[0]) return 'text-amber-600';
    return 'text-red-600';
  };

  const kpiBg = (value: number, thresholds: [number, number]) => {
    if (value >= thresholds[1]) return 'bg-green-50 border-green-200';
    if (value >= thresholds[0]) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 shrink-0 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
              <BarChart3 size={22} className="text-green-600" />
            </div>
            Resultados de la Simulación
          </h2>
          <p className="text-slate-500 mt-1 ml-0 sm:ml-[52px] text-sm">{m.alumnos_simulados} estudiantes simulados · Motor Montecarlo</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button onClick={handleDownloadZip} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all text-xs sm:text-sm animate-pulse hover:animate-none">
            <Download size={16} /> Descargar (.zip)
          </button>
          <button onClick={() => setWizardStep(4)} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 sm:px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs sm:text-sm">
            <ArrowLeft size={16} /> Volver
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className={`rounded-xl border p-5 ${kpiBg(m.tasa_titulacion_pct, [30, 50])}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tasa de Titulación (PPE)</p>
          <p className={`text-3xl font-black ${kpiColor(m.tasa_titulacion_pct, [30, 50])}`}>{m.tasa_titulacion_pct}%</p>
          <p className="text-xs text-slate-500 mt-1">{m.titulados} de {m.alumnos_simulados} egresaron</p>
        </div>
        <div className="rounded-xl border bg-slate-50 border-slate-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Semestres Promedio (PSCE)</p>
          <p className="text-3xl font-black text-slate-800">{m.semestres_promedio}</p>
          <p className="text-xs text-slate-500 mt-1">Semestres para titularse</p>
        </div>
        <div className={`rounded-xl border p-5 ${m.eficiencia_egreso <= 1.3 ? 'bg-green-50 border-green-200' : m.eficiencia_egreso <= 1.6 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Eficiencia de Egreso (EE)</p>
          <p className={`text-3xl font-black ${m.eficiencia_egreso <= 1.3 ? 'text-green-600' : m.eficiencia_egreso <= 1.6 ? 'text-amber-600' : 'text-red-600'}`}>{m.eficiencia_egreso}</p>
          <p className="text-xs text-slate-500 mt-1">{m.eficiencia_egreso <= 1.0 ? 'Ideal' : `${((m.eficiencia_egreso - 1) * 100).toFixed(0)}% sobre el tiempo teórico`}</p>
        </div>
        <div className={`rounded-xl border p-5 ${kpiBg(m.egreso_oportuno_pct, [5, 20])}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Egreso Oportuno (PEO)</p>
          <p className={`text-3xl font-black ${kpiColor(m.egreso_oportuno_pct, [5, 20])}`}>{m.egreso_oportuno_pct}%</p>
          <p className="text-xs text-slate-500 mt-1">Se titularon dentro del plazo</p>
        </div>
        <div className={`rounded-xl border p-5 ${kpiBg(m.retencion_1er_anio_pct, [70, 85])}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Retención 1er Año</p>
          <p className={`text-3xl font-black ${kpiColor(m.retencion_1er_anio_pct, [70, 85])}`}>{m.retencion_1er_anio_pct}%</p>
          <p className="text-xs text-slate-500 mt-1">Sobreviven al 1er año</p>
        </div>
        <div className={`rounded-xl border p-5 ${kpiBg(m.retencion_3er_anio_pct, [50, 70])}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Retención 3er Año</p>
          <p className={`text-3xl font-black ${kpiColor(m.retencion_3er_anio_pct, [50, 70])}`}>{m.retencion_3er_anio_pct}%</p>
          <p className="text-xs text-slate-500 mt-1">Sobreviven al 3er año</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 shrink-0">
        <div className="rounded-xl border bg-orange-50 border-orange-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0"><AlertCircle size={24} className="text-orange-600" /></div>
          <div>
            <p className="text-sm font-bold text-orange-800">Eliminados por Tasa de Avance</p>
            <p className="text-2xl font-black text-orange-600">{m.eliminados_tamin} <span className="text-sm font-normal text-orange-500">estudiantes</span></p>
          </div>
        </div>
        <div className="rounded-xl border bg-red-50 border-red-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0"><X size={24} className="text-red-600" /></div>
          <div>
            <p className="text-sm font-bold text-red-800">Eliminados por Oportunidades</p>
            <p className="text-2xl font-black text-red-600">{m.eliminados_opor} <span className="text-sm font-normal text-red-500">estudiantes</span></p>
          </div>
        </div>
      </div>

      {semKeys.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6 shrink-0">
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><BarChart size={20} className="text-blue-500" />Distribución de Semestres de Titulación</h3>
          <p className="text-xs text-slate-500 mb-5">Cantidad de estudiantes que se titularon en cada semestre</p>
          <div className="flex items-end gap-1.5" style={{ height: '200px' }}>
            {semKeys.map(sem => {
              const count = dist[sem];
              const heightPct = (count / maxCount) * 100;
              return (
                <div key={sem} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="text-xs font-bold text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
                  <div className="w-full rounded-t-md transition-all duration-300 group-hover:opacity-80" style={{ height: `${Math.max(heightPct, 3)}%`, backgroundColor: sem <= totalSemestres ? '#22c55e' : sem <= totalSemestres + 2 ? '#3b82f6' : sem <= totalSemestres + 6 ? '#f59e0b' : '#ef4444' }} />
                  <span className="text-[10px] text-slate-500 mt-1.5 font-medium">S{sem}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-5 mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500" /><span className="text-[11px] text-slate-500">En tiempo</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500" /><span className="text-[11px] text-slate-500">Oportuno (+2 sem)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-500" /><span className="text-[11px] text-slate-500">Atrasado</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500" /><span className="text-[11px] text-slate-500">Muy atrasado (+6 sem)</span></div>
          </div>
        </div>
      )}

      {ramos.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6 shrink-0">
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><AlertCircle size={20} className="text-red-500" />Ramos Críticos</h3>
          <p className="text-xs text-slate-500 mb-4">Asignaturas rankeadas por tasa de fallo durante la simulación</p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50"><th className="text-left px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-500">#</th><th className="text-left px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-500">Sigla</th><th className="text-center px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-500">Intentos</th><th className="text-center px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-500">Reprobaciones</th><th className="text-right px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-500">Tasa de Fallo</th></tr></thead>
              <tbody>
                {ramos.slice(0, 15).map((ramo, idx: number) => (
                  <tr key={ramo.sigla} className={`border-t border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors`}>
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-800">{ramo.sigla}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{ramo.intentos}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{ramo.reprobaciones}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`inline-flex items-center gap-1 font-bold ${ramo.tasa_fallo_pct >= 40 ? 'text-red-600' : ramo.tasa_fallo_pct >= 25 ? 'text-amber-600' : 'text-green-600'}`}>
                        {ramo.tasa_fallo_pct}%
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden ml-1">
                          <div className={`h-full rounded-full ${ramo.tasa_fallo_pct >= 40 ? 'bg-red-500' : ramo.tasa_fallo_pct >= 25 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(ramo.tasa_fallo_pct, 100)}%` }} />
                        </div>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ramos.length > 15 && <div className="px-4 py-2 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-200">Mostrando los 15 ramos más críticos de {ramos.length} totales</div>}
          </div>
        </div>
      )}

      <details className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 shrink-0 group">
        <summary className="px-6 py-4 cursor-pointer select-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Sliders size={16} className="text-slate-500" />Configuración Utilizada</h3>
          <ChevronRight size={16} className="text-slate-400 group-open:rotate-90 transition-transform" />
        </summary>
        <div className="px-6 pb-5 pt-2 grid grid-cols-3 gap-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Malla</p><p className="text-sm text-slate-700"><strong>{malla.length}</strong> asignaturas</p><p className="text-sm text-slate-700"><strong>{totalSemestres}</strong> semestres</p></div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Variables</p><p className="text-sm text-slate-700">NE = <strong>{variables.ne}</strong></p><p className="text-sm text-slate-700">NCSmax = <strong>{variables.ncsmax}</strong></p><p className="text-sm text-slate-700">TAmin = <strong>{variables.tamin}</strong></p><p className="text-sm text-slate-700">NapTAmin = <strong>{variables.naptamin}</strong></p><p className="text-sm text-slate-700">Opor = <strong>{variables.opor}</strong></p></div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Modelo Estocástico</p><p className="text-sm text-slate-700">Básico: <strong>{modeloCalif.vmap1234}</strong> ± {modeloCalif.delta1234}</p><p className="text-sm text-slate-700">Profesional: <strong>{modeloCalif.vmap5678}</strong> ± {modeloCalif.delta5678}</p><p className="text-sm text-slate-700">Titulación: <strong>{modeloCalif.vmapm}</strong> ± {modeloCalif.deltam}</p></div>
        </div>
      </details>

      <div className="flex justify-between pt-4 border-t border-slate-200 shrink-0 mb-4">
        <button onClick={() => setWizardStep(4)} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"><ArrowLeft size={18} /> Modificar Parámetros</button>
        <button onClick={handleRunSimulation} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all"><Play size={18} /> Ejecutar de Nuevo</button>
      </div>
    </div>
  );
}
