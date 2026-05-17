import { useMemo } from 'react';
import type { Asignatura, MallaGuardada } from '../types';
import type { MallaCustomOverride } from '../hooks/useStudentApi';

/**
 * Escenarios fijos del paper, con etiqueta legible. Mismo orden que
 * criticalScenarios del backend.
 */
const ESCENARIOS_FIJOS: Array<{ id: string; label: string }> = [
  { id: 'caso_actual', label: 'Caso Actual' },
  { id: 'pe', label: 'Plan de Estudios estricto' },
  { id: 'cas', label: 'Asignaturas semestralizadas' },
  { id: 'r_10', label: 'Reprobación global −10%' },
  { id: 'r_mas_10', label: 'Reprobación global +10%' },
  { id: 'r_10_gt_40', label: 'Mejora en ramos críticos' },
  { id: 'pf', label: 'Propuesta Final' },
];

const MALLA_PREFIX = '__malla__';

/** Información que el selector entrega al padre. */
export interface ScenarioSelection {
  /** Identificador opaco para usar en el `value` del select. */
  value: string;
  /** ID del escenario fijo (vacío si es malla custom). */
  scenarioId: string;
  /** Si es malla custom, override para mandar al backend. */
  override?: MallaCustomOverride;
  /** Etiqueta legible. */
  label: string;
}

interface Props {
  value: string;
  onSelect: (s: ScenarioSelection) => void;
  mallasGuardadas: MallaGuardada[];
  /** Etiqueta del label del select. */
  label?: string;
  className?: string;
  /** Si true, oculta el optgroup de escenarios fijos del paper (modo portable). */
  hideFixedScenarios?: boolean;
}

/**
 * Selector unificado que permite elegir entre los 7 escenarios fijos del
 * paper y las mallas guardadas del usuario. Al cambiar, llama `onSelect`
 * con un descriptor que ya incluye el override de malla custom listo
 * para enviar al backend.
 */
export default function ScenarioSelector({
  value,
  onSelect,
  mallasGuardadas,
  label = 'Escenario',
  className,
  hideFixedScenarios = false,
}: Props) {
  // Index para resolver rápido al cambiar el select.
  const mallasById = useMemo(() => {
    const m = new Map<string, MallaGuardada>();
    for (const malla of mallasGuardadas) m.set(malla.id, malla);
    return m;
  }, [mallasGuardadas]);

  const handleChange = (newValue: string) => {
    if (newValue.startsWith(MALLA_PREFIX)) {
      const id = newValue.slice(MALLA_PREFIX.length);
      const malla = mallasById.get(id);
      if (malla) {
        onSelect({
          value: newValue,
          scenarioId: '',
          override: {
            asignaturas: malla.asignaturas,
            programacion: buildProgramacion(malla.asignaturas),
          },
          label: malla.nombre,
        });
        return;
      }
    }
    const fijo = ESCENARIOS_FIJOS.find((e) => e.id === newValue);
    onSelect({
      value: newValue,
      scenarioId: newValue,
      label: fijo?.label ?? newValue,
    });
  };

  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className={
          className ??
          'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white'
        }
      >
        {!hideFixedScenarios && (
          <optgroup label="Escenarios del paper">
            {ESCENARIOS_FIJOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </optgroup>
        )}
        {mallasGuardadas.length > 0 && (
          <optgroup label="Mis mallas guardadas">
            {mallasGuardadas.map((m) => (
              <option key={m.id} value={`${MALLA_PREFIX}${m.id}`}>
                {m.nombre}
              </option>
            ))}
          </optgroup>
        )}
        {hideFixedScenarios && mallasGuardadas.length === 0 && (
          <option value="" disabled>
            Guarde una malla primero para usar esta función
          </option>
        )}
      </select>
    </div>
  );
}

/**
 * Reconstruye el objeto `programacion` (impar/par) desde una malla, igual
 * que `runSimulation` en useSimulationActions.ts.
 *
 *   - Dictacion = "semestral" → la asignatura se ofrece en ambos semestres.
 *   - Dictacion = "anual" → solo en el semestre teórico (par/impar según
 *     su número).
 */
export function buildProgramacion(asignaturas: Asignatura[]): { impar: string[]; par: string[] } {
  const impar: string[] = [];
  const par: string[] = [];
  for (const a of asignaturas) {
    if (a.dictacion === 'anual') {
      if (a.semestre % 2 === 0) par.push(a.id);
      else impar.push(a.id);
    } else {
      // semestral o sin definir → semestral por default
      impar.push(a.id);
      par.push(a.id);
    }
  }
  return { impar, par };
}
