import { useEffect, useState } from 'react';
import {
  Activity,
  Dices,
  Download,
  Loader2,
  Play,
  Sparkles,
  Target,
  UserCog,
} from 'lucide-react';
import useStudentApi, { type MallaCustomOverride } from '../hooks/useStudentApi';
import ScenarioSelector, { type ScenarioSelection, buildProgramacion } from './ScenarioSelector';
import KanbanAlumno from './KanbanAlumno';
import FlujoManualAlumno from './FlujoManualAlumno';
import { rutToStudentId } from '../lib/studentId';
import { descargarAlumno } from '../lib/studentDownload';
import type {
  IndividualPrediction,
  MallaGuardada,
  StudentHistory,
  StudentProfile,
} from '../types';

interface Props {
  apiUrl: (path: string) => string;
  mallasGuardadas: MallaGuardada[];
  // En modo portable se ocultan los escenarios del paper — solo mallas
  // guardadas por el usuario.
  standalone?: boolean;
}

type Modo = 'sintetico' | 'manual';

/**
 * Vista "Simular Alumno". Tiene dos flujos:
 *   Sintético: genera un alumno con perfil + parámetros (lo que existía).
 *   Manual:    el usuario construye el historial cargando CSV o
 *              haciendo click en un kanban de la malla.
 *
 * En ambos casos, el output se muestra como Kanban del alumno y se puede
 * proyectar el futuro + descargar como ZIP (JSON + CSV).
 */
const safeInt = (s: string, fallback = 0): number => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
};

/** Genera una seed aleatoria positiva de hasta 9 dígitos. */
const generarSeedAleatoria = (): number =>
  Math.floor(Math.random() * 999_999_999) + 1;

export default function SimularIndividualView({ apiUrl, mallasGuardadas, standalone = false }: Props) {
  const api = useStudentApi({ apiUrl });

  const [modo, setModo] = useState<Modo>('sintetico');

  // Estado compartido entre los dos flujos.
  const [alumno, setAlumno] = useState<StudentHistory | null>(null);
  const [prediccion, setPrediccion] = useState<IndividualPrediction | null>(null);

  // Para proyectar, ambos flujos necesitan saber sobre qué malla.
  const [escenario, setEscenario] = useState<string>('caso_actual');
  const [mallaOverride, setMallaOverride] = useState<MallaCustomOverride | null>(null);
  const [seed, setSeed] = useState<number>(42);

  // Flujo sintético.
  const [perfiles, setPerfiles] = useState<StudentProfile[]>([]);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<string>('promedio');
  const [untilSemestre, setUntilSemestre] = useState<number>(0);

  const [loadingGen, setLoadingGen] = useState(false);
  const [loadingProj, setLoadingProj] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    api.fetchPerfiles().then(setPerfiles).catch((err) => {
      console.error('No se pudieron cargar perfiles:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // En modo portable los escenarios del paper están ocultos; auto-selecciona
  // la primera malla guardada apenas esté disponible (si la actual sigue
  // apuntando a un escenario fijo que el select ya no muestra).
  useEffect(() => {
    if (!standalone || mallasGuardadas.length === 0) return;
    if (escenario.startsWith('__malla__')) return;
    const m = mallasGuardadas[0];
    setEscenario(`__malla__${m.id}`);
    setMallaOverride({
      asignaturas: m.asignaturas,
      programacion: buildProgramacion(m.asignaturas),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standalone, mallasGuardadas]);

  const handleSelectScenario = (s: ScenarioSelection) => {
    setEscenario(s.value);
    setMallaOverride(s.override ?? null);
  };

  const handleGenerar = async () => {
    setError('');
    setPrediccion(null);
    setAlumno(null);
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
    setPrediccion(null);
    setLoadingProj(true);
    try {
      const pred = await api.simularIndividual({
        history: alumno,
        scenario: mallaOverride ? undefined : escenario,
        ...(mallaOverride ?? {}),
        iteraciones: 500,
        seed: seed + 1,
      });
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

  const handleDescargar = async () => {
    if (!alumno) return;
    // Descargamos el alumno COMBINADO (historial + proyección) para que
    // el ZIP refleje exactamente lo que el usuario vio en el kanban.
    const alumnoExport = combinarHistorialYProyeccion(alumno, prediccion);
    await descargarAlumno(alumnoExport, displayId, prediccion);
  };

  // Al cambiar el modo, limpiar resultados anteriores para no mostrar
  // datos del flujo previo mezclados.
  const handleSwitchModo = (next: Modo) => {
    if (next === modo) return;
    setModo(next);
    setAlumno(null);
    setPrediccion(null);
    setError('');
  };

  const perfilActual = perfiles.find((p) => p.nombre === perfilSeleccionado);
  const displayId = alumno ? rutToStudentId(alumno.rut) : '';

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <Header />

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <ModoToggle modo={modo} onChange={handleSwitchModo} />

        {modo === 'sintetico' ? (
          <SinteticoForm
            perfiles={perfiles}
            perfilSeleccionado={perfilSeleccionado}
            setPerfilSeleccionado={setPerfilSeleccionado}
            escenario={escenario}
            onSelectScenario={handleSelectScenario}
            mallasGuardadas={mallasGuardadas}
            seed={seed}
            setSeed={setSeed}
            untilSemestre={untilSemestre}
            setUntilSemestre={setUntilSemestre}
            perfilActual={perfilActual}
            loading={loadingGen}
            onGenerar={handleGenerar}
            standalone={standalone}
          />
        ) : (
          <FlujoManualAlumno
            apiUrl={apiUrl}
            escenario={escenario}
            mallaOverride={mallaOverride}
            mallasGuardadas={mallasGuardadas}
            onSelectScenario={handleSelectScenario}
            standalone={standalone}
            onAlumnoListo={(a) => {
              setAlumno(a);
              setPrediccion(null);
            }}
          />
        )}

        {alumno && (
          <section className="mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div>
                <h3 className="font-bold text-slate-800">
                  Alumno <span className="font-mono text-blue-700">{displayId}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {(alumno.semestres ?? []).length} semestres · estado:{' '}
                  <span className="font-semibold">{alumno.estado || 'activa'}</span>
                  {prediccion?.trayectoria_proyectada && (
                    <>
                      {' · '}
                      <span className="text-violet-700 font-semibold">
                        +{prediccion.trayectoria_proyectada.length} proyectados
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {/* El botón "Descargar ZIP" aparece solo cuando ya se proyectó
                    el futuro — antes no aporta valor descargar solo el historial. */}
                {prediccion && (
                  <button
                    onClick={handleDescargar}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
                  >
                    <Download size={14} /> Descargar ZIP
                  </button>
                )}
                <button
                  onClick={handleProyectar}
                  disabled={loadingProj}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
                >
                  {loadingProj ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
                  {prediccion ? 'Re-proyectar' : 'Proyectar Futuro'}
                </button>
              </div>
            </div>

            <KanbanAlumno
              alumno={combinarHistorialYProyeccion(alumno, prediccion)}
              proyectadoDesdeIdx={
                prediccion ? (alumno.semestres ?? []).length : undefined
              }
            />
          </section>
        )}

        {prediccion && (
          <ProyeccionSection prediccion={prediccion} />
        )}
      </div>
    </div>
  );
}

// ============================================
// Sub-componentes
// ============================================

function Header() {
  return (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
      <UserCog size={28} className="text-blue-600" />
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Simular Alumno Individual</h2>
        <p className="text-sm text-slate-500">
          Genera un alumno sintético o configura uno manualmente y proyecta su
          trayectoria aplicando modificadores δ basados en su historial.
        </p>
      </div>
    </div>
  );
}

function ModoToggle({ modo, onChange }: { modo: Modo; onChange: (m: Modo) => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-1 inline-flex mb-4 shadow-sm">
      <ToggleButton active={modo === 'sintetico'} onClick={() => onChange('sintetico')}>
        <Sparkles size={14} /> Sintético
      </ToggleButton>
      <ToggleButton active={modo === 'manual'} onClick={() => onChange('manual')}>
        <UserCog size={14} /> Manual
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

interface SinteticoFormProps {
  perfiles: StudentProfile[];
  perfilSeleccionado: string;
  setPerfilSeleccionado: (v: string) => void;
  escenario: string;
  onSelectScenario: (s: ScenarioSelection) => void;
  mallasGuardadas: MallaGuardada[];
  seed: number;
  setSeed: (v: number) => void;
  untilSemestre: number;
  setUntilSemestre: (v: number) => void;
  perfilActual: StudentProfile | undefined;
  loading: boolean;
  onGenerar: () => void;
  standalone?: boolean;
}

function SinteticoForm({
  perfiles,
  perfilSeleccionado,
  setPerfilSeleccionado,
  escenario,
  onSelectScenario,
  mallasGuardadas,
  seed,
  setSeed,
  untilSemestre,
  setUntilSemestre,
  perfilActual,
  loading,
  onGenerar,
  standalone = false,
}: SinteticoFormProps) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Activity size={18} className="text-blue-500" />
        Configuración del alumno sintético
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
          onSelect={onSelectScenario}
          mallasGuardadas={mallasGuardadas}
          hideFixedScenarios={standalone}
        />
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Seed</label>
          <div className="flex gap-1">
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(safeInt(e.target.value, 0))}
              className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() => setSeed(generarSeedAleatoria())}
              title="Generar seed aleatoria"
              className="px-2 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all shrink-0"
            >
              <Dices size={16} />
            </button>
          </div>
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
        onClick={onGenerar}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
        Generar Alumno
      </button>
    </section>
  );
}

function ProyeccionSection({ prediccion }: { prediccion: IndividualPrediction }) {
  return (
    <section className="mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Target size={18} className="text-emerald-600" />
        Proyección Futura ({prediccion.iteraciones} iteraciones)
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="Tasa Titulación"
          value={`${((prediccion.tasa_titulacion ?? 0) * 100).toFixed(1)}%`}
          color="emerald"
        />
        <Kpi
          label="Eliminado TAmin"
          value={`${((prediccion.tasa_eliminado_tamin ?? 0) * 100).toFixed(1)}%`}
          color="amber"
        />
        <Kpi
          label="Eliminado Opor"
          value={`${((prediccion.tasa_eliminado_opor ?? 0) * 100).toFixed(1)}%`}
          color="red"
        />
        <Kpi
          label="Semestres Proy."
          value={(prediccion.semestres_proyectados ?? 0).toFixed(1)}
          color="blue"
        />
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
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClass =
    {
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
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
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

/**
 * Devuelve un StudentHistory que combina los semestres del historial
 * conocido con los proyectados por el motor (trayectoria representativa).
 * Si no hay proyección, devuelve el alumno tal cual.
 */
function combinarHistorialYProyeccion(
  alumno: StudentHistory,
  prediccion: IndividualPrediction | null,
): StudentHistory {
  if (!prediccion || !prediccion.trayectoria_proyectada?.length) {
    return alumno;
  }
  return {
    ...alumno,
    semestres: [
      ...(alumno.semestres ?? []),
      ...prediccion.trayectoria_proyectada,
    ],
  };
}
