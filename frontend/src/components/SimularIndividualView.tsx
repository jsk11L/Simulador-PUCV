import { useEffect, useState } from 'react';
import { Activity, Loader2, Play, Target, User } from 'lucide-react';
import useStudentApi, { type MallaCustomOverride } from '../hooks/useStudentApi';
import ScenarioSelector, { type ScenarioSelection } from './ScenarioSelector';
import type {
  IndividualPrediction,
  MallaGuardada,
  StudentHistory,
  StudentProfile,
} from '../types';

interface Props {
  apiUrl: (path: string) => string;
  mallasGuardadas: MallaGuardada[];
}

/**
 * Vista "Simular Alumno": genera un alumno sintético con perfil
 * configurable y proyecta su trayectoria futura aplicando los
 * modificadores δ.
 */
// safeInt parsea un input numérico evitando propagar NaN al state.
const safeInt = (s: string, fallback = 0): number => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
};

export default function SimularIndividualView({ apiUrl, mallasGuardadas }: Props) {
  const api = useStudentApi({ apiUrl });

  const [perfiles, setPerfiles] = useState<StudentProfile[]>([]);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<string>('promedio');
  const [escenario, setEscenario] = useState<string>('caso_actual');
  const [mallaOverride, setMallaOverride] = useState<MallaCustomOverride | null>(null);
  const [seed, setSeed] = useState<number>(42);
  const [untilSemestre, setUntilSemestre] = useState<number>(0);

  const [alumno, setAlumno] = useState<StudentHistory | null>(null);
  const [prediccion, setPrediccion] = useState<IndividualPrediction | null>(null);

  const [loadingGen, setLoadingGen] = useState(false);
  const [loadingProj, setLoadingProj] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    api.fetchPerfiles().then(setPerfiles).catch((err) => {
      console.error('No se pudieron cargar perfiles:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectScenario = (s: ScenarioSelection) => {
    setEscenario(s.value);
    setMallaOverride(s.override ?? null);
  };

  const handleGenerar = async () => {
    setError('');
    setPrediccion(null);
    setAlumno(null); // limpiar alumno previo para evitar render con datos mezclados
    setLoadingGen(true);
    try {
      const result = await api.generarAlumno({
        profile: perfilSeleccionado,
        scenario: mallaOverride ? undefined : escenario,
        ...(mallaOverride ?? {}),
        seed,
        until_semestre: untilSemestre,
        count: 1,
      });
      // count=1 retorna StudentHistory directo. Normalizar semestres a []
      // por si el backend devolvió null (defensa adicional).
      const normalizado = result as StudentHistory;
      setAlumno({
        ...normalizado,
        semestres: normalizado.semestres ?? [],
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingGen(false);
    }
  };

  const handleProyectar = async () => {
    if (!alumno) return;
    setError('');
    setPrediccion(null); // limpiar antes para evitar render parcial
    setLoadingProj(true);
    try {
      const pred = await api.simularIndividual({
        history: alumno,
        scenario: mallaOverride ? undefined : escenario,
        ...(mallaOverride ?? {}),
        iteraciones: 500,
        seed: seed + 1,
      });
      // Normalizar arrays a [] por defensa.
      setPrediccion({
        ...pred,
        probabilidades_por_ramo: pred.probabilidades_por_ramo ?? [],
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingProj(false);
    }
  };

  const perfilActual = perfiles.find((p) => p.nombre === perfilSeleccionado);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
          <User size={28} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Simular Alumno Individual</h2>
            <p className="text-sm text-slate-500">
              Genera un alumno sintético con un perfil dado y proyecta su trayectoria futura
              aplicando los modificadores δ basados en historial.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ============================= */}
        {/* FORM DE GENERACIÓN            */}
        {/* ============================= */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-blue-500" />
            Configuración del Alumno
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Perfil</label>
              <select
                value={perfilSeleccionado}
                onChange={(e) => setPerfilSeleccionado(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {perfiles.map((p) => (
                  <option key={p.nombre} value={p.nombre}>
                    {p.nombre.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <ScenarioSelector
              value={escenario}
              onSelect={handleSelectScenario}
              mallasGuardadas={mallasGuardadas}
            />
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Seed</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(safeInt(e.target.value, 0))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Cortar tras N semestres <span className="text-slate-400">(0 = completo)</span>
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={untilSemestre}
                onChange={(e) => setUntilSemestre(Math.max(0, Math.min(30, safeInt(e.target.value, 0))))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {perfilActual && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs font-mono text-slate-600 flex gap-4 flex-wrap">
              <span>esfuerzo: <strong className="text-slate-900">{perfilActual.esfuerzo.toFixed(2)}</strong></span>
              <span>disciplina: <strong className="text-slate-900">{perfilActual.disciplina.toFixed(2)}</strong></span>
              <span>tolerancia: <strong className="text-slate-900">{perfilActual.tolerancia.toFixed(2)}</strong></span>
            </div>
          )}

          <button
            onClick={handleGenerar}
            disabled={loadingGen}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
          >
            {loadingGen ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Generar Alumno
          </button>
        </section>

        {/* ============================= */}
        {/* HISTORIAL DEL ALUMNO          */}
        {/* ============================= */}
        {alumno && (
          <section className="mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800">
                  Historial: {alumno.nombre || alumno.rut}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {(alumno.semestres ?? []).length} semestres · estado:{' '}
                  <span className="font-semibold">{alumno.estado || 'activa'}</span>
                </p>
              </div>
              <button
                onClick={handleProyectar}
                disabled={loadingProj}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
              >
                {loadingProj ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
                Proyectar Futuro
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-600">Período</th>
                    <th className="text-left p-2 font-semibold text-slate-600">Sigla</th>
                    <th className="text-left p-2 font-semibold text-slate-600">Cat.</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Cred.</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Nota</th>
                    <th className="text-center p-2 font-semibold text-slate-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(alumno.semestres ?? []).flatMap((sem) =>
                    (sem.cursos ?? []).map((c, idx) => (
                      <tr key={`${sem.periodo}-${c.sigla}-${idx}`} className="border-t border-slate-100">
                        <td className="p-2 text-slate-500">{sem.periodo}</td>
                        <td className="p-2 font-mono font-semibold text-slate-800">{c.sigla}</td>
                        <td className="p-2 text-slate-500">
                          {c.categoria === 'obligatoria' ? '·' : c.categoria}
                        </td>
                        <td className="p-2 text-right text-slate-700">{c.creditos}</td>
                        <td className="p-2 text-right text-slate-700">
                          {c.nota ? c.nota.toFixed(1) : '—'}
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              c.estado === 'aprobado'
                                ? 'bg-emerald-100 text-emerald-700'
                                : c.estado === 'reprobado'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {c.estado}
                          </span>
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ============================= */}
        {/* PROYECCIÓN                    */}
        {/* ============================= */}
        {prediccion && (
          <section className="mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Target size={18} className="text-emerald-600" />
              Proyección Futura ({prediccion.iteraciones} iteraciones)
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <Kpi label="Tasa Titulación" value={`${((prediccion.tasa_titulacion ?? 0) * 100).toFixed(1)}%`} color="emerald" />
              <Kpi label="Eliminado TAmin" value={`${((prediccion.tasa_eliminado_tamin ?? 0) * 100).toFixed(1)}%`} color="amber" />
              <Kpi label="Eliminado Opor" value={`${((prediccion.tasa_eliminado_opor ?? 0) * 100).toFixed(1)}%`} color="red" />
              <Kpi label="Semestres Proy." value={(prediccion.semestres_proyectados ?? 0).toFixed(1)} color="blue" />
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs font-mono text-slate-600 flex flex-wrap gap-x-6 gap-y-1">
              <span>δ_hist: <strong className="text-slate-900">{(prediccion.delta_hist_avg ?? 0).toFixed(4)}</strong></span>
              <span>δ_prereq: <strong className="text-slate-900">{(prediccion.delta_prereq_avg ?? 0).toFixed(4)}</strong></span>
              <span>δ_stress: <strong className="text-slate-900">{(prediccion.delta_stress_avg ?? 0).toFixed(4)}</strong></span>
              <span>ratio histórico: <strong className="text-slate-900">{((prediccion.historial_resumen?.RatioAprobacion ?? 0) * 100).toFixed(1)}%</strong></span>
              <span>carga prom: <strong className="text-slate-900">{(prediccion.historial_resumen?.CargaPromedio ?? 0).toFixed(1)}</strong> cred/sem</span>
            </div>

            <h4 className="text-sm font-bold text-slate-700 mb-2">Ramos pendientes</h4>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-600">Sigla</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Sem.</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Cred.</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Prob. aprobar</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Intentos prom.</th>
                  </tr>
                </thead>
                <tbody>
                  {(prediccion.probabilidades_por_ramo ?? []).map((r) => (
                    <tr key={r.sigla} className="border-t border-slate-100">
                      <td className="p-2 font-mono font-semibold text-slate-800">{r.sigla}</td>
                      <td className="p-2 text-right text-slate-700">{r.semestre_nominal}</td>
                      <td className="p-2 text-right text-slate-700">{r.creditos}</td>
                      <td className="p-2 text-right">
                        <ProbBar value={r.prob_aprobar ?? 0} />
                      </td>
                      <td className="p-2 text-right text-slate-700">{(r.intentos_prom ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClass = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
  }[color] || 'bg-slate-50 border-slate-200';
  return (
    <div className={`border rounded-lg p-3 ${colorClass}`}>
      <div className="text-xs font-semibold opacity-75">{label}</div>
      <div className="text-xl font-black mt-1">{value}</div>
    </div>
  );
}

function ProbBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color =
    pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="inline-flex items-center gap-2 justify-end">
      <span className="text-slate-700 font-semibold tabular-nums">
        {(value * 100).toFixed(1)}%
      </span>
      <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
