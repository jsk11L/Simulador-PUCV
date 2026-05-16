import { useEffect, useState } from 'react';
import { Loader2, Play, RotateCcw, SlidersHorizontal, TrendingDown, TrendingUp } from 'lucide-react';
import useStudentApi, { type BacktestCohorteResponse, type MallaCustomOverride } from '../hooks/useStudentApi';
import ScenarioSelector, { type ScenarioSelection } from './ScenarioSelector';
import type { MallaGuardada, ModifierWeights, StudentProfile } from '../types';

// Pesos por defecto (espejo de DefaultWeights en backend)
const DEFAULT_WEIGHTS: ModifierWeights = { w_hist: 0.0, w_prereq: 0.5, w_stress: 0.5 };

interface Props {
  apiUrl: (path: string) => string;
  mallasGuardadas: MallaGuardada[];
}

/**
 * Vista "Calibración": permite al administrador ajustar interactivamente
 * los pesos W_hist, W_prereq, W_stress y medir su impacto sobre cohortes
 * sintéticas mediante backtest. Cada cambio compara con el baseline W=0.
 */
const safeInt = (s: string, fallback = 0): number => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
};

export default function CalibracionView({ apiUrl, mallasGuardadas }: Props) {
  const api = useStudentApi({ apiUrl });

  const [perfiles, setPerfiles] = useState<StudentProfile[]>([]);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<string>('promedio');
  const [escenario, setEscenario] = useState<string>('caso_actual');
  const [mallaOverride, setMallaOverride] = useState<MallaCustomOverride | null>(null);
  const [count, setCount] = useState<number>(20);
  const [iteraciones, setIteraciones] = useState<number>(100);
  const [seed, setSeed] = useState<number>(20260516);

  const [weights, setWeights] = useState<ModifierWeights>(DEFAULT_WEIGHTS);
  const [resultado, setResultado] = useState<BacktestCohorteResponse | null>(null);

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

  const handleBacktest = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.backtestCohorte({
        profile: perfilSeleccionado,
        scenario: mallaOverride ? undefined : escenario,
        ...(mallaOverride ?? {}),
        count,
        iteraciones,
        seed,
        weights,
        nap_corte_ini: 3,
      });
      setResultado(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
          <SlidersHorizontal size={28} className="text-amber-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Calibración de Pesos δ</h2>
            <p className="text-sm text-slate-500">
              Ajustá los pesos de los modificadores y mide cómo cambian las predicciones
              sobre una cohorte sintética. La métrica primaria es Brier score (menor = mejor).
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ============================= */}
          {/* COLUMNA IZQUIERDA: PESOS      */}
          {/* ============================= */}
          <div className="lg:col-span-2">
            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-amber-500" />
                  Pesos del Modelo
                </h3>
                <button
                  onClick={handleReset}
                  className="text-xs font-semibold text-slate-500 hover:text-amber-600 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Reset a DefaultWeights
                </button>
              </div>

              <div className="space-y-5">
                <WeightControl
                  label="W_hist"
                  description="Peso del modificador por esfuerzo histórico (ratio créditos aprobados / inscritos)"
                  value={weights.w_hist}
                  onChange={(v) => setWeights({ ...weights, w_hist: v })}
                />
                <WeightControl
                  label="W_prereq"
                  description="Peso del modificador por nota promedio de prerrequisitos aprobados"
                  value={weights.w_prereq}
                  onChange={(v) => setWeights({ ...weights, w_prereq: v })}
                />
                <WeightControl
                  label="W_stress"
                  description="Peso del modificador por sobrecarga académica (carga actual vs histórica)"
                  value={weights.w_stress}
                  onChange={(v) => setWeights({ ...weights, w_stress: v })}
                />
              </div>

              <div className="mt-5 pt-5 border-t border-slate-200 grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Perfil de cohorte</label>
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
                    Alumnos <span className="text-slate-400">(2-200)</span>
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={200}
                    value={count}
                    onChange={(e) => setCount(Math.max(2, Math.min(200, safeInt(e.target.value, 2))))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Iteraciones por corte</label>
                  <input
                    type="number"
                    min={50}
                    max={500}
                    value={iteraciones}
                    onChange={(e) => setIteraciones(Math.max(50, Math.min(500, safeInt(e.target.value, 50))))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Seed</label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(safeInt(e.target.value, 0))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleBacktest}
                disabled={loading}
                className="mt-5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                Evaluar Pesos
              </button>
            </section>
          </div>

          {/* ============================= */}
          {/* COLUMNA DERECHA: RESULTADOS   */}
          {/* ============================= */}
          <div>
            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm sticky top-4">
              <h3 className="font-bold text-slate-800 mb-4">Métricas</h3>

              {!resultado ? (
                <div className="text-center text-slate-400 text-sm py-8">
                  Configurá los pesos y presioná "Evaluar Pesos" para ver métricas.
                </div>
              ) : (
                <div className="space-y-4">
                  <MetricaConBaseline
                    label="Brier ↓"
                    value={resultado.brier_avg ?? 0}
                    baseline={resultado.baseline?.brier_avg ?? 0}
                    lowerIsBetter
                  />
                  <MetricaConBaseline
                    label="Accuracy ↑"
                    value={resultado.accuracy_avg ?? 0}
                    baseline={resultado.baseline?.accuracy_avg ?? 0}
                    lowerIsBetter={false}
                    isPct
                  />
                  <MetricaConBaseline
                    label="Log-loss ↓"
                    value={resultado.log_loss_avg ?? 0}
                    baseline={resultado.baseline?.log_loss_avg ?? 0}
                    lowerIsBetter
                  />

                  <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 space-y-1">
                    <div>
                      Alumnos evaluados:{' '}
                      <strong className="text-slate-700">{resultado.alumnos_evaluados ?? 0}</strong>
                    </div>
                    <div>
                      Predicciones:{' '}
                      <strong className="text-slate-700">{resultado.predicciones_total ?? 0}</strong>
                    </div>
                    {resultado.baseline && (
                      <div className="text-slate-400 pt-1 italic">
                        Comparado vs W={'{0, 0, 0}'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// WeightControl — slider + input numérico sincronizados
// ============================================
function WeightControl({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}) {
  // safeParse evita propagar NaN al state cuando el input está vacío o no
  // numérico (causa común de pantalla blanca por value={NaN} y .toFixed(NaN)).
  const safeParse = (s: string, fallback: number): number => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : fallback;
  };
  const clamp = (v: number) => Math.max(0, Math.min(2, v));
  const displayValue = Number.isFinite(value) ? value : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-bold text-slate-800 font-mono">{label}</label>
        <input
          type="number"
          min={0}
          max={2}
          step={0.01}
          value={displayValue.toFixed(2)}
          onChange={(e) => onChange(clamp(safeParse(e.target.value, 0)))}
          className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-right font-mono"
        />
      </div>
      <p className="text-xs text-slate-500 mb-2">{description}</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 w-6">0</span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={displayValue}
          onChange={(e) => onChange(safeParse(e.target.value, 0))}
          className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <span className="text-xs text-slate-400 w-6">2</span>
      </div>
    </div>
  );
}

// ============================================
// MetricaConBaseline — muestra valor + delta vs baseline con flecha
// ============================================
function MetricaConBaseline({
  label,
  value,
  baseline,
  lowerIsBetter,
  isPct = false,
}: {
  label: string;
  value: number;
  baseline: number;
  lowerIsBetter: boolean;
  isPct?: boolean;
}) {
  const delta = value - baseline;
  // mejor = (lowerIsBetter && delta<0) || (!lowerIsBetter && delta>0)
  const isMejor = (lowerIsBetter && delta < 0) || (!lowerIsBetter && delta > 0);
  const isEmpate = Math.abs(delta) < 1e-4;

  const colorClass = isEmpate
    ? 'bg-slate-50 border-slate-200 text-slate-700'
    : isMejor
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : 'bg-red-50 border-red-200 text-red-800';

  const fmt = (v: number) => (isPct ? `${(v * 100).toFixed(2)}%` : v.toFixed(4));
  const fmtDelta = (v: number) => (isPct ? `${(v * 100 >= 0 ? '+' : '')}${(v * 100).toFixed(2)}pp` : `${v >= 0 ? '+' : ''}${v.toFixed(4)}`);

  const Icon = isEmpate ? null : isMejor ? TrendingUp : TrendingDown;

  return (
    <div className={`border rounded-lg p-3 ${colorClass}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold opacity-75">{label}</span>
        {Icon && <Icon size={14} />}
      </div>
      <div className="text-2xl font-black tabular-nums">{fmt(value)}</div>
      <div className="text-xs mt-1 opacity-75">
        vs baseline {fmt(baseline)} ({fmtDelta(delta)})
      </div>
    </div>
  );
}
