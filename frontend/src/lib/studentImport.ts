import Papa from 'papaparse';
import type {
  Asignatura,
  CategoriaSubject,
  EstadoSubject,
  SemesterRecord,
  StudentHistory,
  SubjectRecord,
} from '../types';

// ==========================================
// IMPORTACIÓN DE HISTORIALES
// ==========================================
//
// Soporta dos formatos:
//
//   1. CSV simple de la app (recomendado para construcción manual)
//      Cinco columnas obligatorias en este orden o por nombre de header:
//
//        periodo,sigla,creditos,nota,estado
//        S1-2022,115,6,5.5,aprobado
//        S1-2022,140,6,3.5,reprobado
//        S2-2022,117,4,5.0,aprobado
//        S1-2023,205,4,0,en_curso
//
//      - `periodo`: regex `^S[12]-\d{4}$` (S1-2022, S2-2025).
//      - `sigla`:   debe coincidir con la malla seleccionada.
//      - `creditos`: entero ≥ 1.
//      - `nota`:    decimal 1.0-7.0. Si el estado es en_curso o abandonado,
//                   puede dejarse vacío o ponerse 0.
//      - `estado`:  aprobado | reprobado | en_curso | abandonado.
//
//      Separador: coma (`,`) o punto y coma (`;`).
//      Decimal:   punto (`.`) o coma (`,`) — se detecta automáticamente.
//      Encoding:  UTF-8 (con o sin BOM).
//
//   2. JSON nativo (StudentHistory directo, igual al ZIP que descarga la app)
//      Permite round-trip: descargar ZIP → editar JSON → recargar.

export interface ImportResult {
  alumno: StudentHistory;
  warnings: string[];
}

/**
 * Parsea texto de un archivo y devuelve un StudentHistory + warnings.
 * Detecta automáticamente si es CSV o JSON.
 *
 * Si se pasa `mallaAsignaturas`, se valida que las siglas existan; las
 * que no, se registran como warning y se omiten.
 */
export function parseImported(
  text: string,
  filename: string,
  mallaAsignaturas?: Asignatura[],
): ImportResult {
  const trimmed = text.trim();
  const looksJson = filename.toLowerCase().endsWith('.json') || trimmed.startsWith('{');
  if (looksJson) {
    return parseJSONNativo(trimmed);
  }
  return parseCSVSimple(trimmed, mallaAsignaturas);
}

/**
 * Parsea CSV simple de la app. Tolerante a `,` o `;` y a comas decimales.
 */
export function parseCSVSimple(
  text: string,
  mallaAsignaturas?: Asignatura[],
): ImportResult {
  const warnings: string[] = [];

  // Detectar separador: el que más aparezca en la primera línea no vacía.
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? '';
  const semis = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const delimiter = semis > commas ? ';' : ',';

  // BOM UTF-8 al inicio: quitarlo.
  let cleaned = text;
  if (cleaned.charCodeAt(0) === 0xfeff) cleaned = cleaned.slice(1);

  const parsed = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: true,
    delimiter,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parsed.errors && parsed.errors.length > 0) {
    parsed.errors.slice(0, 3).forEach((e) => {
      warnings.push(`CSV warning fila ${e.row}: ${e.message}`);
    });
  }

  const filas = parsed.data ?? [];
  if (filas.length === 0) {
    throw new Error('El CSV está vacío o no se pudo leer.');
  }

  // Verificar headers presentes.
  const required = ['periodo', 'sigla', 'creditos', 'nota', 'estado'];
  const presentes = Object.keys(filas[0] ?? {});
  const faltantes = required.filter((r) => !presentes.includes(r));
  if (faltantes.length > 0) {
    throw new Error(
      `CSV: faltan las columnas ${faltantes.join(', ')}. ` +
        'Header esperado: periodo,sigla,creditos,nota,estado',
    );
  }

  const mallaSet = mallaAsignaturas
    ? new Set(mallaAsignaturas.map((a) => a.id))
    : null;

  // Agrupar por período.
  const semestresMap = new Map<string, SemesterRecord>();

  filas.forEach((row, idx) => {
    const lineN = idx + 2; // +1 por header, +1 por 0-based
    const periodo = (row.periodo ?? '').trim();
    const sigla = (row.sigla ?? '').trim();
    const creditosStr = (row.creditos ?? '').trim();
    const notaStr = (row.nota ?? '').trim();
    const estadoStr = (row.estado ?? '').trim().toLowerCase();

    if (!periodo || !sigla) {
      warnings.push(`Fila ${lineN}: período o sigla vacíos, se omite.`);
      return;
    }
    if (!/^S[12]-\d{4}$/.test(periodo)) {
      warnings.push(`Fila ${lineN}: período "${periodo}" inválido (esperado S1-AAAA o S2-AAAA), se omite.`);
      return;
    }
    if (mallaSet && !mallaSet.has(sigla)) {
      warnings.push(`Fila ${lineN}: sigla "${sigla}" no está en la malla seleccionada, se omite.`);
      return;
    }
    const creditos = parseInt(creditosStr, 10);
    if (!Number.isFinite(creditos) || creditos < 1) {
      warnings.push(`Fila ${lineN}: créditos "${creditosStr}" inválido, se omite.`);
      return;
    }
    const nota = parseNota(notaStr);
    const estado = parseEstado(estadoStr);
    if (!estado) {
      warnings.push(`Fila ${lineN}: estado "${estadoStr}" desconocido, se omite.`);
      return;
    }

    // Coherencia nota vs estado (warning suave, se acomoda).
    let notaFinal = nota;
    if (estado === 'aprobado' && nota > 0 && nota < 4.0) {
      warnings.push(`Fila ${lineN}: nota ${nota.toFixed(1)} marcada como aprobado, ajustada a 4.0.`);
      notaFinal = 4.0;
    }
    if (estado === 'reprobado' && nota >= 4.0) {
      warnings.push(`Fila ${lineN}: nota ${nota.toFixed(1)} marcada como reprobado, ajustada a 3.9.`);
      notaFinal = 3.9;
    }
    if ((estado === 'en_curso' || estado === 'abandonado') && nota !== 0) {
      notaFinal = 0;
    }

    const semKey = periodo;
    if (!semestresMap.has(semKey)) {
      const [, semChar, anioStr] = /^S([12])-(\d{4})$/.exec(periodo)!;
      semestresMap.set(semKey, {
        periodo,
        anio: parseInt(anioStr, 10),
        semestre: parseInt(semChar, 10),
        cursos: [],
      });
    }
    const sem = semestresMap.get(semKey)!;
    const subj: SubjectRecord = {
      sigla,
      creditos,
      nota: notaFinal,
      estado,
      categoria: 'obligatoria' as CategoriaSubject,
    };
    sem.cursos.push(subj);
  });

  // Ordenar semestres cronológicamente.
  const semestres = Array.from(semestresMap.values()).sort((a, b) => {
    if (a.anio !== b.anio) return a.anio - b.anio;
    return a.semestre - b.semestre;
  });

  return {
    alumno: {
      rut: 'CSV-001',
      semestres,
      estado: 'activa',
    },
    warnings,
  };
}

/**
 * Parsea JSON nativo (StudentHistory). Acepta el mismo formato que el
 * sistema descarga en `ID_historial.json` para round-trip.
 */
export function parseJSONNativo(text: string): ImportResult {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON inválido: ${(e as Error).message}`);
  }
  if (!obj || typeof obj !== 'object') {
    throw new Error('JSON no contiene un objeto válido.');
  }
  const candidate = obj as Partial<StudentHistory>;
  if (!Array.isArray(candidate.semestres)) {
    throw new Error('JSON: falta el campo "semestres" o no es un array.');
  }
  // Normalizar cursos asegurando defaults.
  const semestres: SemesterRecord[] = candidate.semestres.map((s) => ({
    periodo: s.periodo,
    anio: s.anio,
    semestre: s.semestre,
    cursos: (s.cursos ?? []).map((c) => ({
      sigla: c.sigla,
      creditos: c.creditos,
      nota: c.nota ?? 0,
      estado: c.estado ?? 'aprobado',
      categoria: c.categoria ?? 'obligatoria',
      seccion: c.seccion,
      nombre: c.nombre,
    })),
  }));

  return {
    alumno: {
      rut: candidate.rut ?? 'JSON-001',
      nombre: candidate.nombre,
      carrera: candidate.carrera,
      estado: candidate.estado ?? 'activa',
      semestres,
    },
    warnings: [],
  };
}

// ---------- helpers ----------

function parseNota(s: string): number {
  const t = s.trim();
  if (!t || t === '-') return 0;
  const normalized = t.replace(',', '.');
  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(7, n));
}

function parseEstado(s: string): EstadoSubject | null {
  switch (s) {
    case 'aprobado':
    case 'aprobada':
    case 'a':
      return 'aprobado';
    case 'reprobado':
    case 'reprobada':
    case 'r':
      return 'reprobado';
    case 'en_curso':
    case 'en curso':
    case 'vigente':
    case 'cursando':
      return 'en_curso';
    case 'abandonado':
    case 'retiro':
    case 'anulado':
      return 'abandonado';
    default:
      return null;
  }
}
