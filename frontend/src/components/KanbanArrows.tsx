import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Waypoints } from 'lucide-react';

// ==========================================
// OVERLAY DE FLECHAS PARA KANBANS
// ==========================================
// Dibuja flechas SVG sobre un tablero kanban (columnas en flex con scroll
// horizontal). Es agnóstico al contenido: opera por nodos marcados con el
// atributo `data-kanban-node="<clave>"` dentro de un contenedor de
// referencia, y por una lista de aristas {from, to, kind, color}.
//
//   - kind 'prereq' → flecha de PREREQUISITO: un ramo prerequisito apunta
//     al ramo que abre. El color lo decide el llamador (paleta por ramo),
//     con naranjo como primer color. Nunca rojo (reservado para repetición).
//   - kind 'repeat' → flecha ROJA punteada: un intento reprobado apunta al
//     siguiente intento del mismo ramo.
//
// REQUISITOS DE LAYOUT
//   El contenedor de referencia (contentRef) debe ser el div de CONTENIDO
//   del tablero, con `position: relative`. El SVG se posiciona absoluto
//   sobre él y NO captura eventos (pointer-events: none), de modo que las
//   cards siguen siendo clickeables.

export type ArrowKind = 'prereq' | 'repeat';

export interface KanbanEdge {
  from: string; // clave del nodo origen (data-kanban-node)
  to: string;   // clave del nodo destino
  kind: ArrowKind;
  fromSigla?: string; // sigla del origen (para filtrar por ramo)
  toSigla?: string;   // sigla del destino
  color?: string;     // color explícito; si falta se usa el default del kind
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  dashed: boolean;
}

const COLOR_DEFAULT: Record<ArrowKind, string> = {
  prereq: '#f97316', // orange-500
  repeat: '#dc2626', // red-600
};

// Paleta para las flechas de prerequisito por ramo seleccionado. El primer
// color es NARANJO (pedido del cliente) y ninguno es rojo (reservado para
// las flechas de repetición/reprobados). 12 colores distintos antes de
// repetir, suficiente para no confundir relaciones simultáneas.
export const PREREQ_PALETTE = [
  '#f97316', // orange-500  (primera)
  '#2563eb', // blue-600
  '#7c3aed', // violet-600
  '#0d9488', // teal-600
  '#db2777', // pink-600
  '#d97706', // amber-600
  '#0891b2', // cyan-600
  '#65a30d', // lime-600
  '#4f46e5', // indigo-600
  '#059669', // emerald-600
  '#c026d3', // fuchsia-600
  '#0284c7', // sky-600
];

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
      // junto al contenido— quede siempre alineado.
      const sx = root.scrollLeft;
      const sy = root.scrollTop;
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
        let x1: number;
        let x2: number;
        if (b.left >= a.right) {
          x1 = a.right - rootRect.left + sx;
          x2 = b.left - rootRect.left + sx;
        } else if (a.left >= b.right) {
          x1 = a.left - rootRect.left + sx;
          x2 = b.right - rootRect.left + sx;
        } else {
          x1 = a.right - rootRect.left + sx;
          x2 = b.right - rootRect.left + sx;
        }
        const y1 = a.top + a.height / 2 - rootRect.top + sy;
        const y2 = b.top + b.height / 2 - rootRect.top + sy;
        segs.push({
          x1,
          y1,
          x2,
          y2,
          color: e.color ?? COLOR_DEFAULT[e.kind],
          dashed: e.kind === 'repeat',
        });
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

  // Un marker (punta de flecha) por color usado.
  const markers = useMemo(() => {
    const out = new Map<string, string>(); // color → markerId
    for (const s of segments) {
      if (!out.has(s.color)) out.set(s.color, `kanban-arrow-${s.color.replace('#', '')}`);
    }
    return out;
  }, [segments]);

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
        {Array.from(markers.entries()).map(([color, id]) => (
          <marker
            key={id}
            id={id}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={color} />
          </marker>
        ))}
      </defs>
      {segments.map((s, i) => {
        const dx = Math.max(24, Math.abs(s.x2 - s.x1) * 0.4);
        const c1x = s.x1 + dx;
        const c2x = s.x2 - dx;
        const d = `M ${s.x1} ${s.y1} C ${c1x} ${s.y1}, ${c2x} ${s.y2}, ${s.x2} ${s.y2}`;
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeOpacity={0.9}
            strokeDasharray={s.dashed ? '5 3' : undefined}
            markerEnd={`url(#${markers.get(s.color)})`}
          />
        );
      })}
    </svg>
  );
}

// ==========================================
// Botón por ramo para activar sus relaciones
// ==========================================
// Renderiza un ícono clickeable DENTRO de una card. Usa <span role=button>
// (no <button>) para poder anidarse en cards que ya son clickeables sin
// generar HTML inválido; detiene la propagación para no disparar el click
// de la card.

export function RelacionToggle({
  active,
  color,
  onClick,
  title,
}: {
  active: boolean;
  color: string | null;
  onClick: () => void;
  title?: string;
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      title={title ?? 'Ver prerequisitos y ramos que abre'}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      className={[
        'inline-flex items-center justify-center w-5 h-5 rounded shrink-0 cursor-pointer transition-colors',
        active ? '' : 'hover:bg-slate-200',
      ].join(' ')}
      style={active && color ? { backgroundColor: color } : undefined}
    >
      <Waypoints size={12} className={active ? 'text-white' : 'text-slate-400'} />
    </span>
  );
}

// ==========================================
// Hook de selección de relaciones por ramo
// ==========================================
// Centraliza el estado compartido por los tres kanbans:
//   - `activas`: siglas cuyas relaciones de prerequisito se muestran (cada
//     una con un color distinto de la paleta, naranjo la primera).
//   - `verRepeticiones`: toggle global de las flechas rojas de reprobado.
// Devuelve las aristas VISIBLES ya coloreadas, listas para <KanbanArrows>.

export function useArrowSelection(
  prereqEdges: KanbanEdge[],
  repeatEdges: KanbanEdge[] = [],
) {
  const [activas, setActivas] = useState<string[]>([]);
  const [verRepeticiones, setVerRepeticiones] = useState(false);

  // Siglas que participan en alguna relación (tienen prereq o abren algo).
  // Solo a esas les mostramos el botón —el resto no tiene flechas que ver.
  const siglasConRelacion = useMemo(() => {
    const s = new Set<string>();
    for (const e of prereqEdges) {
      if (e.fromSigla) s.add(e.fromSigla);
      if (e.toSigla) s.add(e.toSigla);
    }
    return s;
  }, [prereqEdges]);

  const colorDe = useCallback(
    (sigla: string): string | null => {
      const i = activas.indexOf(sigla);
      return i < 0 ? null : PREREQ_PALETTE[i % PREREQ_PALETTE.length];
    },
    [activas],
  );

  const toggleSigla = useCallback((sigla: string) => {
    setActivas((prev) =>
      prev.includes(sigla) ? prev.filter((s) => s !== sigla) : [...prev, sigla],
    );
  }, []);

  const limpiar = useCallback(() => setActivas([]), []);

  const edges = useMemo(() => {
    const activasSet = new Set(activas);
    const out: KanbanEdge[] = [];
    for (const e of prereqEdges) {
      const relFrom = e.fromSigla ? activasSet.has(e.fromSigla) : false;
      const relTo = e.toSigla ? activasSet.has(e.toSigla) : false;
      if (!relFrom && !relTo) continue;
      // Color = el del ramo seleccionado dueño de la relación (preferimos el
      // origen si está seleccionado, si no el destino).
      const owner = relFrom ? e.fromSigla! : e.toSigla!;
      const color = PREREQ_PALETTE[activas.indexOf(owner) % PREREQ_PALETTE.length];
      out.push({ ...e, color });
    }
    if (verRepeticiones) out.push(...repeatEdges);
    return out;
  }, [prereqEdges, repeatEdges, activas, verRepeticiones]);

  return {
    activas,
    verRepeticiones,
    setVerRepeticiones,
    toggleSigla,
    colorDe,
    limpiar,
    siglasConRelacion,
    edges,
  };
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
 * Construye las aristas de prerequisito y de repetición a partir de las
 * instancias de ramos en la trayectoria.
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
        edges.push({
          from: arr[i].key,
          to: arr[i + 1].key,
          kind: 'repeat',
          fromSigla: arr[i].sigla,
          toSigla: arr[i + 1].sigla,
        });
      }
    }
  }

  // --- Aristas de prerequisito ---
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
        edges.push({
          from: origen.key,
          to: destino.key,
          kind: 'prereq',
          fromSigla: origen.sigla,
          toSigla: destino.sigla,
        });
      }
    }
  }

  return edges;
}
