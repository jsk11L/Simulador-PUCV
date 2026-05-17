import type { EstadoSubject, SemesterRecord, StudentHistory, SubjectRecord } from '../types';

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
}

export default function KanbanAlumno({
  alumno,
  onClickRamo,
  alumnoLabel,
  sublabel,
  proyectadoDesdeIdx,
}: Props) {
  const semestres = alumno.semestres ?? [];
  const totalCursos = semestres.reduce((sum, s) => sum + (s.cursos?.length ?? 0), 0);

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
        <div className="flex items-center gap-4 mb-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300"></span>
            <span className="text-slate-600">Historial real</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-violet-50 border border-dashed border-violet-400"></span>
            <span className="text-slate-600">Proyección Montecarlo</span>
          </span>
        </div>
      )}
      <div className="overflow-x-auto -mx-1 pb-2">
        <div className="flex gap-3 px-1 min-w-min">
          {semestres.map((sem, semIdx) => {
            const proyectado =
              proyectadoDesdeIdx !== undefined && semIdx >= proyectadoDesdeIdx;
            return (
              <SemesterColumn
                key={`${sem.periodo}-${semIdx}`}
                sem={sem}
                proyectado={proyectado}
                onClickRamo={onClickRamo ? (c, i) => onClickRamo(sem, c, i) : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SemesterColumn({
  sem,
  proyectado,
  onClickRamo,
}: {
  sem: SemesterRecord;
  proyectado?: boolean;
  onClickRamo?: (curso: SubjectRecord, idx: number) => void;
}) {
  const cursos = sem.cursos ?? [];
  const creditosAprob = cursos
    .filter((c) => c.estado === 'aprobado')
    .reduce((sum, c) => sum + c.creditos, 0);
  const creditosInscritos = cursos.reduce((sum, c) => sum + c.creditos, 0);
  const ratio = creditosInscritos > 0 ? (creditosAprob / creditosInscritos) : 0;

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
              <span className={ratio === 1 ? 'text-emerald-600 font-semibold' : ratio < 0.5 ? 'text-red-600' : ''}>
                {creditosAprob}/{creditosInscritos} cr
              </span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {cursos.map((c, idx) => (
          <CursoCard
            key={`${c.sigla}-${idx}`}
            curso={c}
            onClick={onClickRamo ? () => onClickRamo(c, idx) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function CursoCard({
  curso,
  onClick,
}: {
  curso: SubjectRecord;
  onClick?: () => void;
}) {
  const styles = estadoStyles(curso.estado);
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
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
      {curso.categoria && curso.categoria !== 'obligatoria' && (
        <div className="mt-1 text-[9px] uppercase tracking-wide text-slate-500 font-semibold">
          {curso.categoria}
        </div>
      )}
    </Tag>
  );
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
  }
}
