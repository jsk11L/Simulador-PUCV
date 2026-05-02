import JSZip from 'jszip';
import { toBlob } from 'html-to-image';
import type { Asignatura, ModeloCalificaciones, SimulacionResponse, VariablesSimulacion } from '../types';

type LooseRecord = Record<string, unknown>;

const asArray = (value: unknown): LooseRecord[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is LooseRecord => typeof item === 'object' && item !== null);
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const pick = (obj: LooseRecord | null | undefined, ...keys: string[]) => {
  if (!obj) return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return obj[key];
    }
  }
  return undefined;
};

const deriveTransitionsFromHeatmap = (heatmap: LooseRecord[]) => {
  if (heatmap.length < 2) return [];

  type StateKey = 'activos' | 'titulados' | 'eliminados_ta' | 'eliminados_opor';
  const labels: Record<StateKey, string> = {
    activos: 'Activo',
    titulados: 'Titulado',
    eliminados_ta: 'EliminadoTAmin',
    eliminados_opor: 'EliminadoOpor',
  };

  const bucketState = (row: LooseRecord): Record<StateKey, number> => ({
    activos: asNumber(pick(row, 'activos', 'Activos')),
    titulados: asNumber(pick(row, 'titulados', 'Titulados')),
    eliminados_ta: asNumber(pick(row, 'eliminados_ta', 'EliminadosTA')),
    eliminados_opor: asNumber(pick(row, 'eliminados_opor', 'EliminadosOpor')),
  });

  const states: StateKey[] = ['activos', 'titulados', 'eliminados_ta', 'eliminados_opor'];
  const transitions: Array<{ semestre: number; from: string; to: string; value: number }> = [];

  for (let i = 1; i < heatmap.length; i++) {
    const prev = bucketState(heatmap[i - 1]);
    const curr = bucketState(heatmap[i]);
    const semestre = asNumber(pick(heatmap[i], 'semestre', 'Semestre'), i + 1);

    for (const state of states) {
      const persiste = Math.min(prev[state], curr[state]);
      if (persiste > 0) {
        transitions.push({ semestre, from: labels[state], to: labels[state], value: persiste });
      }
    }
  }

  return transitions;
};

const normalizeSimulationResponse = (raw: unknown): SimulacionResponse => {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as LooseRecord;

  const metricas = (pick(obj, 'metricas_globales', 'metricasGlobales') as LooseRecord) || {};
  const distribucion = (pick(obj, 'distribucion_semestres', 'distribucionSemestres') as Record<number, number>) || {};
  const ramosRaw = asArray(pick(obj, 'ramos_criticos', 'ramosCriticos'));
  const heatmapRaw = asArray(pick(obj, 'heatmap_estado_semestre', 'heatmapEstadoSemestre'));
  const transicionesRaw = asArray(pick(obj, 'transiciones_estado', 'transicionesEstado'));
  const sensibilidadRaw = asArray(pick(obj, 'sensibilidad_tornado', 'sensibilidadTornado', 'tornado_sensibilidad'));

  const heatmap = heatmapRaw.map((h) => ({
    semestre: asNumber(pick(h, 'semestre', 'Semestre')),
    activos: asNumber(pick(h, 'activos', 'Activos')),
    titulados: asNumber(pick(h, 'titulados', 'Titulados')),
    eliminados_ta: asNumber(pick(h, 'eliminados_ta', 'EliminadosTA')),
    eliminados_opor: asNumber(pick(h, 'eliminados_opor', 'EliminadosOpor')),
  }));

  const transicionesMapped = transicionesRaw.map((t) => ({
    semestre: asNumber(pick(t, 'semestre', 'Semestre')),
    from: String(pick(t, 'from', 'From') ?? ''),
    to: String(pick(t, 'to', 'To') ?? ''),
    value: asNumber(pick(t, 'value', 'Value')),
  })).filter((t) => t.value > 0 && t.from.length > 0 && t.to.length > 0);

  const transiciones = transicionesMapped.length > 0 ? transicionesMapped : deriveTransitionsFromHeatmap(heatmapRaw);

  const sensibilidad = sensibilidadRaw.map((s) => ({
    parametro: String(pick(s, 'parametro', 'Parametro') ?? ''),
    base: asNumber(pick(s, 'base', 'Base')),
    menos_10: asNumber(pick(s, 'menos_10', 'menos10', 'Menos10')),
    mas_10: asNumber(pick(s, 'mas_10', 'mas10', 'Mas10')),
    impacto: asNumber(pick(s, 'impacto', 'Impacto')),
  })).filter((s) => s.parametro.length > 0);

  return {
    resultado_id: typeof pick(obj, 'resultado_id', 'resultadoId') === 'string' ? String(pick(obj, 'resultado_id', 'resultadoId')) : undefined,
    mensaje: String(pick(obj, 'mensaje', 'message') ?? 'Simulacion completada'),
    metricas_globales: {
      alumnos_simulados: asNumber(pick(metricas, 'alumnos_simulados', 'alumnosSimulados')),
      titulados: asNumber(pick(metricas, 'titulados', 'Titulados')),
      eliminados_tamin: asNumber(pick(metricas, 'eliminados_tamin', 'eliminadosTamin')),
      eliminados_opor: asNumber(pick(metricas, 'eliminados_opor', 'eliminadosOpor')),
      tasa_titulacion_pct: asNumber(pick(metricas, 'tasa_titulacion_pct', 'tasaTitulacionPct')),
      semestres_promedio: asNumber(pick(metricas, 'semestres_promedio', 'semestresPromedio')),
      eficiencia_egreso: asNumber(pick(metricas, 'eficiencia_egreso', 'eficienciaEgreso')),
      egreso_oportuno_pct: asNumber(pick(metricas, 'egreso_oportuno_pct', 'egresoOportunoPct')),
      retencion_1er_anio_pct: asNumber(pick(metricas, 'retencion_1er_anio_pct', 'retencion1erAnioPct')),
      retencion_3er_anio_pct: asNumber(pick(metricas, 'retencion_3er_anio_pct', 'retencion3erAnioPct')),
    },
    distribucion_semestres: distribucion,
    ramos_criticos: ramosRaw.map((r) => ({
      sigla: String(pick(r, 'sigla', 'Sigla') ?? ''),
      intentos: asNumber(pick(r, 'intentos', 'Intentos')),
      reprobaciones: asNumber(pick(r, 'reprobaciones', 'Reprobaciones')),
      tasa_fallo_pct: asNumber(pick(r, 'tasa_fallo_pct', 'tasaFalloPct')),
    })),
    heatmap_estado_semestre: heatmap,
    transiciones_estado: transiciones,
    sensibilidad_tornado: sensibilidad,
  };
};

type UseSimulationActionsParams = {
  apiUrl: (path: string) => string;
};

type RunSimulationParams = {
  nombreMalla: string;
  malla: Asignatura[];
  variables: VariablesSimulacion;
  modeloCalif: ModeloCalificaciones;
  onStart: () => void;
  onSuccess: (data: SimulacionResponse) => void;
  onError: (message: string) => void;
  onFinally: () => void;
  refreshResultadosPasados: () => Promise<void> | void;
};

type DownloadZipParams = {
  simResults: SimulacionResponse;
  nombreMalla: string;
  malla: Asignatura[];
  totalSemestres: number;
  variables: VariablesSimulacion;
  modeloCalif: ModeloCalificaciones;
};

export default function useSimulationActions({ apiUrl }: UseSimulationActionsParams) {
  const runSimulation = async ({
    nombreMalla,
    malla,
    variables,
    modeloCalif,
    onStart,
    onSuccess,
    onError,
    onFinally,
    refreshResultadosPasados,
  }: RunSimulationParams) => {
    onStart();

    const programacion: { impar: string[]; par: string[] } = {
      impar: [],
      par: [],
    };

    for (const asig of malla) {
      if (asig.dictacion === 'semestral') {
        programacion.impar.push(asig.id);
        programacion.par.push(asig.id);
      } else if (asig.semestre % 2 !== 0) {
        programacion.impar.push(asig.id);
      } else {
        programacion.par.push(asig.id);
      }
    }

    try {
      const mallaNameParam = encodeURIComponent(nombreMalla);
      const response = await fetch(`${apiUrl('/api/simular')}?malla_nombre=${mallaNameParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('simula_token')}`,
        },
        body: JSON.stringify({
          asignaturas: malla,
          variables,
          modelo: modeloCalif,
          programacion,
        }),
      });

      const rawData = (await response.json()) as SimulacionResponse & { error?: string };
      if (!response.ok) throw new Error(rawData.error || 'Error en la simulacion');

      const normalized = normalizeSimulationResponse(rawData);
      onSuccess(normalized);
      await refreshResultadosPasados();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      onError(message);
    } finally {
      onFinally();
    }
  };

  const downloadZip = async ({
    simResults,
    nombreMalla,
    malla,
    totalSemestres,
    variables,
    modeloCalif,
  }: DownloadZipParams) => {
    const zip = new JSZip();
    const m = simResults.metricas_globales;
    const dist = simResults.distribucion_semestres || {};
    const ramos = simResults.ramos_criticos || [];
    const heatmap = simResults.heatmap_estado_semestre || [];
    const transiciones = simResults.transiciones_estado || [];
    const sensibilidad = simResults.sensibilidad_tornado || [];

    const mallaHeader = 'ID,Semestre,Creditos,Tasa_Reprobacion,Prerrequisitos,Dictacion';
    const mallaRows = malla.map((a) => `${a.id},${a.semestre},${a.cred},${a.rep},"${a.reqs.join(';')}",${a.dictacion || 'anual'}`);
    zip.file('malla.csv', [mallaHeader, ...mallaRows].join('\n'));

    const paramLines = [
      '=== SIMULAPUCV - Parametros de Simulacion ===',
      `Fecha: ${new Date().toLocaleString('es-CL')}`,
      `Malla: ${nombreMalla}`,
      `Total Asignaturas: ${malla.length}`,
      `Total Semestres: ${totalSemestres}`,
      `Total Creditos: ${malla.reduce((s, a) => s + a.cred, 0)}`,
      '',
      '--- Variables de Simulacion ---',
      `NE (Alumnos): ${variables.ne}`,
      `NCSmax (Creditos Max/Sem): ${variables.ncsmax}`,
      `TAmin (Avance Minimo): ${variables.tamin}`,
      `NapTAmin (Sem Aplicacion TAmin): ${variables.naptamin}`,
      `Opor (Oportunidades): ${variables.opor}`,
      `Iteraciones Montecarlo: ${variables.iteraciones}`,
      '',
      '--- Modelo Estocastico ---',
      `Ciclo Basico (Sem 1-4): VMap=${modeloCalif.vmap1234}, Delta=${modeloCalif.delta1234}`,
      `Ciclo Profesional (Sem 5-8): VMap=${modeloCalif.vmap5678}, Delta=${modeloCalif.delta5678}`,
      `Ciclo Titulacion (Sem 9+): VMap=${modeloCalif.vmapm}, Delta=${modeloCalif.deltam}`,
    ];
    zip.file('parametros.txt', paramLines.join('\n'));

    const resHeader = 'Metrica,Valor';
    const resRows = [
      `Alumnos Simulados,${m.alumnos_simulados}`,
      `Titulados,${m.titulados}`,
      `Tasa Titulacion (%),${m.tasa_titulacion_pct}`,
      `Semestres Promedio,${m.semestres_promedio}`,
      `Eficiencia Egreso,${m.eficiencia_egreso}`,
      `Egreso Oportuno (%),${m.egreso_oportuno_pct}`,
      `Eliminados TAmin,${m.eliminados_tamin}`,
      `Eliminados Oportunidades,${m.eliminados_opor}`,
      `Retencion 1er Ano (%),${m.retencion_1er_anio_pct}`,
      `Retencion 3er Ano (%),${m.retencion_3er_anio_pct}`,
    ];
    const distKeys = Object.keys(dist).map(Number).sort((a, b) => a - b);
    resRows.push('', 'Distribucion Semestres,');
    distKeys.forEach((k) => resRows.push(`Semestre ${k},${dist[k]}`));
    zip.file('resultados.csv', [resHeader, ...resRows].join('\n'));

    const ramosHeader = 'Sigla,Intentos,Reprobaciones,Tasa_Fallo_%';
    const ramosRows = ramos.map((r) => `${r.sigla},${r.intentos},${r.reprobaciones},${r.tasa_fallo_pct}`);
    zip.file('ramos_criticos.csv', [ramosHeader, ...ramosRows].join('\n'));

    if (heatmap.length > 0) {
      const heatmapHeader = 'Semestre,Activos,Titulados,Eliminados_TA,Eliminados_Opor';
      const heatmapRows = heatmap.map((h) => `${h.semestre},${h.activos},${h.titulados},${h.eliminados_ta},${h.eliminados_opor}`);
      zip.file('heatmap_estado_semestre.csv', [heatmapHeader, ...heatmapRows].join('\n'));
    }

    if (transiciones.length > 0) {
      const transHeader = 'Semestre,From,To,Valor';
      const transRows = transiciones.map((t) => `${t.semestre},${t.from},${t.to},${t.value}`);
      zip.file('transiciones_estado.csv', [transHeader, ...transRows].join('\n'));
    }

    if (sensibilidad.length > 0) {
      const sensHeader = 'Parametro,Base,Menos_10_PPE,Mas_10_PPE,Impacto';
      const sensRows = sensibilidad.map((s) => `${s.parametro},${s.base},${s.menos_10},${s.mas_10},${s.impacto}`);
      zip.file('sensibilidad_tornado.csv', [sensHeader, ...sensRows].join('\n'));
    }

    if (malla.length > 0) {
      const tasaPorSigla = new Map(ramos.map((r) => [r.sigla, r.tasa_fallo_pct]));
      const asigHeatHeader = 'Semestre,Sigla,Tasa_Fallo_%';
      const asigHeatRows = malla.map((a) => `${a.semestre},${a.id},${tasaPorSigla.get(a.id) ?? ''}`);
      zip.file('heatmap_asignaturas_kanban.csv', [asigHeatHeader, ...asigHeatRows].join('\n'));
    }

    // Export chart images when available on screen.
    try {
      const captureTargets = [
        { id: 'chart-distribucion', file: 'graficos/distribucion_semestres.png' },
        { id: 'chart-supervivencia', file: 'graficos/supervivencia_academica.png' },
        { id: 'chart-cdf', file: 'graficos/cdf_titulacion.png' },
        { id: 'chart-heatmap-estado', file: 'graficos/heatmap_estado_semestre.png' },
        { id: 'chart-heatmap-asignaturas', file: 'graficos/heatmap_asignaturas_kanban.png' },
        { id: 'chart-sankey', file: 'graficos/sankey_transiciones.png' },
        { id: 'chart-tornado', file: 'graficos/tornado_sensibilidad.png' },
      ];

      for (const target of captureTargets) {
        const node = document.getElementById(target.id);
        if (!node) continue;

        const blobImg = await toBlob(node, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          cacheBust: true,
        });

        if (blobImg) {
          zip.file(target.file, blobImg);
        }
      }
    } catch (error) {
      console.warn('No se pudieron capturar imagenes de graficos para el ZIP:', error);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SimulaPUCV_${nombreMalla.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return {
    runSimulation,
    downloadZip,
  };
}
