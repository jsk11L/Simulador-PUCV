import { useEffect, useState } from 'react';
import { Download, Loader2, Play, Users } from 'lucide-react';
import useStudentApi, { type CohorteResponse, type MallaCustomOverride } from '../hooks/useStudentApi';
import ScenarioSelector, { type ScenarioSelection } from './ScenarioSelector';
import type { MallaGuardada, StudentHistory, StudentProfile } from '../types';

interface Props {
  apiUrl: (path: string) => string;
  mallasGuardadas: MallaGuardada[];
}

/**
 * Vista "Generar Cohorte": produce N alumnos sintéticos con un perfil dado
 * y muestra estadísticas agregadas + descarga JSON.
 */
const safeInt = (s: string, fallback = 0): number => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
};

export default function GenerarCohorteView({ apiUrl, mallasGuardadas }: Props) {
  const api = useStudentApi({ apiUrl });

  const [perfiles, setPerfiles] = useState<StudentProfile[]>([]);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<string>('promedio');
  const [escenario, setEscenario] = useState<string>('caso_actual');
  const [mallaOverride, setMallaOverride] = useState<MallaCustomOverride | null>(null);
  const [count, setCount] = useState<number>(50);
  const [seedBase, setSeedBase] = useState<number>(42);

  const [resultado, setResultado] = useState<CohorteResponse | null>(null);
  const [loading, setLoading] = useState(false);
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
    setResultado(null);
    setLoading(true);
    try {
      const response = await api.generarAlumno({
        profile: perfilSeleccionado,
        scenario: mallaOverride ? undefined : escenario,
        ...(mallaOverride ?? {}),
        seed: seedBase,
        count,
      });
      // count > 1 retorna CohorteResponse. Defensa: si por alguna razón
      // el backend devuelve un único StudentHistory, lo envolvemos para
      // que la UI no crashee accediendo a .alumnos.
      const r = response as CohorteResponse;
      setResultado({
        count: r.count ?? count,
        profile: r.profile,
        scenario: r.scenario ?? escenario,
        seed_base: r.seed_base ?? seedBase,
        alumnos: r.alumnos ?? [],
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarJSON = () => {
    if (!resultado) return;
    const blob = new Blob([JSON.stringify(resultado, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cohorte_${perfilSeleccionado}_${escenario}_n${count}_seed${seedBase}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = resultado ? calcularEstadisticas(resultado.alumnos ?? []) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
          <Users size={28} className="text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Generar Cohorte de Alumnos</h2>
            <p className="text-sm text-slate-500">
              Crea N alumnos sintéticos con el mismo perfil y obtiene estadísticas agregadas
              de la cohorte. Útil para análisis poblacional.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Configuración</h3>
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
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Cantidad <span className="text-slate-400">(máx 1000)</span>
              </label>
              <input
                type="number"
                min={2}
                max={1000}
                value={count}
                onChange={(e) => setCount(Math.max(2, Math.min(1000, safeInt(e.target.value, 2))))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Seed base</label>
              <input
                type="number"
                value={seedBase}
                onChange={(e) => setSeedBase(safeInt(e.target.value, 0))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleGenerar}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Generar Cohorte
          </button>
        </section>

        {stats && resultado && (
          <section className="mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">
                Resultados ({resultado.count} alumnos)
              </h3>
              <button
                onClick={handleDescargarJSON}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2"
              >
                <Download size={14} /> Descargar JSON
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <Kpi label="Titulados" value={`${(stats.titulados * 100 / resultado.count).toFixed(1)}%`} count={stats.titulados} color="emerald" />
              <Kpi label="Eliminado TAmin" value={`${(stats.elimTA * 100 / resultado.count).toFixed(1)}%`} count={stats.elimTA} color="amber" />
              <Kpi label="Eliminado Opor" value={`${(stats.elimOpor * 100 / resultado.count).toFixed(1)}%`} count={stats.elimOpor} color="red" />
              <Kpi label="Sin cerrar (activos)" value={`${(stats.activos * 100 / resultado.count).toFixed(1)}%`} count={stats.activos} color="blue" />
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm text-slate-700">
              <p>
                <strong>Promedio de semestres cursados:</strong>{' '}
                {stats.promSemestres.toFixed(2)}
              </p>
              <p>
                <strong>Promedio de créditos aprobados:</strong>{' '}
                {stats.promCreditos.toFixed(1)} / 222
              </p>
              <p>
                <strong>Promedio de notas finales:</strong>{' '}
                {stats.promNota.toFixed(2)}
              </p>
            </div>

            <h4 className="text-sm font-bold text-slate-700 mb-2">
              Distribución de estados por alumno (primeros 100)
            </h4>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-600">RUT</th>
                    <th className="text-left p-2 font-semibold text-slate-600">Estado</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Sem.</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Aprob.</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Reprob.</th>
                  </tr>
                </thead>
                <tbody>
                  {(resultado.alumnos ?? []).slice(0, 100).map((a) => {
                    const stats = statsAlumno(a);
                    return (
                      <tr key={a.rut} className="border-t border-slate-100">
                        <td className="p-2 font-mono text-slate-800">{a.rut}</td>
                        <td className="p-2">
                          <EstadoBadge estado={a.estado || 'desconocido'} />
                        </td>
                        <td className="p-2 text-right text-slate-700">{a.semestres.length}</td>
                        <td className="p-2 text-right text-slate-700">{stats.aprob}</td>
                        <td className="p-2 text-right text-slate-700">{stats.reprob}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(resultado.alumnos ?? []).length > 100 && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Mostrando 100 de {(resultado.alumnos ?? []).length}. Descarga el JSON para el set completo.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function calcularEstadisticas(alumnos: StudentHistory[]) {
  let titulados = 0;
  let elimTA = 0;
  let elimOpor = 0;
  let activos = 0;
  let totalSemestres = 0;
  let totalCreditos = 0;
  let totalNota = 0;
  let cantNotas = 0;

  for (const a of alumnos ?? []) {
    switch (a.estado) {
      case 'titulado': titulados++; break;
      case 'eliminado_tamin': elimTA++; break;
      case 'eliminado_opor': elimOpor++; break;
      default: activos++;
    }
    const sems = a.semestres ?? [];
    totalSemestres += sems.length;
    for (const sem of sems) {
      for (const c of sem.cursos ?? []) {
        if (c.estado === 'aprobado') totalCreditos += c.creditos;
        if (c.nota && c.nota > 0) {
          totalNota += c.nota;
          cantNotas++;
        }
      }
    }
  }

  const n = alumnos.length || 1;
  return {
    titulados,
    elimTA,
    elimOpor,
    activos,
    promSemestres: totalSemestres / n,
    promCreditos: totalCreditos / n,
    promNota: cantNotas > 0 ? totalNota / cantNotas : 0,
  };
}

function statsAlumno(h: StudentHistory) {
  let aprob = 0;
  let reprob = 0;
  for (const sem of h.semestres ?? []) {
    for (const c of sem.cursos ?? []) {
      if (c.estado === 'aprobado') aprob++;
      else if (c.estado === 'reprobado') reprob++;
    }
  }
  return { aprob, reprob };
}

function Kpi({ label, value, count, color }: { label: string; value: string; count: number; color: string }) {
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
      <div className="text-xs opacity-60 mt-1">{count} alumnos</div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const cls = {
    titulado: 'bg-emerald-100 text-emerald-700',
    eliminado_tamin: 'bg-amber-100 text-amber-700',
    eliminado_opor: 'bg-red-100 text-red-700',
    activa: 'bg-blue-100 text-blue-700',
  }[estado] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {estado}
    </span>
  );
}
