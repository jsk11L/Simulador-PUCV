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
  iteraciones: number;
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
  | 'ayuda'
  | 'admin';
