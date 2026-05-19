// ==========================================
// TIPOS E INTERFACES (SimulaPUCV)
// ==========================================

export interface Asignatura {
  id: string;
  cred: number;
  rep: number;
  reqs: string[];
  semestre: number;
  dictacion?: 'anual' | 'semestral';
}

export interface MallaGuardada {
  id: string;
  nombre: string;
  asignaturas: Asignatura[];
  totalSemestres: number;
  fecha: string;
}

export interface MallaGuardadaApi {
  id: string;
  nombre: string;
  asignaturas?: Asignatura[];
  total_semestres: number;
  updated_at: string;
}

export interface AdminUsuario {
  id: string;
  email: string;
  is_approved: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface VariablesSimulacion {
  ne: number;
  ncsmax: number;
  tamin: number;
  naptamin: number;
  opor: number;
}

export interface ModeloCalificaciones {
  vmap1234: number;
  delta1234: number;
  vmap5678: number;
  delta5678: number;
  vmapm: number;
  deltam: number;
}

// Respuesta del backend
export interface MetricasGlobales {
  alumnos_simulados: number;
  titulados: number;
  eliminados_tamin: number;
  eliminados_opor: number;
  tasa_titulacion_pct: number;
  semestres_promedio: number;
  eficiencia_egreso: number;
  egreso_oportuno_pct: number;
  retencion_1er_anio_pct: number;
  retencion_3er_anio_pct: number;
}

export interface RamoCritico {
  sigla: string;
  intentos: number;
  reprobaciones: number;
  tasa_fallo_pct: number;
}

export interface HeatmapEstadoSemestre {
  semestre: number;
  activos: number;
  titulados: number;
  eliminados_ta: number;
  eliminados_opor: number;
}

export interface TransicionEstado {
  semestre: number;
  from: 'Activo' | 'Titulado' | 'EliminadoTAmin' | 'EliminadoOpor' | string;
  to: 'Activo' | 'Titulado' | 'EliminadoTAmin' | 'EliminadoOpor' | string;
  value: number;
}

export interface SensibilidadParametro {
  parametro: string;
  base: number;
  menos_10: number;
  mas_10: number;
  impacto: number;
}

export interface SimulacionResponse {
  resultado_id?: string;
  mensaje: string;
  metricas_globales: MetricasGlobales;
  distribucion_semestres: Record<number, number>;
  ramos_criticos: RamoCritico[];
  heatmap_estado_semestre?: HeatmapEstadoSemestre[];
  transiciones_estado?: TransicionEstado[];
  sensibilidad_tornado?: SensibilidadParametro[];
}

export interface ResultadoPasado {
  id: string;
  malla_nombre: string;
  total_asignaturas: number;
  total_semestres: number;
  metricas_globales: MetricasGlobales;
  created_at: string;
}

export type ActiveTab =
  | 'wizard'
  | 'log'
  | 'ultimo_resultado'
  | 'resultados_pasados'
  | 'mallas'
  | 'crear_malla'
  | 'ayuda'
  | 'soporte'
  | 'admin'
  | 'simular_individual'
  | 'generar_cohorte'
  | 'calibracion';

// ==========================================
// SIMULACIÓN INDIVIDUAL (Backtesting)
// ==========================================

export type EstadoSubject = 'aprobado' | 'reprobado' | 'en_curso' | 'abandonado';
export type CategoriaSubject = 'obligatoria' | 'fofu' | 'optativa';
export type EstadoTrayectoria = '' | 'activa' | 'titulado' | 'eliminado_tamin' | 'eliminado_opor';

export interface SubjectRecord {
  sigla: string;
  seccion?: string;
  nombre?: string;
  creditos: number;
  nota?: number;
  estado: EstadoSubject;
  categoria: CategoriaSubject;
}

export interface SemesterRecord {
  periodo: string;   // S1-2024, S2-2025, etc.
  anio: number;
  semestre: number;  // 1 o 2
  cursos: SubjectRecord[];
}

export interface StudentHistory {
  rut?: string;
  nombre?: string;
  carrera?: string;
  estado?: EstadoTrayectoria;
  semestres: SemesterRecord[];
}

export interface StudentProfile {
  nombre: string;
  esfuerzo: number;
  disciplina: number;
  tolerancia: number;
}

export interface ModifierWeights {
  w_hist: number;
  w_prereq: number;
  w_stress: number;
}

export interface HistorialResumen {
  RatioAprobacion: number;
  CargaPromedio: number;
  NotasAprobado: Record<string, number>;
}

export interface RamoProbabilidad {
  sigla: string;
  creditos: number;
  semestre_nominal: number;
  prob_aprobar: number;
  intentos_prom: number;
}

export interface IndividualPrediction {
  alumno_rut?: string;
  historial_resumen: HistorialResumen;
  delta_hist_avg: number;
  delta_prereq_avg: number;
  delta_stress_avg: number;
  tasa_titulacion: number;
  tasa_eliminado_tamin: number;
  tasa_eliminado_opor: number;
  semestres_hasta_cierre: number;
  semestres_proyectados: number;
  probabilidades_por_ramo: RamoProbabilidad[];
  /**
   * Una iteración Montecarlo representativa de la trayectoria futura.
   * Solo incluye los semestres PROYECTADOS (no los del historial).
   * Sirve para visualizarse como kanban después del historial.
   */
  trayectoria_proyectada: SemesterRecord[];
  iteraciones: number;
}
