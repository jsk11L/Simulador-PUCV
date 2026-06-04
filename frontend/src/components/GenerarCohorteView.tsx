import { useEffect, useMemo, useState } from 'react';
import {
  Dices,
  Download,
  Eye,
  FileUp,
  Loader2,
  Play,
  Sparkles,
  Target,
  Upload,
  Users,
  X,
} from 'lucide-react';
import useStudentApi, { type CohorteResponse, type MallaCustomOverride } from '../hooks/useStudentApi';
import ScenarioSelector, { type ScenarioSelection, buildProgramacion } from './ScenarioSelector';
import KanbanAlumno from './KanbanAlumno';
import FlujoManualAlumno from './FlujoManualAlumno';
import { indexToStudentId } from '../lib/studentId';
import { descargarAlumno, descargarCohorte } from '../lib/studentDownload';
import HelpTip from './HelpTip';
import type {
  IndividualPrediction,
  MallaGuardada,
  StudentHistory,
  StudentProfile,
} from '../types';

interface Props {
  apiUrl: (path: string) => string;
  mallasGuardadas: MallaGuardada[];
  standalone?: boolean;
}

type Modo = 'sintetico' | 'manual';

const safeInt = (s: string, fallback = 0): number => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
};

const generarSeedAleatoria = (): number =>
  Math.floor(Math.random() * 999_999_999) + 1;

/**
 * Vista "Generar Cohorte". Dos flujos:
 *   Sintético: crea N alumnos sintéticos con perfil + parámetros.
 *   Manual: subir ZIP/CSV con alumnos reales (placeholder hasta que
 *     se integre la API/CSV PUCV).
 *
 * Cada alumno se identifica con un ID anónimo (A001, A002, ...) en lugar
 * de su RUT/nombre. Tabla por alumno con "Ver detalle" (lazy: solo carga
 * el kanban al hacer click) y descarga individual.
 */
export default function GenerarCohorteView({ apiUrl, mallasGuardadas, standalone = false }: Props) {
  const api = useStudentApi({ apiUrl });

  const [modo, setModo] = useState<Modo>('sintetico');

  const [perfiles, setPerfiles] = useState<StudentProfile[]>([]);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<string>('promedio');
  // En portable arrancamos sin escenario para evitar pedir uno del paper
  // que el select ya no expone.
  const [escenario, setEscenario] = useState<string>(() => (standalone ? '' : 'caso_actual'));
  const [mallaOverride, setMallaOverride] = useState<MallaCustomOverride | null>(null);
  const [count, setCount] = useState<number>(50);
  const [seedBase, setSeedBase] = useState<number>(() => generarSeedAleatoria());

  const [resultado, setResultado] = useState<CohorteResponse | null>(null);
  const [detalleAlumno, setDetalleAlumno] = useState<StudentHistory | null>(null);
  const [detalleAlumnoId, setDetalleAlumnoId] = useState<string>('');

  // Modo preciso global: 5000 iteraciones por alumno cuando se proyecta
  // la cohorte. Default 500 (rápido). Aplica a TODA la cohorte, no por
  // alumno individual.
  const [modoPreciso, setModoPreciso] = useState<boolean>(false);
  // Predicciones por displayId. Se llenan después de generar la cohorte,
  // proyectando alumno por alumno. El modal "Ver" las muestra sin
  // re-proyectar; la tabla agrega % titulado/eliminado por alumno.
  const [prediccionesPorAlumno, setPrediccionesPorAlumno] = useState<Record<string, IndividualPrediction>>({});
  const [loadingProj, setLoadingProj] = useState(false);
  const [progresoProj, setProgresoProj] = useState<{ hecho: number; total: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    api.fetchPerfiles().then(setPerfiles).catch((err) => {
      console.error('No se pudieron cargar perfiles:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // En modo portable los escenarios fijos del paper no están disponibles —
  // auto-selecciona la primera malla guardada.
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

  // Proyecta cada alumno individualmente con `iteraciones` y guarda la
  // predicción en `prediccionesPorAlumno` indexada por displayId.
  // Concurrencia limitada a 4 simultáneos para no saturar el motor.
  const proyectarCohorte = async (alumnos: StudentHistory[], iteraciones: number) => {
    setLoadingProj(true);
    setProgresoProj({ hecho: 0, total: alumnos.length });
    const acumulado: Record<string, IndividualPrediction> = {};
    const concurrencia = 4;
    let cursor = 0;
    let hechos = 0;
    const worker = async () => {
      while (true) {
        const i = cursor++;
        if (i >= alumnos.length) return;
        const a = alumnos[i];
        const id = indexToStudentId(i);
        try {
          const pred = await api.simularIndividual({
            history: a,
            scenario: mallaOverride ? undefined : escenario,
            ...(mallaOverride ?? {}),
            iteraciones,
            seed: seedBase + i + 1,
          });
          acumulado[id] = {
            ...pred,
            probabilidades_por_ramo: pred.probabilidades_por_ramo ?? [],
          };
        } catch {
          // Si un alumno falla, seguimos con los demás — el modal mostrará
          // "sin proyección" para ese.
        }
        hechos++;
        setProgresoProj({ hecho: hechos, total: alumnos.length });
      }
    };
    await Promise.all(Array.from({ length: concurrencia }, () => worker()));
    setPrediccionesPorAlumno(acumulado);
    setLoadingProj(false);
    setProgresoProj(null);
  };

  const handleGenerar = async () => {
    setError('');
    setResultado(null);
    setDetalleAlumno(null);
    setPrediccionesPorAlumno({});
    setLoading(true);
    try {
      const response = await api.generarAlumno({
        profile: perfilSeleccionado,
        scenario: mallaOverride ? undefined : escenario,
        ...(mallaOverride ?? {}),
        seed: seedBase,
        count,
      });
      const r = response as CohorteResponse;
      const alumnos = r.alumnos ?? [];
      setResultado({
        count: r.count ?? count,
        profile: r.profile,
        scenario: r.scenario ?? escenario,
        seed_base: r.seed_base ?? seedBase,
        alumnos,
      });
      setLoading(false);
      // Después de tener la cohorte, proyectamos cada alumno con la
      // configuración global (modoPreciso) para llenar la tabla con %.
      await proyectarCohorte(alumnos, modoPreciso ? 5000 : 500);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  // Alumnos con ID anónimo asignado.
  const alumnosConId = useMemo(() => {
    if (!resultado) return [];
    return (resultado.alumnos ?? []).map((a, idx) => ({
      ...a,
      displayId: indexToStudentId(idx),
    }));
  }, [resultado]);

  const stats = useMemo(
    () => (alumnosConId.length > 0 ? calcularEstadisticas(alumnosConId) : null),
    [alumnosConId],
  );

  // Mapa sigla → prerequisitos para las flechas naranjas del kanban del
  // modal de detalle. null con escenarios fijos del paper (sin override).
  const reqsPorSigla = useMemo(() => {
    const asigs = mallaOverride?.asignaturas;
    if (!asigs || asigs.length === 0) return null;
    return new Map(asigs.map((a) => [a.id, a.reqs ?? []]));
  }, [mallaOverride]);

  const handleVerDetalle = (idx: number) => {
    const a = alumnosConId[idx];
    setDetalleAlumno(a);
    setDetalleAlumnoId(a.displayId);
  };

  const handleDescargarAlumno = async (idx: number) => {
    const a = alumnosConId[idx];
    await descargarAlumno(a, a.displayId);
  };

  const handleDescargarTodo = async () => {
    if (!resultado || alumnosConId.length === 0) return;
    const filename = `cohorte_${perfilSeleccionado}_${escenario}_n${alumnosConId.length}_seed${seedBase}`;
    await descargarCohorte(alumnosConId, filename);
  };

  const handleSwitchModo = (next: Modo) => {
    if (next === modo) return;
    setModo(next);
    setResultado(null);
    setDetalleAlumno(null);
    setError('');
  };

  // Portable sin mallas guardadas: el generador no tiene escenario para
  // operar. Empty state amigable en lugar del form.
  if (standalone && mallasGuardadas.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-4 sm:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <Users size={28} className="text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Generar Cohorte de Alumnos</h2>
            </div>
          </div>
          <section className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
            <Sparkles size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="font-bold text-slate-800 text-lg mb-2">Aún no tiene mallas guardadas</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Para generar cohortes en la versión portable necesita al menos una malla guardada.
              Vaya a Nueva Simulación, configure su malla y guárdela. Después podrá volver aquí
              para generar cohortes sobre ella.
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
          <Users size={28} className="text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Generar Cohorte de Alumnos</h2>
            <p className="text-sm text-slate-500">
              Genera N alumnos sintéticos o carga un lote real desde CSV.
              Cada alumno recibe un ID anónimo (A001, A002, ...) — no se
              registran nombres ni RUTs reales en la UI.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <ModoToggle modo={modo} onChange={handleSwitchModo} />

        <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 shadow-sm flex items-center gap-2">
          <input
            id="cohorte-modo-preciso"
            type="checkbox"
            checked={modoPreciso}
            onChange={(e) => setModoPreciso(e.target.checked)}
            className="rounded border-slate-300"
          />
          <label htmlFor="cohorte-modo-preciso" className="text-sm text-slate-700 cursor-pointer flex items-center gap-1.5">
            <span className="font-semibold">Modo preciso</span>
            <span className="text-slate-500"> — 5000 iteraciones por alumno en lugar de 500 (más lento, % por estado más estable).</span>
            <HelpTip side="bottom" text="Cada alumno se proyecta muchas veces (Montecarlo) y se promedian los resultados. Más iteraciones = porcentajes de titulación/eliminación más estables y confiables, pero tarda ~10x más. Úselo para resultados finales, no para explorar." />
          </label>
        </div>

        {modo === 'sintetico' ? (
          <SinteticoForm
            perfiles={perfiles}
            perfilSeleccionado={perfilSeleccionado}
            setPerfilSeleccionado={setPerfilSeleccionado}
            escenario={escenario}
            onSelectScenario={handleSelectScenario}
            mallasGuardadas={mallasGuardadas}
            count={count}
            setCount={setCount}
            seedBase={seedBase}
            setSeedBase={setSeedBase}
            loading={loading}
            onGenerar={handleGenerar}
            standalone={standalone}
          />
        ) : (
          <CohorteManualBuilder
            apiUrl={apiUrl}
            escenario={escenario}
            mallaOverride={mallaOverride}
            mallasGuardadas={mallasGuardadas}
            onSelectScenario={handleSelectScenario}
            standalone={standalone}
            onCohorteCompleta={async (alumnos) => {
              // Empaqueta como un CohorteResponse "manual" reutilizando el
              // mismo render de resultados sintéticos.
              setPrediccionesPorAlumno({});
              setResultado({
                count: alumnos.length,
                profile: {
                  nombre: 'manual',
                  esfuerzo: 0,
                  disciplina: 0,
                  tolerancia: 0,
                },
                scenario: escenario,
                seed_base: 0,
                alumnos,
              });
              // Proyectar también las cohortes manuales para que la tabla
              // muestre % de cada estado en vez de los datos crudos del
              // historial ingresado.
              await proyectarCohorte(alumnos, modoPreciso ? 5000 : 500);
            }}
          />
        )}

        {loadingProj && progresoProj && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 flex items-center gap-3">
            <Loader2 size={18} className="animate-spin shrink-0" />
            <div className="flex-1">
              <div className="font-semibold">Proyectando cohorte… {progresoProj.hecho}/{progresoProj.total} alumnos</div>
              <div className="w-full h-1.5 bg-blue-100 rounded mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${(progresoProj.hecho / Math.max(1, progresoProj.total)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {stats && resultado && alumnosConId.length > 0 && (
          <ResultadosSection
            stats={stats}
            count={resultado.count}
            alumnos={alumnosConId}
            predicciones={prediccionesPorAlumno}
            onVerDetalle={handleVerDetalle}
            onDescargarAlumno={handleDescargarAlumno}
            onDescargarTodo={handleDescargarTodo}
          />
        )}
      </div>

      {detalleAlumno && (
        <DetalleAlumnoModal
          alumno={detalleAlumno}
          displayId={detalleAlumnoId}
          prediccion={prediccionesPorAlumno[detalleAlumnoId] ?? null}
          reqsPorSigla={reqsPorSigla}
          onClose={() => setDetalleAlumno(null)}
        />
      )}
    </div>
  );
}

// ============================================
// Sub-componentes
// ============================================

function ModoToggle({ modo, onChange }: { modo: Modo; onChange: (m: Modo) => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-1 inline-flex mb-4 shadow-sm">
      <ToggleButton active={modo === 'sintetico'} onClick={() => onChange('sintetico')}>
        <Sparkles size={14} /> Sintético
      </ToggleButton>
      <ToggleButton active={modo === 'manual'} onClick={() => onChange('manual')}>
        <Upload size={14} /> Manual
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
          ? 'bg-purple-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ============================================
// CohorteManualBuilder
// ============================================
// Permite construir una cohorte alumno por alumno usando el kanban
// interactivo de FlujoManualAlumno. Cada alumno aceptado se acumula en
// una lista. Cuando el usuario presiona "Usar cohorte", se notifica
// al padre para renderizar resultados.

interface CohorteManualBuilderProps {
  apiUrl: (path: string) => string;
  escenario: string;
  mallaOverride: MallaCustomOverride | null;
  mallasGuardadas: MallaGuardada[];
  onSelectScenario: (s: ScenarioSelection) => void;
  onCohorteCompleta: (alumnos: StudentHistory[]) => void;
  standalone?: boolean;
}

function CohorteManualBuilder({
  apiUrl,
  escenario,
  mallaOverride,
  mallasGuardadas,
  onSelectScenario,
  onCohorteCompleta,
  standalone = false,
}: CohorteManualBuilderProps) {
  const [alumnos, setAlumnos] = useState<StudentHistory[]>([]);
  // `key` que se incrementa para forzar remount del FlujoManualAlumno y
  // resetear su estado interno cuando agregamos el alumno actual.
  const [resetKey, setResetKey] = useState(0);
  const [archivoPlaceholder, setArchivoPlaceholder] = useState(false);

  const handleAplicarAlumno = (a: StudentHistory) => {
    const nuevoId = indexToStudentId(alumnos.length);
    const conId: StudentHistory = { ...a, rut: nuevoId };
    setAlumnos([...alumnos, conId]);
    setResetKey((k) => k + 1);
  };

  const handleQuitar = (idx: number) => {
    setAlumnos(alumnos.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {/* Sub-toggle: Manual (activo) | Archivo (placeholder) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
          Método de carga
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setArchivoPlaceholder(false)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5',
              !archivoPlaceholder ? 'bg-purple-100 text-purple-700 border border-purple-300' : 'bg-slate-50 text-slate-600 border border-slate-200',
            ].join(' ')}
          >
            Construir alumno por alumno
          </button>
          <button
            type="button"
            onClick={() => setArchivoPlaceholder(true)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5',
              archivoPlaceholder ? 'bg-slate-200 text-slate-700 border border-slate-300' : 'bg-slate-50 text-slate-500 border border-slate-200',
            ].join(' ')}
          >
            <FileUp size={12} /> Subir archivo (próximamente)
          </button>
        </div>
      </div>

      {archivoPlaceholder ? (
        <section className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
          <FileUp size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Subida de ZIP con CSVs PUCV o JSON con varios historiales.
            Parser ya implementado en backend; falta conectar la UI cuando
            se defina el formato de carga con la API de la universidad.
          </p>
        </section>
      ) : (
        <>
          {alumnos.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-800">
                  Alumnos en la cohorte ({alumnos.length})
                </h4>
                <button
                  type="button"
                  onClick={() => onCohorteCompleta(alumnos)}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-1.5 rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <Play size={12} /> Usar esta cohorte
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {alumnos.map((a, idx) => {
                  const ramos = (a.semestres ?? []).reduce(
                    (sum, s) => sum + (s.cursos?.length ?? 0),
                    0,
                  );
                  return (
                    <div
                      key={idx}
                      className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 flex items-center gap-2 text-xs"
                    >
                      <span className="font-mono font-bold text-purple-700">
                        {a.rut}
                      </span>
                      <span className="text-slate-500">
                        {(a.semestres ?? []).length} sem · {ramos} ramos
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuitar(idx)}
                        title="Quitar de la cohorte"
                        className="text-slate-400 hover:text-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
              Próximo alumno ({indexToStudentId(alumnos.length)})
            </div>
            <FlujoManualAlumno
              key={resetKey}
              apiUrl={apiUrl}
              escenario={escenario}
              mallaOverride={mallaOverride}
              mallasGuardadas={mallasGuardadas}
              standalone={standalone}
              onSelectScenario={onSelectScenario}
              onAlumnoListo={handleAplicarAlumno}
            />
          </div>
        </>
      )}
    </div>
  );
}

interface SinteticoFormProps {
  perfiles: StudentProfile[];
  perfilSeleccionado: string;
  setPerfilSeleccionado: (v: string) => void;
  escenario: string;
  onSelectScenario: (s: ScenarioSelection) => void;
  mallasGuardadas: MallaGuardada[];
  count: number;
  setCount: (v: number) => void;
  seedBase: number;
  setSeedBase: (v: number) => void;
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
  count,
  setCount,
  seedBase,
  setSeedBase,
  loading,
  onGenerar,
  standalone = false,
}: SinteticoFormProps) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-4">Configuración de la cohorte sintética</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
            Perfil
            <HelpTip text="Preset de 3 rasgos en [0,1] aplicado a toda la cohorte: Esfuerzo (capacidad y dedicación, sube la probabilidad de aprobar), Disciplina (consistencia, reduce la variabilidad de las notas) y Tolerancia (cuánta carga inscribe sin saturarse). Van de 'esforzado_top' (rasgos altos) a 'en_problemas' (rasgos bajos); 'promedio' es el centro." />
          </label>
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
          <div className="flex gap-1">
            <input
              type="number"
              value={seedBase}
              onChange={(e) => setSeedBase(safeInt(e.target.value, 0))}
              className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() => setSeedBase(generarSeedAleatoria())}
              title="Generar seed aleatoria"
              className="px-2 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-purple-50 hover:border-purple-400 hover:text-purple-700 transition-all shrink-0"
            >
              <Dices size={16} />
            </button>
          </div>
        </div>
      </div>
      <button
        onClick={onGenerar}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
        Generar Cohorte
      </button>
    </section>
  );
}

interface ResultadosProps {
  stats: ReturnType<typeof calcularEstadisticas>;
  count: number;
  alumnos: Array<{ displayId: string } & StudentHistory>;
  predicciones: Record<string, IndividualPrediction>;
  onVerDetalle: (idx: number) => void;
  onDescargarAlumno: (idx: number) => void;
  onDescargarTodo: () => void;
}

function ResultadosSection({
  stats,
  count,
  alumnos,
  predicciones,
  onVerDetalle,
  onDescargarAlumno,
  onDescargarTodo,
}: ResultadosProps) {
  return (
    <section className="mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-bold text-slate-800">Resultados ({count} alumnos)</h3>
        <button
          onClick={onDescargarTodo}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2"
        >
          <Download size={14} /> Descargar cohorte completa
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="Titulados" value={`${((stats.titulados * 100) / count).toFixed(1)}%`} count={stats.titulados} color="emerald" />
        <Kpi label="Eliminado TAmin" value={`${((stats.elimTA * 100) / count).toFixed(1)}%`} count={stats.elimTA} color="amber" />
        <Kpi label="Eliminado Opor" value={`${((stats.elimOpor * 100) / count).toFixed(1)}%`} count={stats.elimOpor} color="red" />
        <Kpi label="Sin cerrar (activos)" value={`${((stats.activos * 100) / count).toFixed(1)}%`} count={stats.activos} color="blue" />
      </div>

      <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm text-slate-700">
        <p><strong>Promedio de semestres cursados:</strong> {stats.promSemestres.toFixed(2)}</p>
        <p><strong>Promedio de créditos aprobados:</strong> {stats.promCreditos.toFixed(1)} / 222</p>
        <p><strong>Promedio de notas finales:</strong> {stats.promNota.toFixed(2)}</p>
      </div>

      <h4 className="text-sm font-bold text-slate-700 mb-2">
        Tabla de alumnos
        <span className="text-xs font-normal text-slate-500 ml-2">
          (% por estado sobre las iteraciones de proyección)
        </span>
        {alumnos.length > 100 && (
          <span className="text-xs font-normal text-slate-500 ml-2">
            · mostrando primeros 100 — descargue el ZIP para el total
          </span>
        )}
      </h4>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="text-left p-2 font-semibold text-slate-600">ID</th>
              <th className="text-right p-2 font-semibold text-emerald-700">% Titulado</th>
              <th className="text-right p-2 font-semibold text-amber-700">% Elim. TAmin</th>
              <th className="text-right p-2 font-semibold text-red-700">% Elim. Opor</th>
              <th className="text-right p-2 font-semibold text-slate-600">Sem. proy.</th>
              <th className="text-right p-2 font-semibold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.slice(0, 100).map((a, idx) => {
              const pred = predicciones[a.displayId];
              const pct = (v?: number) => (typeof v === 'number' ? (v * 100).toFixed(1) + '%' : '…');
              return (
                <tr key={a.displayId} className="border-t border-slate-100">
                  <td className="p-2 font-mono font-bold text-blue-700">{a.displayId}</td>
                  <td className="p-2 text-right tabular-nums text-emerald-800">{pct(pred?.tasa_titulacion)}</td>
                  <td className="p-2 text-right tabular-nums text-amber-800">{pct(pred?.tasa_eliminado_tamin)}</td>
                  <td className="p-2 text-right tabular-nums text-red-800">{pct(pred?.tasa_eliminado_opor)}</td>
                  <td className="p-2 text-right text-slate-700">
                    {pred ? pred.semestres_proyectados.toFixed(1) : '…'}
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onVerDetalle(idx)}
                        title="Ver detalle"
                        className="px-2 py-1 rounded border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-blue-700 inline-flex items-center gap-1"
                      >
                        <Eye size={12} /> Ver
                      </button>
                      <button
                        onClick={() => onDescargarAlumno(idx)}
                        title="Descargar JSON+CSV"
                        className="px-2 py-1 rounded border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-700 inline-flex items-center gap-1"
                      >
                        <Download size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface DetalleAlumnoModalProps {
  alumno: StudentHistory;
  displayId: string;
  // Predicción pre-calculada al generar la cohorte. El modal es solo
  // lectura — no re-proyecta. Si null, significa que la proyección no
  // está disponible (caso raro, p.ej. error de red al generar).
  prediccion: IndividualPrediction | null;
  reqsPorSigla: Map<string, string[]> | null;
  onClose: () => void;
}

function DetalleAlumnoModal({
  alumno,
  displayId,
  prediccion,
  reqsPorSigla,
  onClose,
}: DetalleAlumnoModalProps) {
  const handleDescargar = async () => {
    const alumnoExport = combinarHistorialYProyeccion(alumno, prediccion);
    await descargarAlumno(alumnoExport, displayId, prediccion ?? undefined);
  };

  const semestresHistorial = (alumno.semestres ?? []).length;
  const alumnoCombinado = combinarHistorialYProyeccion(alumno, prediccion);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-slate-800">
              Alumno <span className="font-mono text-blue-700">{displayId}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {semestresHistorial} semestres · estado:{' '}
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
          <div className="flex gap-2 items-center">
            <button
              onClick={handleDescargar}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Download size={12} /> Descargar
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <KanbanAlumno
            alumno={alumnoCombinado}
            proyectadoDesdeIdx={prediccion ? semestresHistorial : undefined}
            probabilidadesPorRamo={prediccion?.probabilidades_por_ramo}
            reqsPorSigla={reqsPorSigla}
            prediccionTasas={prediccion ? {
              titulacion: prediccion.tasa_titulacion,
              eliminadoTamin: prediccion.tasa_eliminado_tamin,
              eliminadoOpor: prediccion.tasa_eliminado_opor,
            } : undefined}
          />

          {prediccion && (
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Target size={14} className="text-emerald-600" />
                Proyección ({prediccion.iteraciones} iteraciones)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <Kpi
                  label="Tasa Titulación"
                  value={`${((prediccion.tasa_titulacion ?? 0) * 100).toFixed(1)}%`}
                  sub={`${Math.round((prediccion.tasa_titulacion ?? 0) * (prediccion.iteraciones || 0))} / ${prediccion.iteraciones || 0} iter.`}
                  color="emerald"
                />
                <Kpi
                  label="Eliminado TAmin"
                  value={`${((prediccion.tasa_eliminado_tamin ?? 0) * 100).toFixed(1)}%`}
                  sub={`${Math.round((prediccion.tasa_eliminado_tamin ?? 0) * (prediccion.iteraciones || 0))} / ${prediccion.iteraciones || 0} iter.`}
                  color="amber"
                />
                <Kpi
                  label="Eliminado Opor"
                  value={`${((prediccion.tasa_eliminado_opor ?? 0) * 100).toFixed(1)}%`}
                  sub={`${Math.round((prediccion.tasa_eliminado_opor ?? 0) * (prediccion.iteraciones || 0))} / ${prediccion.iteraciones || 0} iter.`}
                  color="red"
                />
                <Kpi
                  label="Semestres Proy."
                  value={(prediccion.semestres_proyectados ?? 0).toFixed(1)}
                  color="blue"
                />
              </div>
              <div className="text-xs font-mono text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                <span>δ_hist: <strong className="text-slate-900">{(prediccion.delta_hist_avg ?? 0).toFixed(4)}</strong></span>
                <span>δ_prereq: <strong className="text-slate-900">{(prediccion.delta_prereq_avg ?? 0).toFixed(4)}</strong></span>
                <span>δ_stress: <strong className="text-slate-900">{(prediccion.delta_stress_avg ?? 0).toFixed(4)}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

// ============================================
// Helpers locales
// ============================================

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

function Kpi({ label, value, count, sub, color }: { label: string; value: string; count?: number; sub?: string; color: string }) {
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
      {count !== undefined && (
        <div className="text-xs opacity-60 mt-1">{count} alumnos</div>
      )}
      {sub && <div className="text-xs opacity-60 mt-0.5 tabular-nums">{sub}</div>}
    </div>
  );
}

