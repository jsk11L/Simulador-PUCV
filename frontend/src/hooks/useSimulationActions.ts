import JSZip from 'jszip';
import type { Asignatura, ModeloCalificaciones, SimulacionResponse, VariablesSimulacion } from '../types';

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
        }),
      });

      const data = (await response.json()) as SimulacionResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Error en la simulacion');

      onSuccess(data);
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
