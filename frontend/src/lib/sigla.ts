// ==========================================
// ORDEN NATURAL DE SIGLAS
// ==========================================
// Las siglas tienen dos formatos en el sistema:
//   - Mallas sintéticas: códigos numéricos de 3 dígitos ("115", "140", "334").
//   - CSV real PUCV: alfanuméricas ("MAT1185", "ELO320", "EYP1113").
//
// El criterio pedido es "ordenar por X (prefijo) y luego por YZ (número)":
// primero el prefijo alfabético, después la parte numérica como NÚMERO
// (no como texto, para que "115" < "140" < "334" y "ELO9" < "ELO10").
//
// Una sigla se descompone en: prefijo (letras iniciales) + número + sufijo
// (cualquier resto, ej. una sección "L1"). Para códigos puramente numéricos
// el prefijo queda vacío y todo el peso recae en el número.

interface SiglaPartes {
  prefijo: string;
  numero: number;
  sufijo: string;
}

function descomponerSigla(sigla: string): SiglaPartes {
  const s = (sigla ?? '').trim().toUpperCase();
  // prefijo alfabético, bloque numérico, resto.
  const m = /^([^\d]*)(\d+)?(.*)$/.exec(s);
  if (!m) return { prefijo: s, numero: Number.POSITIVE_INFINITY, sufijo: '' };
  const prefijo = m[1] ?? '';
  const numero = m[2] !== undefined ? parseInt(m[2], 10) : Number.POSITIVE_INFINITY;
  const sufijo = m[3] ?? '';
  return { prefijo, numero, sufijo };
}

/**
 * Comparador de siglas: prefijo alfabético ascendente, luego número
 * ascendente, luego sufijo. Usar con `Array.prototype.sort`.
 */
export function compararSiglas(a: string, b: string): number {
  const pa = descomponerSigla(a);
  const pb = descomponerSigla(b);
  if (pa.prefijo !== pb.prefijo) return pa.prefijo < pb.prefijo ? -1 : 1;
  if (pa.numero !== pb.numero) return pa.numero - pb.numero;
  if (pa.sufijo !== pb.sufijo) return pa.sufijo < pb.sufijo ? -1 : 1;
  return 0;
}

/**
 * Devuelve una copia ordenada de `items` por su sigla, extraída con
 * `getSigla`. No muta el arreglo original.
 */
export function ordenarPorSigla<T>(items: T[], getSigla: (item: T) => string): T[] {
  return [...items].sort((a, b) => compararSiglas(getSigla(a), getSigla(b)));
}
