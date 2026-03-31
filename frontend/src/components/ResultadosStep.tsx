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
  const heatmap = simResults.heatmap_estado_semestre || [];
  const transiciones = simResults.transiciones_estado || [];
  const sensibilidad = simResults.sensibilidad_tornado || [];
  const semKeys = Object.keys(dist).map(Number).sort((a, b) => a - b);
  const maxCount = semKeys.length > 0 ? Math.max(...semKeys.map(k => dist[k])) : 1;
  const totalAlumnos = m.alumnos_simulados || 1;
  const maxTransicion = transiciones.length > 0 ? Math.max(...transiciones.map((t) => t.value)) : 1;
  const tasaFalloPorSigla = new Map(ramos.map((r) => [r.sigla, r.tasa_fallo_pct]));

  const colorPorTasaFallo = (rate?: number) => {
    if (typeof rate !== 'number' || Number.isNaN(rate)) {
      return {
        bg: 'hsl(215, 22%, 92%)',
        border: 'hsl(215, 18%, 78%)',
        text: '#334155',
      };
    }

    // 1-color-step per integer percentage point.
    const step = Math.max(0, Math.min(100, Math.round(rate)));

    if (step <= 50) {
      const hue = 120 - (step / 50) * 114; // 0% -> green, 50% -> near orange-red
      const light = 92 - step * 0.36;
      return {
        bg: `hsl(${hue}, 82%, ${light}%)`,
        border: `hsl(${hue}, 74%, ${Math.max(light - 18, 30)}%)`,
        text: '#0f172a',
      };
    }

    // From 51% onward, force red family.
    const light = Math.max(42, 70 - (step - 51) * 0.45);
    return {
      bg: `hsl(0, 84%, ${light}%)`,
      border: `hsl(0, 72%, ${Math.max(light - 12, 28)}%)`,
      text: light < 56 ? '#ffffff' : '#7f1d1d',
    };
  };

  const lastSem = semKeys.length > 0 ? semKeys[semKeys.length - 1] : Math.max(totalSemestres, 1);

  const heatmapData = heatmap.length > 0
    ? heatmap
    : Array.from({ length: lastSem }).map((_, idx) => {
        const sem = idx + 1;
        const tituladosAcum = semKeys
          .filter((k) => k <= sem)
          .reduce((acc, k) => acc + (dist[k] || 0), 0);

        const elimTaAcum = Math.round((m.eliminados_tamin * sem) / lastSem);
        const elimOporAcum = Math.round((m.eliminados_opor * sem) / lastSem);
        const activos = Math.max(0, totalAlumnos - tituladosAcum - elimTaAcum - elimOporAcum);

        return {
          semestre: sem,
          activos,
          titulados: tituladosAcum,
          eliminados_ta: elimTaAcum,
          eliminados_opor: elimOporAcum,
        };
      });

  let acumuladoTitulados = 0;
  const cdfData = semKeys.map((sem) => {
    acumuladoTitulados += dist[sem] || 0;
    const cdfPct = (acumuladoTitulados / totalAlumnos) * 100;
    const supervivenciaPct = Math.max(0, 100 - cdfPct);
    return { sem, cdfPct, supervivenciaPct };
  });

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
      <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 shrink-0 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
              <BarChart3 size={22} className="text-green-600" />
            </div>
            Resultados de la Simulación
          </h2>
          <p className="text-slate-500 mt-1 ml-0 sm:ml-13 text-sm">{m.alumnos_simulados} estudiantes simulados · Motor Montecarlo</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5 shrink-0">
        <div className={`rounded-xl border p-4 ${kpiBg(m.tasa_titulacion_pct, [30, 50])}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tasa de Titulación (PPE)</p>
          <p className={`text-2xl font-black ${kpiColor(m.tasa_titulacion_pct, [30, 50])}`}>{m.tasa_titulacion_pct}%</p>
          <p className="text-xs text-slate-500 mt-1">{m.titulados} de {m.alumnos_simulados} egresaron</p>
        </div>
        <div className="rounded-xl border bg-slate-50 border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Semestres Promedio (PSCE)</p>
          <p className="text-2xl font-black text-slate-800">{m.semestres_promedio}</p>
          <p className="text-xs text-slate-500 mt-1">Semestres para titularse</p>
        </div>
        <div className={`rounded-xl border p-4 ${m.eficiencia_egreso <= 1.3 ? 'bg-green-50 border-green-200' : m.eficiencia_egreso <= 1.6 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Eficiencia de Egreso (EE)</p>
          <p className={`text-2xl font-black ${m.eficiencia_egreso <= 1.3 ? 'text-green-600' : m.eficiencia_egreso <= 1.6 ? 'text-amber-600' : 'text-red-600'}`}>{m.eficiencia_egreso}</p>
          <p className="text-xs text-slate-500 mt-1">{m.eficiencia_egreso <= 1.0 ? 'Ideal' : `${((m.eficiencia_egreso - 1) * 100).toFixed(0)}% sobre el tiempo teórico`}</p>
        </div>
        <div className={`rounded-xl border p-4 ${kpiBg(m.egreso_oportuno_pct, [5, 20])}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Egreso Oportuno (PEO)</p>
          <p className={`text-2xl font-black ${kpiColor(m.egreso_oportuno_pct, [5, 20])}`}>{m.egreso_oportuno_pct}%</p>
          <p className="text-xs text-slate-500 mt-1">Se titularon dentro del plazo</p>
        </div>
        <div className={`rounded-xl border p-4 ${kpiBg(m.retencion_1er_anio_pct, [70, 85])}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Retención 1er Año</p>
          <p className={`text-2xl font-black ${kpiColor(m.retencion_1er_anio_pct, [70, 85])}`}>{m.retencion_1er_anio_pct}%</p>
          <p className="text-xs text-slate-500 mt-1">Sobreviven al 1er año</p>
        </div>
        <div className={`rounded-xl border p-4 ${kpiBg(m.retencion_3er_anio_pct, [50, 70])}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Retención 3er Año</p>
          <p className={`text-2xl font-black ${kpiColor(m.retencion_3er_anio_pct, [50, 70])}`}>{m.retencion_3er_anio_pct}%</p>
          <p className="text-xs text-slate-500 mt-1">Sobreviven al 3er año</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 shrink-0">
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
        <div id="chart-distribucion" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5 shrink-0">
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><BarChart size={20} className="text-blue-500" />Distribución de Semestres de Titulación</h3>
          <p className="text-xs text-slate-500 mb-5">Cantidad de estudiantes que se titularon en cada semestre</p>
          <div className="flex items-end gap-1.5" style={{ height: '170px' }}>
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

      {cdfData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5 shrink-0">
          <div id="chart-supervivencia" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Supervivencia Académica</h3>
            <p className="text-xs text-slate-500 mb-4">Proporción de estudiantes que todavía no se ha titulado por semestre.</p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cdfData.map((punto) => (
                <div key={`surv-${punto.sem}`} className="grid grid-cols-[42px_1fr_48px] items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">S{punto.sem}</span>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.min(100, Math.max(0, punto.supervivenciaPct))}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 text-right">{punto.supervivenciaPct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div id="chart-cdf" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-lg font-bold text-slate-800 mb-1">CDF de Titulación</h3>
            <p className="text-xs text-slate-500 mb-4">Probabilidad acumulada de haberse titulado hasta cada semestre.</p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cdfData.map((punto) => (
                <div key={`cdf-${punto.sem}`} className="grid grid-cols-[42px_1fr_48px] items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">S{punto.sem}</span>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, Math.max(0, punto.cdfPct))}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 text-right">{punto.cdfPct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {heatmapData.length > 0 && (
        <div id="chart-heatmap-estado" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5 shrink-0">
          <h3 className="text-lg font-bold text-slate-800 mb-1">Heatmap Estado-Semestre</h3>
          <p className="text-xs text-slate-500 mb-4">Mapa de intensidad por estado y semestre.{heatmap.length === 0 ? ' (estimado para resultados historicos)' : ''}</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase text-slate-500">Sem</th>
                  <th className="text-center px-3 py-2 text-xs font-bold uppercase text-slate-500">Activo</th>
                  <th className="text-center px-3 py-2 text-xs font-bold uppercase text-slate-500">Titulado</th>
                  <th className="text-center px-3 py-2 text-xs font-bold uppercase text-slate-500">Elim TA</th>
                  <th className="text-center px-3 py-2 text-xs font-bold uppercase text-slate-500">Elim Opor</th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((fila) => {
                  const aPct = (fila.activos / totalAlumnos) * 100;
                  const tPct = (fila.titulados / totalAlumnos) * 100;
                  const taPct = (fila.eliminados_ta / totalAlumnos) * 100;
                  const oPct = (fila.eliminados_opor / totalAlumnos) * 100;
                  return (
                    <tr key={`hm-${fila.semestre}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-bold text-slate-700">S{fila.semestre}</td>
                      <td className="px-3 py-2 text-center" style={{ backgroundColor: `rgba(59,130,246,${Math.max(0.1, aPct / 100)})` }}>{fila.activos}</td>
                      <td className="px-3 py-2 text-center" style={{ backgroundColor: `rgba(34,197,94,${Math.max(0.1, tPct / 100)})` }}>{fila.titulados}</td>
                      <td className="px-3 py-2 text-center" style={{ backgroundColor: `rgba(245,158,11,${Math.max(0.1, taPct / 100)})` }}>{fila.eliminados_ta}</td>
                      <td className="px-3 py-2 text-center" style={{ backgroundColor: `rgba(239,68,68,${Math.max(0.1, oPct / 100)})` }}>{fila.eliminados_opor}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div id="chart-heatmap-asignaturas" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5 shrink-0">
        <h3 className="text-lg font-bold text-slate-800 mb-1">Heatmap de Asignaturas (estilo Kanban)</h3>
        <p className="text-xs text-slate-500 mb-4">Misma vista de malla, coloreada por tasa de fallo simulada por asignatura.</p>
        <div className="flex flex-wrap gap-3 pb-2">
          {Array.from({ length: totalSemestres }).map((_, i) => {
            const sem = i + 1;
            const ramosDelSem = malla.filter((a) => a.semestre === sem);
            return (
              <div key={`hk-${sem}`} className="min-w-56 max-w-56 bg-slate-100 border border-slate-200 rounded-xl p-3 shrink-0">
                <h4 className="text-center font-bold text-slate-600 mb-3 text-xs uppercase tracking-wider">Semestre {sem}</h4>
                <div className="space-y-2">
                  {ramosDelSem.length === 0 && <div className="text-xs text-slate-400 italic">Sin asignaturas</div>}
                  {ramosDelSem.map((asig) => {
                    const tasa = tasaFalloPorSigla.get(asig.id);
                    const palette = colorPorTasaFallo(tasa);

                    return (
                      <div key={`hk-${sem}-${asig.id}`} className="rounded-lg border p-2" style={{ backgroundColor: palette.bg, borderColor: palette.border }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold" style={{ color: palette.text }}>{asig.id}</span>
                          <span className="text-[11px] font-bold" style={{ color: palette.text }}>{typeof tasa === 'number' ? `${Math.round(tasa)}%` : 's/d'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div id="chart-sankey" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5 shrink-0">
        <h3 className="text-lg font-bold text-slate-800 mb-1">Sankey de Transiciones (vista compacta)</h3>
        <p className="text-xs text-slate-500 mb-4">Muestra como se mueven los estudiantes entre estados (Activo, Titulado, Eliminado) semestre a semestre.</p>
        {transiciones.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {transiciones
              .filter((t) => t.value > 0)
              .sort((a, b) => b.value - a.value)
              .slice(0, 30)
              .map((t, idx) => {
                const widthPct = (t.value / maxTransicion) * 100;
                return (
                  <div key={`tr-${t.semestre}-${t.from}-${t.to}-${idx}`} className="grid grid-cols-[72px_130px_1fr_44px] items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">S{t.semestre}</span>
                    <span className="text-[11px] text-slate-700 truncate">{t.from} → {t.to}</span>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${t.to === 'Titulado' ? 'bg-green-500' : t.to === 'Activo' ? 'bg-blue-500' : t.to === 'EliminadoTAmin' ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.max(3, widthPct)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-right">{t.value}</span>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Este grafico aun no tiene datos en este resultado. Ejecuta una nueva simulacion para generar transiciones.
          </div>
        )}
      </div>

      <div id="chart-tornado" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5 shrink-0">
        <h3 className="text-lg font-bold text-slate-800 mb-1">Tornado de Sensibilidad (PPE)</h3>
        <p className="text-xs text-slate-500 mb-4">Compara cuanto cambia la tasa de titulacion al mover cada parametro en -10% y +10%.</p>
        {sensibilidad.length > 0 ? (
          <>
            <div className="space-y-3">
              {sensibilidad.slice(0, 10).map((s) => {
                const leftDelta = s.base - s.menos_10;
                const rightDelta = s.mas_10 - s.base;
                const maxDelta = Math.max(Math.abs(leftDelta), Math.abs(rightDelta), 0.01);
                const leftWidth = (Math.abs(leftDelta) / maxDelta) * 100;
                const rightWidth = (Math.abs(rightDelta) / maxDelta) * 100;
                return (
                  <div key={s.parametro} className="grid grid-cols-[110px_1fr_1fr_90px] items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{s.parametro}</span>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden justify-self-end w-full">
                      <div className="h-full bg-amber-500 rounded-full ml-auto" style={{ width: `${Math.max(4, leftWidth)}%` }} />
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max(4, rightWidth)}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 text-right">{s.impacto.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-[11px] text-slate-500 flex gap-4">
              <span><span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-1" />-10%</span>
              <span><span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1" />+10%</span>
              <span>Impacto = max(|Δ-10|, |Δ+10|)</span>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Este grafico aun no tiene datos en este resultado. Ejecuta una nueva simulacion para generar sensibilidad.
          </div>
        )}
      </div>

      {ramos.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5 shrink-0">
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

      <details className="bg-white rounded-xl border border-slate-200 shadow-sm mb-5 shrink-0 group">
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

      <div className="flex justify-between pt-3 border-t border-slate-200 shrink-0 mb-4">
        <button onClick={() => setWizardStep(4)} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"><ArrowLeft size={18} /> Modificar Parámetros</button>
        <button onClick={handleRunSimulation} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all"><Play size={18} /> Ejecutar de Nuevo</button>
      </div>
      </div>
    </div>
  );
}
