import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Ban, GitFork, GraduationCap, XCircle } from 'lucide-react';
import { ordenarPorSigla } from '../lib/sigla';
import KanbanArrows, { construirAristas, type SubjectInstance } from './KanbanArrows';
import type {
  EstadoSubject,
  EstadoTrayectoria,
  RamoProbabilidad,
  SemesterRecord,
  StudentHistory,
  SubjectRecord,
} from '../types';

// ==========================================
// KANBAN DEL ALUMNO
// ==========================================
// Muestra la trayectoria académica como tablero kanban: una columna por
// semestre, una card por ramo cursado.
//
// Colores por estado:
//   aprobado    → verde
//   reprobado   → rojo
//   en_curso    → azul (curso vigente, sin nota final)
//   abandonado  → gris (retiro/anulado)
//
// Cada card muestra: SIGLA, créditos, nota.

interface Props {
  alumno: StudentHistory;
  /**
   * Si está presente, se llama al hacer click en una card.
   * Sirve para el flujo MANUAL donde el usuario edita el estado del ramo.
   */
  onClickRamo?: (sem: SemesterRecord, curso: SubjectRecord, idx: number) => void;
  /**
   * Permite mostrar el nombre del alumno o un ID anónimo en el header.
   */
  alumnoLabel?: string;
  /** Texto opcional para mostrar bajo el header. */
  sublabel?: string;
  /**
   * Si se indica, los semestres con índice >= este número se renderizan
   * con estilo "proyectado" (borde punteado, banner "Proyección"). Usado
   * para combinar historial + futuro proyectado en el mismo kanban.
   */
  proyectadoDesdeIdx?: number;
  /**
   * Probabilidades de aprobación por ramo agregadas sobre las
   * iteraciones del motor de proyección. Si se pasan, las cards de los
   * semestres PROYECTADOS se renderizan como mapa de calor (% aprobación
   * + color verde/amarillo/naranja/rojo). Los semestres del historial
   * real siguen mostrando nota numérica + colores binarios.
   */
  probabilidadesPorRamo?: RamoProbabilidad[];
  /**
   * Tasas finales de la proyección (titulación, eliminaciones). Si se
   * pasan y el alumno está activo (sin cerrar), el banner de cierre
   * cambia su color y texto al resultado más probable: verde si más
   * iteraciones titulan, ámbar si más se eliminan por TAmin, rojo si
   * más se eliminan por oportunidades.
   */
  prediccionTasas?: {
    titulacion: number;
    eliminadoTamin: number;
    eliminadoOpor: number;
  };
  /**
   * Mapa sigla → prerequisitos de la malla. Si se pasa, se habilitan las
   * flechas naranjas de prerequisito (de un ramo hacia los que abre). Sin
   * él, solo se dibujan las flechas rojas de repetición (reprobado →
   * reintento), que no necesitan la malla.
   */
  reqsPorSigla?: Map<string, string[]> | null;
}

export default function KanbanAlumno({
  alumno,
  onClickRamo,
  alumnoLabel,
  sublabel,
  proyectadoDesdeIdx,
  probabilidadesPorRamo,
  prediccionTasas,
  reqsPorSigla,
}: Props) {
  const semestres = alumno.semestres ?? [];
  const totalCursos = semestres.reduce((sum, s) => sum + (s.cursos?.length ?? 0), 0);

  // Lookup rápido sigla → prob_aprobar para las cards proyectadas. null
  // si no se proveen probabilidades (modo binario sin mapa de calor).
  const probPorSigla = probabilidadesPorRamo
    ? new Map(probabilidadesPorRamo.map((r) => [r.sigla, r.prob_aprobar]))
    : null;

  // Columnas con cards ordenadas por sigla y una clave única por instancia
  // de ramo. La clave la comparten el render (data-kanban-node) y el
  // cálculo de aristas, para que las flechas conecten exactamente las cards
  // visibles.
  const columnas = useMemo(
    () =>
      semestres.map((sem, semIdx) => {
        const proyectado =
          proyectadoDesdeIdx !== undefined && semIdx >= proyectadoDesdeIdx;
        const cursosConKey = ordenarPorSigla(sem.cursos ?? [], (c) => c.sigla).map(
          (curso, i) => ({ curso, key: `${semIdx}:${i}:${curso.sigla}` }),
        );
        return { sem, semIdx, proyectado, cursosConKey };
      }),
    [semestres, proyectadoDesdeIdx],
  );

  const instancias = useMemo<SubjectInstance[]>(() => {
    const out: SubjectInstance[] = [];
    for (const col of columnas) {
      for (const { curso, key } of col.cursosConKey) {
        out.push({ key, sigla: curso.sigla, semIdx: col.semIdx, estado: curso.estado });
      }
    }
    return out;
  }, [columnas]);

  const edges = useMemo(
    () => construirAristas(instancias, reqsPorSigla ?? null),
    [instancias, reqsPorSigla],
  );
  const hayPrereq = edges.some((e) => e.kind === 'prereq');
  const hayRepeticion = edges.some((e) => e.kind === 'repeat');

  const [mostrarFlechas, setMostrarFlechas] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  if (totalCursos === 0) {
    return (
      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
        <p className="text-slate-500 text-sm">
          No hay cursos en el historial todavía.
          {onClickRamo && ' Haz click en un ramo del kanban interactivo para empezar.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {(alumnoLabel || sublabel) && (
        <div className="mb-3">
          {alumnoLabel && (
            <h4 className="text-sm font-bold text-slate-800 font-mono">{alumnoLabel}</h4>
          )}
          {sublabel && <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>}
        </div>
      )}
      {proyectadoDesdeIdx !== undefined && proyectadoDesdeIdx < semestres.length && (
        <div className="flex items-center gap-3 mb-3 text-xs flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300"></span>
            <span className="text-slate-600">Historial real</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-violet-50 border border-dashed border-violet-400"></span>
            <span className="text-slate-600">Proyección Montecarlo</span>
          </span>
          {probabilidadesPorRamo && probabilidadesPorRamo.length > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-slate-600 mr-1">Prob. aprobar:</span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-50 border-l-4 border-emerald-500"></span>
                <span className="text-slate-600">≥70%</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-yellow-50 border-l-4 border-yellow-500"></span>
                <span className="text-slate-600">50-70%</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-orange-50 border-l-4 border-orange-500"></span>
                <span className="text-slate-600">30-50%</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-50 border-l-4 border-red-600"></span>
                <span className="text-slate-600">&lt;30%</span>
              </span>
            </>
          )}
        </div>
      )}
      {(hayPrereq || hayRepeticion) && (
        <div className="flex items-center gap-3 mb-3 text-xs flex-wrap">
          <button
            type="button"
            onClick={() => setMostrarFlechas((v) => !v)}
            className={[
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-colors',
              mostrarFlechas
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50',
            ].join(' ')}
          >
            <GitFork size={13} />
            {mostrarFlechas ? 'Ocultar flechas' : 'Mostrar flechas'}
          </button>
          {mostrarFlechas && hayPrereq && (
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded bg-orange-500"></span>
              <span className="text-slate-600">Prerequisito → ramo que abre</span>
            </span>
          )}
          {mostrarFlechas && hayRepeticion && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-5 h-0.5 rounded"
                style={{ backgroundImage: 'repeating-linear-gradient(90deg,#dc2626 0 4px,transparent 4px 7px)' }}
              ></span>
              <span className="text-slate-600">Reprobado → reintento</span>
            </span>
          )}
        </div>
      )}
      <div className="overflow-x-auto -mx-1 pb-2">
        <div ref={contentRef} className="relative flex gap-3 px-1 min-w-min">
          {columnas.map(({ sem, semIdx, proyectado, cursosConKey }) => (
            <SemesterColumn
              key={`${sem.periodo}-${semIdx}`}
              sem={sem}
              cursosConKey={cursosConKey}
              proyectado={proyectado}
              probPorSigla={proyectado ? probPorSigla : null}
              onClickRamo={onClickRamo ? (c, i) => onClickRamo(sem, c, i) : undefined}
            />
          ))}
          <KanbanArrows
            contentRef={contentRef}
            edges={edges}
            enabled={mostrarFlechas}
            recomputeKey={instancias}
          />
        </div>
      </div>

      <EstadoFinalBanner alumno={alumno} prediccionTasas={prediccionTasas} />
    </div>
  );
}

// EstadoFinalBanner renderiza un cartel al pie del kanban con el cierre
// académico del alumno. Para titulados/eliminados muestra el cierre real
// del historial. Para alumnos activos (sin cerrar) con proyección
// disponible, usa el resultado más probable de las iteraciones (verde si
// la mayoría se titula, ámbar si la mayoría se elimina por TAmin, rojo
// si la mayoría se elimina por oportunidades). Sin proyección, muestra
// un banner gris neutro "En curso".
function EstadoFinalBanner({
  alumno,
  prediccionTasas,
}: {
  alumno: StudentHistory;
  prediccionTasas?: { titulacion: number; eliminadoTamin: number; eliminadoOpor: number };
}) {
  const semestres = alumno.semestres ?? [];
  if (semestres.length === 0) return null;

  const estadoOriginal = (alumno.estado ?? 'activa') as EstadoTrayectoria;
  const ultimoSem = semestres[semestres.length - 1];
  const periodoFinal = ultimoSem?.periodo ?? '—';
  const semNumero = semestres.length;

  let creditosAprobados = 0;
  let totalCursos = 0;
  for (const s of semestres) {
    for (const c of s.cursos ?? []) {
      totalCursos++;
      if (c.estado === 'aprobado') creditosAprobados += c.creditos;
    }
  }

  // Para alumnos activos con proyección: el banner refleja el resultado
  // más probable (mayor tasa) y muestra el porcentaje.
  if (estadoOriginal === 'activa' && prediccionTasas) {
    const t = prediccionTasas;
    const max = Math.max(t.titulacion, t.eliminadoTamin, t.eliminadoOpor);
    if (max <= 0) {
      return (
        <div className="mt-4 flex items-center gap-3 p-4 rounded-xl border-2 bg-slate-50 border-slate-300">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-slate-500 text-white">
            <Ban size={28} />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base text-slate-900">En curso</div>
            <div className="text-sm mt-0.5 text-slate-700">
              Último período {periodoFinal} · {semNumero} semestres · proyección sin tasas determinadas.
            </div>
          </div>
        </div>
      );
    }
    let cfg: {
      bg: string;
      iconBg: string;
      title: string;
      sub: string;
      icon: React.ReactNode;
      titulo: string;
      subtitulo: string;
    };
    if (max === t.titulacion) {
      cfg = {
        bg: 'bg-emerald-50 border-emerald-300',
        iconBg: 'bg-emerald-500 text-white',
        title: 'text-emerald-900',
        sub: 'text-emerald-700',
        icon: <GraduationCap size={28} />,
        titulo: `Se titula en ${(t.titulacion * 100).toFixed(1)}% de los casos`,
        subtitulo: `${(t.eliminadoTamin * 100).toFixed(1)}% se elimina por TAmin · ${(t.eliminadoOpor * 100).toFixed(1)}% por oportunidades · ${creditosAprobados} créditos al día.`,
      };
    } else if (max === t.eliminadoTamin) {
      cfg = {
        bg: 'bg-amber-50 border-amber-300',
        iconBg: 'bg-amber-500 text-white',
        title: 'text-amber-900',
        sub: 'text-amber-700',
        icon: <AlertTriangle size={28} />,
        titulo: `Se elimina por TAmin en ${(t.eliminadoTamin * 100).toFixed(1)}% de los casos`,
        subtitulo: `${(t.titulacion * 100).toFixed(1)}% logra titularse · ${(t.eliminadoOpor * 100).toFixed(1)}% se elimina por oportunidades.`,
      };
    } else {
      cfg = {
        bg: 'bg-red-50 border-red-300',
        iconBg: 'bg-red-500 text-white',
        title: 'text-red-900',
        sub: 'text-red-700',
        icon: <XCircle size={28} />,
        titulo: `Se elimina por oportunidades en ${(t.eliminadoOpor * 100).toFixed(1)}% de los casos`,
        subtitulo: `${(t.titulacion * 100).toFixed(1)}% logra titularse · ${(t.eliminadoTamin * 100).toFixed(1)}% se elimina por TAmin.`,
      };
    }
    return (
      <div className={`mt-4 flex items-center gap-3 p-4 rounded-xl border-2 ${cfg.bg}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
          {cfg.icon}
        </div>
        <div className="min-w-0">
          <div className={`font-bold text-base ${cfg.title}`}>{cfg.titulo}</div>
          <div className={`text-sm mt-0.5 ${cfg.sub}`}>{cfg.subtitulo}</div>
        </div>
      </div>
    );
  }

  const estado = estadoOriginal;

  const config = {
    titulado: {
      bg: 'bg-emerald-50 border-emerald-300',
      iconBg: 'bg-emerald-500 text-white',
      title: 'text-emerald-900',
      sub: 'text-emerald-700',
      icon: <GraduationCap size={28} />,
      titulo: 'Alumno titulado',
      subtitulo: `Cierre en ${periodoFinal} · ${semNumero} semestres · ${creditosAprobados} créditos aprobados`,
    },
    eliminado_tamin: {
      bg: 'bg-amber-50 border-amber-300',
      iconBg: 'bg-amber-500 text-white',
      title: 'text-amber-900',
      sub: 'text-amber-700',
      icon: <AlertTriangle size={28} />,
      titulo: 'Eliminación por avance académico (TAmin)',
      subtitulo: `Cierre en ${periodoFinal} · ${semNumero} semestres cursados · ${creditosAprobados} créditos aprobados de ${totalCursos} ramos intentados`,
    },
    eliminado_opor: {
      bg: 'bg-red-50 border-red-300',
      iconBg: 'bg-red-500 text-white',
      title: 'text-red-900',
      sub: 'text-red-700',
      icon: <XCircle size={28} />,
      titulo: 'Eliminación por oportunidades agotadas',
      subtitulo: `Cierre en ${periodoFinal} · ${semNumero} semestres cursados · un ramo alcanzó el tope de reprobaciones`,
    },
    activa: {
      bg: 'bg-slate-50 border-slate-300',
      iconBg: 'bg-slate-500 text-white',
      title: 'text-slate-900',
      sub: 'text-slate-700',
      icon: <Ban size={28} />,
      titulo: 'En curso · calculando proyección',
      subtitulo: `Último período ${periodoFinal} · ${semNumero} semestres · ${creditosAprobados} créditos aprobados. El resultado más probable aparecerá cuando termine la proyección.`,
    },
    '': {
      bg: 'bg-slate-50 border-slate-300',
      iconBg: 'bg-slate-500 text-white',
      title: 'text-slate-900',
      sub: 'text-slate-700',
      icon: <Ban size={28} />,
      titulo: 'Estado desconocido',
      subtitulo: `Último período ${periodoFinal} · ${semNumero} semestres cargados.`,
    },
  }[estado];

  if (!config) return null;

  return (
    <div className={`mt-4 flex items-center gap-3 p-4 rounded-xl border-2 ${config.bg}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${config.iconBg}`}>
        {config.icon}
      </div>
      <div className="min-w-0">
        <div className={`font-bold text-base ${config.title}`}>{config.titulo}</div>
        <div className={`text-sm mt-0.5 ${config.sub}`}>{config.subtitulo}</div>
      </div>
    </div>
  );
}

function SemesterColumn({
  sem,
  cursosConKey,
  proyectado,
  probPorSigla,
  onClickRamo,
}: {
  sem: SemesterRecord;
  cursosConKey: Array<{ curso: SubjectRecord; key: string }>;
  proyectado?: boolean;
  probPorSigla?: Map<string, number> | null;
  onClickRamo?: (curso: SubjectRecord, idx: number) => void;
}) {
  // Las cards ya vienen ordenadas por sigla y con su clave de instancia
  // desde el padre (compartida con el overlay de flechas).
  const cursos = cursosConKey.map((x) => x.curso);
  const creditosAprob = cursos
    .filter((c) => c.estado === 'aprobado')
    .reduce((sum, c) => sum + c.creditos, 0);
  const creditosInscritos = cursos.reduce((sum, c) => sum + c.creditos, 0);
  // El color del ratio se basa SOLO en ramos ya evaluados (aprobado /
  // reprobado). Un semestre 100% "en curso" no debe pintarse rojo por no
  // tener aprobados todavía. null = sin evaluar aún → color neutro.
  const creditosEvaluados = cursos
    .filter((c) => c.estado === 'aprobado' || c.estado === 'reprobado')
    .reduce((sum, c) => sum + c.creditos, 0);
  const ratio = creditosEvaluados > 0 ? creditosAprob / creditosEvaluados : null;

  return (
    <div
      className={[
        'rounded-lg p-3 min-w-[180px] max-w-[180px] shrink-0',
        proyectado
          ? 'bg-violet-50 border-2 border-dashed border-violet-400'
          : 'bg-slate-100 border-2 border-transparent',
      ].join(' ')}
    >
      <div
        className={[
          'mb-2 pb-2 border-b',
          proyectado ? 'border-violet-300' : 'border-slate-300',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-1">
          <div className={`text-xs font-bold ${proyectado ? 'text-violet-800' : 'text-slate-700'}`}>
            {sem.periodo}
          </div>
          {proyectado && (
            <span className="text-[9px] uppercase tracking-wide font-bold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
              Proyectado
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          {cursos.length} {cursos.length === 1 ? 'ramo' : 'ramos'}
          {creditosInscritos > 0 && (
            <>
              {' · '}
              <span className={ratio === null ? '' : ratio === 1 ? 'text-emerald-600 font-semibold' : ratio < 0.5 ? 'text-red-600' : ''}>
                {creditosAprob}/{creditosInscritos} cr
              </span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {cursosConKey.map(({ curso: c, key }, idx) => (
          <CursoCard
            key={key}
            nodeKey={key}
            curso={c}
            probAprobar={probPorSigla?.get(c.sigla)}
            onClick={onClickRamo ? () => onClickRamo(c, idx) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function CursoCard({
  curso,
  nodeKey,
  probAprobar,
  onClick,
}: {
  curso: SubjectRecord;
  // Clave de instancia para anclar las flechas del overlay.
  nodeKey: string;
  // Si se pasa, la card se renderiza como mapa de calor: color y label
  // derivados del % de aprobación en lugar del estado binario. Se aplica
  // solo a semestres proyectados (KanbanAlumno controla la propagación).
  probAprobar?: number;
  onClick?: () => void;
}) {
  const heat = typeof probAprobar === 'number' ? heatmapStyles(probAprobar) : null;
  const styles = heat ?? estadoStyles(curso.estado);
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      data-kanban-node={nodeKey}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      className={[
        'w-full text-left rounded-md p-2 border-l-4 shadow-sm transition-all',
        styles.bg,
        styles.border,
        onClick ? 'hover:shadow-md cursor-pointer hover:translate-x-0.5' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`font-mono font-bold text-xs ${styles.text}`}>{curso.sigla}</span>
        <span className="text-[10px] font-semibold text-slate-500 shrink-0">
          {curso.creditos} cr
        </span>
      </div>
      {heat ? (
        <div className="flex items-baseline justify-between mt-1">
          <span className={`text-[10px] uppercase tracking-wide font-semibold ${styles.tag}`}>
            P. aprobar
          </span>
          <span className={`text-sm font-black tabular-nums ${styles.text}`}>
            {(probAprobar! * 100).toFixed(0)}%
          </span>
        </div>
      ) : (
        <div className="flex items-baseline justify-between mt-1">
          <span className={`text-[10px] uppercase tracking-wide font-semibold ${styles.tag}`}>
            {estadoLabel(curso.estado)}
          </span>
          {(curso.nota ?? 0) > 0 && (
            <span className={`text-sm font-black tabular-nums ${styles.text}`}>
              {(curso.nota ?? 0).toFixed(1)}
            </span>
          )}
        </div>
      )}
      {curso.categoria && curso.categoria !== 'obligatoria' && (
        <div className="mt-1 text-[9px] uppercase tracking-wide text-slate-500 font-semibold">
          {curso.categoria}
        </div>
      )}
    </Tag>
  );
}

// heatmapStyles devuelve los colores de la card según el % de
// aprobación. Cuatro tramos: verde (≥70), amarillo (50-70), naranja
// (30-50), rojo (<30). El gradiente comunica de un vistazo qué ramos
// proyectados son "seguros" vs "riesgosos".
function heatmapStyles(prob: number): {
  bg: string;
  border: string;
  text: string;
  tag: string;
} {
  const p = Math.max(0, Math.min(1, prob));
  if (p >= 0.7) {
    return {
      bg: 'bg-emerald-50',
      border: 'border-emerald-500',
      text: 'text-emerald-900',
      tag: 'text-emerald-700',
    };
  }
  if (p >= 0.5) {
    return {
      bg: 'bg-yellow-50',
      border: 'border-yellow-500',
      text: 'text-yellow-900',
      tag: 'text-yellow-700',
    };
  }
  if (p >= 0.3) {
    return {
      bg: 'bg-orange-50',
      border: 'border-orange-500',
      text: 'text-orange-900',
      tag: 'text-orange-700',
    };
  }
  return {
    bg: 'bg-red-50',
    border: 'border-red-600',
    text: 'text-red-900',
    tag: 'text-red-700',
  };
}

function estadoStyles(estado: EstadoSubject): {
  bg: string;
  border: string;
  text: string;
  tag: string;
} {
  switch (estado) {
    case 'aprobado':
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-500',
        text: 'text-emerald-900',
        tag: 'text-emerald-700',
      };
    case 'reprobado':
      return {
        bg: 'bg-red-50',
        border: 'border-red-500',
        text: 'text-red-900',
        tag: 'text-red-700',
      };
    case 'en_curso':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-400',
        text: 'text-blue-900',
        tag: 'text-blue-700',
      };
    case 'abandonado':
      return {
        bg: 'bg-slate-100',
        border: 'border-slate-400',
        text: 'text-slate-700',
        tag: 'text-slate-500',
      };
    default:
      // Estado fuera del union (p.ej. JSON importado con datos crudos):
      // estilo neutro en lugar de devolver undefined y reventar.
      return {
        bg: 'bg-slate-100',
        border: 'border-slate-300',
        text: 'text-slate-700',
        tag: 'text-slate-500',
      };
  }
}

function estadoLabel(estado: EstadoSubject): string {
  switch (estado) {
    case 'aprobado':
      return 'Aprobado';
    case 'reprobado':
      return 'Reprobado';
    case 'en_curso':
      return 'En curso';
    case 'abandonado':
      return 'Abandonado';
    default:
      return String(estado || 'Desconocido');
  }
}
