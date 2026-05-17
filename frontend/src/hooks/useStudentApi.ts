import type {
  IndividualPrediction,
  ModifierWeights,
  StudentHistory,
  StudentProfile,
} from '../types';

interface UseStudentApiParams {
  apiUrl: (path: string) => string;
}

interface ApiError {
  error?: string;
  perfiles_validos?: string[];
}

/**
 * Campos opcionales que permiten enviar una malla custom (de "Mis mallas
 * guardadas") en lugar de un escenario fijo del paper. Si `asignaturas`
 * viene no-vacío, el backend la usa directamente y ignora `scenario`.
 */
export interface MallaCustomOverride {
  asignaturas?: import('../types').Asignatura[];
  programacion?: {
    impar: string[];
    par: string[];
  };
  ncsmax?: number;
}

export interface GenerarAlumnoParams extends MallaCustomOverride {
  profile: string;
  scenario?: string;
  seed?: number;
  until_semestre?: number;
  count?: number;
  rut?: string;
  nombre?: string;
}

export interface CohorteResponse {
  count: number;
  profile: StudentProfile;
  scenario: string;
  seed_base: number;
  alumnos: StudentHistory[];
}

export interface SimularIndividualParams extends MallaCustomOverride {
  history: StudentHistory;
  scenario?: string;
  weights?: ModifierWeights;
  iteraciones?: number;
  seed?: number;
  tamin_mode?: 'proyectivo' | 'estricto';
}

export interface BacktestCohorteParams extends MallaCustomOverride {
  profile: string;
  scenario?: string;
  count?: number;
  iteraciones?: number;
  seed?: number;
  weights: ModifierWeights;
  nap_corte_ini?: number;
}

export interface BacktestCohorteSnapshot {
  profile: StudentProfile;
  weights: ModifierWeights;
  alumnos_evaluados: number;
  predicciones_total: number;
  brier_avg: number;
  accuracy_avg: number;
  log_loss_avg: number;
}

export interface BacktestCohorteResponse extends BacktestCohorteSnapshot {
  baseline?: BacktestCohorteSnapshot;
}

/**
 * Hook con los endpoints del feature de predicción individual.
 * Todos requieren token de sesión válido.
 */
export default function useStudentApi({ apiUrl }: UseStudentApiParams) {
  const authHeaders = () => {
    const token = localStorage.getItem('simula_token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  /** Lista los perfiles preset disponibles. */
  const fetchPerfiles = async (): Promise<StudentProfile[]> => {
    const res = await fetch(apiUrl('/api/perfiles'), { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.perfiles) ? (data.perfiles as StudentProfile[]) : [];
  };

  /**
   * Genera 1 alumno (devuelve StudentHistory) o N alumnos (devuelve CohorteResponse).
   * El caller decide qué espera según el `count` enviado.
   */
  const generarAlumno = async (
    params: GenerarAlumnoParams,
  ): Promise<StudentHistory | CohorteResponse> => {
    const res = await fetch(apiUrl('/api/generar-alumno'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  /** Proyecta el futuro de un alumno aplicando modificadores δ. */
  const simularIndividual = async (
    params: SimularIndividualParams,
  ): Promise<IndividualPrediction> => {
    const res = await fetch(apiUrl('/api/simular-individual'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  /**
   * Backtestea pesos sobre una cohorte sintética y devuelve métricas
   * (Brier/Accuracy/LogLoss) + baseline con W=0 para comparación.
   */
  const backtestCohorte = async (
    params: BacktestCohorteParams,
  ): Promise<BacktestCohorteResponse> => {
    const res = await fetch(apiUrl('/api/backtest-cohorte'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  /**
   * Obtiene la malla y programación de un escenario fijo del paper.
   * Usado por el flujo manual para construir el kanban interactivo.
   */
  const fetchScenario = async (id: string): Promise<{
    id: string;
    asignaturas: import('../types').Asignatura[];
    programacion?: { impar: string[]; par: string[] };
    ncsmax: number;
  }> => {
    const res = await fetch(apiUrl(`/api/scenarios/${id}`), { headers: authHeaders() });
    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  return {
    fetchPerfiles,
    generarAlumno,
    simularIndividual,
    backtestCohorte,
    fetchScenario,
  };
}
