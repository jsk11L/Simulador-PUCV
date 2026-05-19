import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, FileUp, Loader2, Plus, Trash2, X } from 'lucide-react';
import useStudentApi, { type MallaCustomOverride } from '../hooks/useStudentApi';
import ScenarioSelector, { type ScenarioSelection } from './ScenarioSelector';
import { parseImported } from '../lib/studentImport';
import type {
  Asignatura,
  EstadoSubject,
  MallaGuardada,
  SemesterRecord,
  StudentHistory,
  SubjectRecord,
} from '../types';

// ==========================================
// FLUJO MANUAL: configurar un alumno con kanban interactivo
// ==========================================
// El usuario empieza con un kanban de la malla seleccionada (todos los
// ramos visibles, sin "tomar"). Para cada ramo puede:
//   1. Click → modal: estado (aprobado/reprobado) + nota + período
//   2. El alumno se construye en memoria como un StudentHistory
//   3. Botón "Aplicar este alumno" envía al padre para mostrar/proyectar.
//
// Carga de CSV PUCV real: placeholder visible. El parser ya existe en
// backend; falta solo la UI de upload + endpoint de parseo, que viene
// cuando se conecte la API real de la universidad.

interface Props {
  apiUrl: (path: string) => string;
  escenario: string;
  mallaOverride: MallaCustomOverride | null;
  mallasGuardadas: MallaGuardada[];
  onSelectScenario: (s: ScenarioSelection) => void;
  onAlumnoListo: (alumno: StudentHistory) => void;
  standalone?: boolean;
}

interface RamoEditState {
  asig: Asignatura;
  // Si el ramo ya estaba registrado, valor actual para editar; null = agregar nuevo
  existente: { semestreIdx: number; cursoIdx: number; curso: SubjectRecord } | null;
}

export default function FlujoManualAlumno({
  apiUrl,
  escenario,
  mallaOverride,
  mallasGuardadas,
  onSelectScenario,
  onAlumnoListo,
  standalone = false,
}: Props) {
  const api = useStudentApi({ apiUrl });

  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [loadingMalla, setLoadingMalla] = useState(false);
  const [errorMalla, setErrorMalla] = useState<string>('');

  // El alumno en construcción.
  const [alumno, setAlumno] = useState<StudentHistory>(() => ({
    rut: 'MAN-001',
    semestres: [],
    estado: 'activa',
  }));

  // Modal de edición de un ramo.
  const [editando, setEditando] = useState<RamoEditState | null>(null);

  // Año base para inferir períodos (ej. S1-2024).
  const [anioBase, setAnioBase] = useState<number>(2024);

  // Upload de archivo.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importError, setImportError] = useState<string>('');

  // Cargar la malla cuando cambia el escenario.
  useEffect(() => {
    setErrorMalla('');
    if (mallaOverride?.asignaturas) {
      setAsignaturas(mallaOverride.asignaturas);
      return;
    }
    if (!escenario) return;
    setLoadingMalla(true);
    api.fetchScenario(escenario)
      .then((sc) => setAsignaturas(sc.asignaturas))
      .catch((e) => setErrorMalla((e as Error).message))
      .finally(() => setLoadingMalla(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escenario, mallaOverride?.asignaturas]);

  // Helper: buscar si un ramo ya está registrado en el alumno.
  const buscarRamoEnAlumno = (sigla: string) => {
    for (let i = 0; i < alumno.semestres.length; i++) {
      const sem = alumno.semestres[i];
      const cursoIdx = (sem.cursos ?? []).findIndex((c) => c.sigla === sigla);
      if (cursoIdx >= 0) {
        return { semestreIdx: i, cursoIdx, curso: sem.cursos![cursoIdx] };
      }
    }
    return null;
  };

  const handleClickRamoMalla = (asig: Asignatura) => {
    const existente = buscarRamoEnAlumno(asig.id);
    setEditando({ asig, existente });
  };

  const handleGuardarRamo = (datos: {
    estado: EstadoSubject;
    nota: number;
    periodo: string;
  }) => {
    if (!editando) return;
    const { asig, existente } = editando;
    const nuevoCurso: SubjectRecord = {
      sigla: asig.id,
      creditos: asig.cred,
      nota: datos.nota,
      estado: datos.estado,
      categoria: 'obligatoria',
    };

    setAlumno((prev) => {
      const semestres = JSON.parse(JSON.stringify(prev.semestres ?? [])) as SemesterRecord[];

      // Si ya existe, quitarlo de su semestre actual.
      if (existente) {
        semestres[existente.semestreIdx].cursos = semestres[existente.semestreIdx].cursos.filter(
          (_, i) => i !== existente.cursoIdx,
        );
        // Si el semestre queda vacío, removerlo
        if (semestres[existente.semestreIdx].cursos.length === 0) {
          semestres.splice(existente.semestreIdx, 1);
        }
      }

      // Encontrar o crear el semestre con el período indicado.
      let semIdx = semestres.findIndex((s) => s.periodo === datos.periodo);
      if (semIdx < 0) {
        const { anio, semestre } = parsePeriodo(datos.periodo);
        semestres.push({
          periodo: datos.periodo,
          anio,
          semestre,
          cursos: [],
        });
        // Re-ordenar cronológicamente
        semestres.sort((a, b) => {
          if (a.anio !== b.anio) return a.anio - b.anio;
          return a.semestre - b.semestre;
        });
        semIdx = semestres.findIndex((s) => s.periodo === datos.periodo);
      }

      semestres[semIdx].cursos = [...(semestres[semIdx].cursos ?? []), nuevoCurso];

      return { ...prev, semestres };
    });
    setEditando(null);
  };

  const handleQuitarRamo = () => {
    if (!editando?.existente) return;
    const { semestreIdx, cursoIdx } = editando.existente;
    setAlumno((prev) => {
      const semestres = JSON.parse(JSON.stringify(prev.semestres ?? [])) as SemesterRecord[];
      semestres[semestreIdx].cursos = semestres[semestreIdx].cursos.filter((_, i) => i !== cursoIdx);
      if (semestres[semestreIdx].cursos.length === 0) {
        semestres.splice(semestreIdx, 1);
      }
      return { ...prev, semestres };
    });
    setEditando(null);
  };

  const handleAplicar = () => {
    if (alumno.semestres.length === 0) return;
    onAlumnoListo(alumno);
  };

  const handleReset = () => {
    setAlumno({ rut: 'MAN-001', semestres: [], estado: 'activa' });
    setImportWarnings([]);
    setImportError('');
  };

  const handleCargarArchivo = async (file: File) => {
    setImportError('');
    setImportWarnings([]);
    try {
      const text = await file.text();
      const { alumno: importado, warnings } = parseImported(text, file.name, asignaturas);
      setAlumno({
        ...importado,
        rut: alumno.rut, // conservar el ID que ya tenía
      });
      setImportWarnings(warnings);
    } catch (e) {
      setImportError((e as Error).message);
    }
    // Limpiar el input para permitir re-subir el mismo archivo.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Agrupar asignaturas por semestre teórico para el kanban.
  const asignaturasPorSemestre = useMemo(() => {
    const map = new Map<number, Asignatura[]>();
    for (const a of asignaturas) {
      const sem = a.semestre ?? 0;
      if (!map.has(sem)) map.set(sem, []);
      map.get(sem)!.push(a);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [asignaturas]);

  const totalCursados = alumno.semestres.reduce((sum, s) => sum + (s.cursos?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Activity size={18} className="text-blue-500" />
          Configuración manual del alumno
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <ScenarioSelector
            value={escenario}
            onSelect={onSelectScenario}
            mallasGuardadas={mallasGuardadas}
            label="Malla del alumno"
            hideFixedScenarios={standalone}
          />
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Año base</label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={anioBase}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (Number.isFinite(n)) setAnioBase(n);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              El primer semestre se etiqueta como S1-{anioBase}.
            </p>
          </div>
          <div className="flex items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCargarArchivo(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Cargar CSV o JSON con el historial del alumno"
              className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-blue-50 text-sm text-blue-700 font-semibold hover:bg-blue-100 flex items-center justify-center gap-2"
            >
              <FileUp size={14} /> Cargar CSV / JSON
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
          <strong>Cómo usar:</strong> haz click en un ramo del kanban de abajo para registrarlo
          en el historial del alumno. Marque el estado (aprobado/reprobado), la nota y el
          período en que lo cursó. Cuando termine, presione "Aplicar este alumno" para verlo
          completo y proyectar su futuro.
        </div>

        {errorMalla && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errorMalla}
          </div>
        )}

        {importError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <strong>Error al cargar archivo:</strong> {importError}
          </div>
        )}

        {importWarnings.length > 0 && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <strong className="block mb-1">
              Archivo cargado con {importWarnings.length}{' '}
              {importWarnings.length === 1 ? 'advertencia' : 'advertencias'}:
            </strong>
            <ul className="list-disc list-inside space-y-0.5">
              {importWarnings.slice(0, 8).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
              {importWarnings.length > 8 && (
                <li className="italic">... y {importWarnings.length - 8} más.</li>
              )}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">
            {totalCursados} {totalCursados === 1 ? 'ramo registrado' : 'ramos registrados'} en {alumno.semestres.length} {alumno.semestres.length === 1 ? 'semestre' : 'semestres'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={totalCursados === 0}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Trash2 size={12} /> Limpiar
            </button>
            <button
              type="button"
              onClick={handleAplicar}
              disabled={totalCursados === 0}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Plus size={12} /> Aplicar este alumno
            </button>
          </div>
        </div>

        {loadingMalla ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center">
            <Loader2 size={16} className="animate-spin" /> Cargando malla...
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1 pb-2">
            <div className="flex gap-3 px-1 min-w-min">
              {asignaturasPorSemestre.map(([semNominal, ramos]) => (
                <MallaSemColumn
                  key={semNominal}
                  semNominal={semNominal}
                  ramos={ramos}
                  alumno={alumno}
                  onClickRamo={handleClickRamoMalla}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {editando && (
        <RamoEditModal
          state={editando}
          anioBase={anioBase}
          onClose={() => setEditando(null)}
          onGuardar={handleGuardarRamo}
          onQuitar={editando.existente ? handleQuitarRamo : undefined}
        />
      )}
    </div>
  );
}

// ============================================
// Columna de la malla con ramos disponibles + cursados
// ============================================
function MallaSemColumn({
  semNominal,
  ramos,
  alumno,
  onClickRamo,
}: {
  semNominal: number;
  ramos: Asignatura[];
  alumno: StudentHistory;
  onClickRamo: (asig: Asignatura) => void;
}) {
  const indexByRamo = useMemo(() => {
    const map = new Map<string, SubjectRecord>();
    for (const sem of alumno.semestres ?? []) {
      for (const c of sem.cursos ?? []) {
        map.set(c.sigla, c);
      }
    }
    return map;
  }, [alumno]);

  return (
    <div className="bg-slate-100 rounded-lg p-3 min-w-[200px] max-w-[200px] shrink-0">
      <div className="mb-2 pb-2 border-b border-slate-300">
        <div className="text-xs font-bold text-slate-700">Semestre {semNominal}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{ramos.length} ramos</div>
      </div>

      <div className="space-y-2">
        {ramos.map((r) => {
          const cursado = indexByRamo.get(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onClickRamo(r)}
              className={[
                'w-full text-left rounded-md p-2 border-l-4 shadow-sm transition-all cursor-pointer text-xs',
                cursado ? estadoBg(cursado.estado) : 'bg-white border-slate-200 border-dashed text-slate-500 hover:bg-blue-50 hover:border-blue-300',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono font-bold">{r.id}</span>
                <span className="text-[10px] font-semibold opacity-70 shrink-0">{r.cred} cr</span>
              </div>
              {cursado ? (
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-[10px] uppercase tracking-wide font-semibold opacity-80">
                    {labelEstado(cursado.estado)}
                  </span>
                  {(cursado.nota ?? 0) > 0 && (
                    <span className="text-sm font-black tabular-nums">{(cursado.nota ?? 0).toFixed(1)}</span>
                  )}
                </div>
              ) : (
                <div className="text-[10px] mt-1 italic">click para registrar</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function estadoBg(estado: EstadoSubject): string {
  switch (estado) {
    case 'aprobado': return 'bg-emerald-50 border-emerald-500 text-emerald-900';
    case 'reprobado': return 'bg-red-50 border-red-500 text-red-900';
    case 'en_curso': return 'bg-blue-50 border-blue-400 text-blue-900';
    case 'abandonado': return 'bg-slate-100 border-slate-400 text-slate-700';
  }
}

function labelEstado(estado: EstadoSubject): string {
  switch (estado) {
    case 'aprobado': return 'Aprobado';
    case 'reprobado': return 'Reprobado';
    case 'en_curso': return 'En curso';
    case 'abandonado': return 'Abandonado';
  }
}

// ============================================
// Modal de edición de un ramo
// ============================================
function RamoEditModal({
  state,
  anioBase,
  onClose,
  onGuardar,
  onQuitar,
}: {
  state: RamoEditState;
  anioBase: number;
  onClose: () => void;
  onGuardar: (datos: { estado: EstadoSubject; nota: number; periodo: string }) => void;
  onQuitar?: () => void;
}) {
  const { asig, existente } = state;
  const previo = existente?.curso;

  // Manualmente solo se permiten aprobado/reprobado. Si el ramo venía de
  // un import con otro estado (en_curso/abandonado), forzamos a aprobado
  // como default — el usuario puede cambiarlo al editar.
  const [estado, setEstado] = useState<EstadoSubject>(() => {
    const e = previo?.estado;
    return e === 'reprobado' ? 'reprobado' : 'aprobado';
  });
  const [nota, setNota] = useState<number>(previo?.nota ?? (asig.semestre <= 4 ? 5.0 : 5.5));

  // Sugerir período: si el ramo es del sem nominal N, sugerir S1-{anioBase + (N-1)/2}.
  const periodoSugerido = useMemo(() => {
    if (previo) {
      // Conserva el período existente: lo encontramos buscando el semestre que tenía este curso.
      // El semestre del ramo previo se infiere desde el existente. Más simple: cuando el modal
      // se abre con un ramo existente, asumimos que el "periodo" puede mantenerse.
      // Aquí calculamos un default genérico.
    }
    const offset = Math.max(0, (asig.semestre - 1));
    const anio = anioBase + Math.floor(offset / 2);
    const semParidad = (offset % 2) + 1;
    return `S${semParidad}-${anio}`;
  }, [asig.semestre, anioBase, previo]);

  const [periodo, setPeriodo] = useState<string>(periodoSugerido);

  // Coherencia: si aprobado, nota >= 4.0; si reprobado, nota < 4.0
  const handleSave = () => {
    let n = nota;
    if (estado === 'aprobado' && n < 4.0) n = 4.0;
    if (estado === 'reprobado' && n >= 4.0) n = 3.9;
    if (estado === 'en_curso' || estado === 'abandonado') n = 0;
    onGuardar({ estado, nota: n, periodo });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 font-mono text-lg">{asig.id}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Semestre nominal {asig.semestre} · {asig.cred} créditos
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Estado</label>
            <div className="grid grid-cols-2 gap-2">
              {(['aprobado', 'reprobado'] as EstadoSubject[]).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEstado(e)}
                  className={[
                    'px-3 py-2 rounded-lg text-xs font-semibold transition-all border',
                    estado === e
                      ? estadoBg(e) + ' border-current'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {labelEstado(e)}
                </button>
              ))}
            </div>
          </div>

          {(estado === 'aprobado' || estado === 'reprobado') && (
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">
                Nota <span className="text-slate-400">(1.0 a 7.0)</span>
              </label>
              <input
                type="number"
                min={1}
                max={7}
                step={0.1}
                value={nota}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v)) setNota(Math.max(1, Math.min(7, v)));
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                {estado === 'aprobado'
                  ? 'Si es menor a 4.0 se ajustará automáticamente a 4.0.'
                  : 'Si es 4.0 o mayor se ajustará automáticamente a 3.9.'}
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Período cursado</label>
            <input
              type="text"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value.trim())}
              placeholder="S1-2024"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Formato: S1-AÑO o S2-AÑO. Ej: <code>S1-2024</code>, <code>S2-2025</code>.
            </p>
          </div>
        </div>

        <div className="flex justify-between gap-2 mt-6 pt-4 border-t border-slate-200">
          <div>
            {onQuitar && (
              <button
                type="button"
                onClick={onQuitar}
                className="text-xs px-3 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-1"
              >
                <Trash2 size={12} /> Quitar del historial
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!/^S[12]-\d{4}$/.test(periodo)}
              className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function parsePeriodo(periodo: string): { anio: number; semestre: number } {
  const m = /^S([12])-(\d{4})$/.exec(periodo);
  if (!m) return { anio: 2024, semestre: 1 };
  return { semestre: parseInt(m[1], 10), anio: parseInt(m[2], 10) };
}
