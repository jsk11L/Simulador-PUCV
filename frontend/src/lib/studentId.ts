// ==========================================
// ID anónimo de alumno (A001, A002, ...)
// ==========================================
// El objetivo es NO exponer nombres ni RUTs reales en la UI. Cada alumno
// recibe un ID corto y legible que se asigna determinísticamente desde
// su RUT/identificador interno, de modo que el mismo alumno siempre
// recibe el mismo ID a través de sesiones (mientras no cambie el RUT).
//
// Formato:
//   A001 ... A999    (999 alumnos en el mismo dataset)
//   A1000+ (sin padding)
//
// Para listas (cohortes recién generadas) se prefiere asignación por
// índice: A001, A002, ... según el orden de aparición. Es predecible y
// no requiere computar hash.

/** Formatea un índice 0-based como ID anónimo. `0 → A001`. */
export function indexToStudentId(idx: number): string {
  const n = idx + 1;
  return n < 1000 ? `A${String(n).padStart(3, '0')}` : `A${n}`;
}

/** Asigna IDs anónimos secuenciales a una lista. */
export function assignStudentIds<T>(items: T[]): Array<T & { displayId: string }> {
  return items.map((item, idx) => ({
    ...item,
    displayId: indexToStudentId(idx),
  }));
}

/**
 * Genera un ID determinístico desde un RUT u otro identificador. Para
 * alumnos sintéticos (RUT tipo `SYN-promedio-0`) y reales (RUT tipo
 * `12345678-9`) por igual. El mismo RUT siempre da el mismo ID.
 *
 * Estrategia: hash de 32 bits → modular a un namespace pequeño →
 * formatear. No cripto-seguro pero suficiente para anonimato visual.
 */
export function rutToStudentId(rut: string | undefined): string {
  if (!rut) return 'A???';
  // FNV-1a 32-bit hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < rut.length; i++) {
    hash ^= rut.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  // Limitar a 6 dígitos para mantener legibilidad
  const n = (hash % 999) + 1;
  return `A${String(n).padStart(3, '0')}`;
}
