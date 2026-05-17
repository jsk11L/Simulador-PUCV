import JSZip from 'jszip';
import type { IndividualPrediction, StudentHistory } from '../types';

// ==========================================
// Descargas de alumnos
// ==========================================
// Construye paquetes ZIP con varios formatos según el caso:
//
//   alumno individual:
//     ID_historial.json     ← StudentHistory completo
//     ID_trayectoria.csv    ← una fila por curso, legible en Excel
//     ID_proyeccion.json    ← IndividualPrediction (si existe)
//
//   cohorte:
//     resumen.csv           ← una fila por alumno con estadística básica
//     alumnos/IDXX.json     ← StudentHistory de cada uno
//     alumnos/IDXX.csv      ← trayectoria CSV de cada uno
//
// Todos los CSV usan separador ';' y comas decimales (estilo PUCV /
// Excel ES-CL).

/** Genera el CSV plano de la trayectoria del alumno. */
export function historiaCSV(alumno: StudentHistory): string {
  const lines: string[] = [];
  lines.push('Semestre;Sigla;Creditos;Nota;Estado;Categoria');
  for (const sem of alumno.semestres ?? []) {
    for (const c of sem.cursos ?? []) {
      const nota = c.nota && c.nota > 0 ? c.nota.toFixed(1).replace('.', ',') : '';
      lines.push(
        [
          sem.periodo,
          c.sigla,
          c.creditos,
          nota,
          c.estado,
          c.categoria,
        ].join(';'),
      );
    }
  }
  return lines.join('\n');
}

/** Genera el CSV resumen de una cohorte (una fila por alumno). */
export function cohorteResumenCSV(
  alumnos: Array<{ displayId: string } & StudentHistory>,
): string {
  const lines: string[] = [];
  lines.push('ID;Estado;Semestres;Cursos_total;Aprobados;Reprobados;EnCurso;Creditos_aprobados');
  for (const a of alumnos) {
    const sems = a.semestres ?? [];
    let aprobados = 0;
    let reprobados = 0;
    let enCurso = 0;
    let credAprob = 0;
    let cursosTotal = 0;
    for (const s of sems) {
      for (const c of s.cursos ?? []) {
        cursosTotal++;
        if (c.estado === 'aprobado') {
          aprobados++;
          credAprob += c.creditos;
        }
        if (c.estado === 'reprobado') reprobados++;
        if (c.estado === 'en_curso') enCurso++;
      }
    }
    lines.push(
      [
        a.displayId,
        a.estado || 'desconocido',
        sems.length,
        cursosTotal,
        aprobados,
        reprobados,
        enCurso,
        credAprob,
      ].join(';'),
    );
  }
  return lines.join('\n');
}

/**
 * Construye un ZIP con la data del alumno individual:
 *   ID_historial.json
 *   ID_trayectoria.csv
 *   ID_proyeccion.json (opcional)
 */
export async function descargarAlumno(
  alumno: StudentHistory,
  displayId: string,
  prediccion?: IndividualPrediction | null,
): Promise<void> {
  const zip = new JSZip();
  const sanitized = sanitizeForFilename(displayId);

  zip.file(`${sanitized}_historial.json`, JSON.stringify(alumno, null, 2));
  zip.file(`${sanitized}_trayectoria.csv`, historiaCSV(alumno));
  if (prediccion) {
    zip.file(`${sanitized}_proyeccion.json`, JSON.stringify(prediccion, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `${sanitized}.zip`);
}

/**
 * Construye un ZIP con toda la cohorte:
 *   resumen.csv
 *   alumnos/ID001.json
 *   alumnos/ID001.csv
 *   ...
 */
export async function descargarCohorte(
  alumnos: Array<{ displayId: string } & StudentHistory>,
  filename: string,
): Promise<void> {
  const zip = new JSZip();
  zip.file('resumen.csv', cohorteResumenCSV(alumnos));
  const folder = zip.folder('alumnos');
  if (!folder) throw new Error('No se pudo crear el folder dentro del ZIP');

  for (const a of alumnos) {
    const safe = sanitizeForFilename(a.displayId);
    folder.file(`${safe}.json`, JSON.stringify(a, null, 2));
    folder.file(`${safe}.csv`, historiaCSV(a));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, sanitizeForFilename(filename) + '.zip');
}

function sanitizeForFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]+/g, '_');
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
