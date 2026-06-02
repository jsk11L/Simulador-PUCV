import { useLayoutEffect, useRef, useState } from 'react';

// ==========================================
// OVERLAY DE FLECHAS PARA KANBANS
// ==========================================
// Dibuja flechas SVG sobre un tablero kanban (columnas en flex con scroll
// horizontal). Es agnóstico al contenido: opera por nodos marcados con el
// atributo `data-kanban-node="<clave>"` dentro de un contenedor de
// referencia, y por una lista de aristas {from, to, kind}.
//
//   - kind 'prereq' → flecha NARANJA: un ramo prerequisito apunta al ramo
//     que abre.
//   - kind 'repeat' → flecha ROJA: un intento reprobado apunta al siguiente
//     intento del mismo ramo.
//
// REQUISITOS DE LAYOUT
//   El contenedor de referencia (contentRef) debe ser el div de CONTENIDO
//   del tablero (el `flex` interno que crece con las columnas), con
//   `position: relative`. El SVG se posiciona absoluto sobre él y NO captura
//   eventos (pointer-events: none), de modo que las cards siguen siendo
//   clickeables. Como el contenido se desplaza junto al scroll, las
//   coordenadas medidas (rect del nodo − rect del contenedor) son estables
//   sin escuchar el scroll.

export type ArrowKind = 'prereq' | 'repeat';

export interface KanbanEdge {
  from: string; // clave del nodo origen (data-kanban-node)
  to: string;   // clave del nodo destino
  kind: ArrowKind;
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: ArrowKind;
}

const COLOR: Record<ArrowKind, string> = {
  prereq: '#f97316', // orange-500
  repeat: '#dc2626', // red-600
};

interface Props {
  contentRef: React.RefObject<HTMLElement | null>;
  edges: KanbanEdge[];
  enabled: boolean;
  /**
   * Dependencias que, al cambiar, fuerzan re-medición (p.ej. los semestres
   * o la malla). El overlay también re-mide ante resize del contenedor.
   */
  recomputeKey: unknown;
}

export default function KanbanArrows({ contentRef, edges, enabled, recomputeKey }: Props) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setSegments([]);
      return;
    }
    const root = contentRef.current;
    if (!root) return;

    const measure = () => {
      const rootRect = root.getBoundingClientRect();
      // Offset de scroll: las coordenadas se expresan respecto al CONTENIDO
      // (no al viewport), de modo que el SVG —hijo absoluto que se desplaza
      // junto al contenido— quede siempre alineado, tanto si `root` es el
      // contenedor que scrollea (MallaStep) como un contenido interno fijo.
      const sx = root.scrollLeft;
      const sy = root.scrollTop;
      // Primer nodo por clave (si una clave se repite en el DOM, gana el
      // primero — las claves deberían ser únicas por instancia de ramo).
      const rects = new Map<string, DOMRect>();
      root.querySelectorAll<HTMLElement>('[data-kanban-node]').forEach((n) => {
        const k = n.dataset.kanbanNode;
        if (k && !rects.has(k)) rects.set(k, n.getBoundingClientRect());
      });

      const segs: Segment[] = [];
      for (const e of edges) {
        const a = rects.get(e.from);
        const b = rects.get(e.to);
        if (!a || !b) continue;
        // Por defecto: del borde derecho del origen al borde izquierdo del
        // destino (origen a la izquierda en el tiempo). Si el destino está a
        // la izquierda o en la misma columna, conectamos lado contra lado.
        let x1: number;
        let x2: number;
        if (b.left >= a.right) {
          x1 = a.right - rootRect.left + sx;
          x2 = b.left - rootRect.left + sx;
        } else if (a.left >= b.right) {
          x1 = a.left - rootRect.left + sx;
          x2 = b.right - rootRect.left + sx;
        } else {
          // Solapan en X (misma columna): salir por la derecha y entrar por
          // la derecha con una pequeña curva.
          x1 = a.right - rootRect.left + sx;
          x2 = b.right - rootRect.left + sx;
        }
        const y1 = a.top + a.height / 2 - rootRect.top + sy;
        const y2 = b.top + b.height / 2 - rootRect.top + sy;
        segs.push({ x1, y1, x2, y2, kind: e.kind });
      }
      setSegments(segs);
      setSize({ w: root.scrollWidth, h: root.scrollHeight });
    };

    // Medir en el próximo frame para asegurar layout estable.
    const schedule = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    window.addEventListener('resize', schedule);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', schedule);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, edges, recomputeKey]);

  if (!enabled || segments.length === 0) return null;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      width={size.w || undefined}
      height={size.h || undefined}
      style={{ overflow: 'visible', zIndex: 5 }}
      aria-hidden
    >
      <defs>
        <marker
          id="kanban-arrow-prereq"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={COLOR.prereq} />
        </marker>
        <marker
          id="kanban-arrow-repeat"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={COLOR.repeat} />
        </marker>
      </defs>
      {segments.map((s, i) => {
        // Curva Bézier horizontal suave entre origen y destino.
        const dx = Math.max(24, Math.abs(s.x2 - s.x1) * 0.4);
        const c1x = s.x1 + dx;
        const c2x = s.x2 - dx;
        const d = `M ${s.x1} ${s.y1} C ${c1x} ${s.y1}, ${c2x} ${s.y2}, ${s.x2} ${s.y2}`;
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={COLOR[s.kind]}
            strokeWidth={1.75}
            strokeOpacity={0.85}
            strokeDasharray={s.kind === 'repeat' ? '5 3' : undefined}
            markerEnd={`url(#kanban-arrow-${s.kind})`}
          />
        );
      })}
    </svg>
  );
}

// ==========================================
// Cálculo de aristas a partir de la trayectoria
// ==========================================

export interface SubjectInstance {
  key: string;     // clave única de la instancia (data-kanban-node)
  sigla: string;
  semIdx: number;  // orden temporal de la columna
  estado?: string; // 'aprobado' | 'reprobado' | ...
}

/**
 * Construye las aristas de prerequisito (naranja) y de repetición (roja)
 * a partir de las instancias de ramos en la trayectoria.
 *
 *   - prereq: por cada ramo destino con prerequisitos, conecta la instancia
 *     APROBADA del prerequisito (la última aprobada antes del destino, o
 *     cualquier aprobada como respaldo) con la PRIMERA aparición del destino.
 *   - repeat: por cada sigla con múltiples intentos, conecta cada intento
 *     reprobado con el intento inmediatamente siguiente.
 */
export function construirAristas(
  instancias: SubjectInstance[],
  reqsPorSigla: Map<string, string[]> | null,
): KanbanEdge[] {
  const edges: KanbanEdge[] = [];

  // Agrupar por sigla, en orden temporal.
  const porSigla = new Map<string, SubjectInstance[]>();
  for (const inst of instancias) {
    if (!porSigla.has(inst.sigla)) porSigla.set(inst.sigla, []);
    porSigla.get(inst.sigla)!.push(inst);
  }
  for (const arr of porSigla.values()) arr.sort((a, b) => a.semIdx - b.semIdx);

  // --- Aristas de repetición (rojas) ---
  for (const arr of porSigla.values()) {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i].estado === 'reprobado') {
        edges.push({ from: arr[i].key, to: arr[i + 1].key, kind: 'repeat' });
      }
    }
  }

  // --- Aristas de prerequisito (naranjas) ---
  if (reqsPorSigla) {
    for (const [sigla, intentos] of porSigla) {
      const reqs = reqsPorSigla.get(sigla);
      if (!reqs || reqs.length === 0) continue;
      const destino = intentos[0]; // primera aparición del ramo
      for (const reqSigla of reqs) {
        const r = (reqSigla ?? '').trim();
        if (!r) continue;
        const candidatos = porSigla.get(r);
        if (!candidatos || candidatos.length === 0) continue;
        // Instancia aprobada antes del destino; si no hay, última aprobada;
        // si no hay aprobada, la última aparición.
        const aprobadasAntes = candidatos.filter(
          (c) => c.estado === 'aprobado' && c.semIdx < destino.semIdx,
        );
        const aprobadas = candidatos.filter((c) => c.estado === 'aprobado');
        const origen =
          aprobadasAntes[aprobadasAntes.length - 1] ??
          aprobadas[aprobadas.length - 1] ??
          candidatos[candidatos.length - 1];
        if (origen.key === destino.key) continue;
        edges.push({ from: origen.key, to: destino.key, kind: 'prereq' });
      }
    }
  }

  return edges;
}
