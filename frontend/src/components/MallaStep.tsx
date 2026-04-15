import { FileSpreadsheet, FilePlus, Copy, Search, LayoutGrid, Trash2, X, Save, Settings } from 'lucide-react';
import { useState, type RefObject, type WheelEventHandler } from 'react';
import type { Asignatura, ModeloCalificaciones, VariablesSimulacion } from '../types';
import { ICE_PAPER_BASE_TEMPLATE } from '../constants/icePaperBaseTemplate';
import KanbanTopControls from './KanbanTopControls';
import KanbanBottomCta from './KanbanBottomCta';
import KanbanAddSemesterCard from './KanbanAddSemesterCard';

type PaperScenarioId =
  | 'caso_actual'
  | 'ci'
  | 'ci2'
  | 'pe'
  | 'cas'
  | 'nop6'
  | 'r_10'
  | 'r_mas_10'
  | 'r_10_mat'
  | 'r_10_gt_40'
  | 'sin_req_mat117'
  | 'sin_req_fis334'
  | 'r_10_eie252_459'
  | 'cuatro_as'
  | 'pf';

interface PaperScenarioPreset {
  id: PaperScenarioId;
  label: string;
  summary: string;
}

const MATH_SUBJECT_IDS = new Set(['115', '116', '117', '133', '215']);
const FOUR_AS_IDS = new Set(['252', '351', '446', '415']);

const PAPER_SCENARIOS: PaperScenarioPreset[] = [
  { id: 'caso_actual', label: 'Base histórica del plan DRA 92/93', summary: 'Malla original con tasas de reprobación históricas y programación base de docencia.' },
  { id: 'ci', label: 'Escenario ideal de aprobación total', summary: 'Fuerza reprobación 0% en todas las asignaturas para validar techo teórico del modelo.' },
  { id: 'ci2', label: 'Ideal con carga máxima extendida', summary: 'Igual que el ideal, pero sube NCSmax de 21 a 25 créditos por semestre.' },
  { id: 'pe', label: 'Dictación estricta según paridad de malla', summary: 'Aproximación operativa: deja la oferta como anual para simular mayor rigidez de programación.' },
  { id: 'cas', label: 'Oferta semestral completa', summary: 'Convierte todas las asignaturas a dictación semestral (ambos semestres).' },
  { id: 'nop6', label: 'Mayor tolerancia de reprobaciones', summary: 'Mantiene la malla base y fija Opor en 6 oportunidades máximas.' },
  { id: 'r_10', label: 'Mejora global en aprobación', summary: 'Reduce en 10% la reprobación de todas las asignaturas de la malla.' },
  { id: 'r_mas_10', label: 'Deterioro global en aprobación', summary: 'Aumenta en 10% la reprobación de todas las asignaturas de la malla.' },
  { id: 'r_10_mat', label: 'Mejora focalizada en matemáticas', summary: 'Reduce en 10% la reprobación solo en ramos matemáticos base.' },
  { id: 'r_10_gt_40', label: 'Mejora en ramos críticos', summary: 'Reduce en 10% la reprobación de asignaturas con tasa superior al 40%.' },
  { id: 'sin_req_mat117', label: 'Desbloqueo curricular en MAT117', summary: 'Elimina prerrequisitos de MAT117 para probar su efecto en flujo de avance.' },
  { id: 'sin_req_fis334', label: 'Desbloqueo curricular en FIS334', summary: 'Elimina prerrequisitos de FIS334 para medir sensibilidad del cuello de botella.' },
  { id: 'r_10_eie252_459', label: 'Intervención puntual en EIE252 y EIE459', summary: 'Reduce en 10% la reprobación solo en esas dos asignaturas objetivo.' },
  { id: 'cuatro_as', label: 'Ajuste de dictación en 4 asignaturas', summary: 'Pasa EIE252, EIE351, EIE446 e ICA415 a dictación semestral.' },
  { id: 'pf', label: 'Propuesta final compuesta del paper', summary: 'Combina mejora en ramos críticos, 4AS y aumento de NCSmax a 25 créditos.' },
];

interface MallaStepProps {
  mallaSetupMode: string | null;
  malla: Asignatura[];
  totalSemestres: number;
  nombreMalla: string;
  estadoGuardado: 'SIN GUARDAR' | 'GUARDADO';
  selectedSubject: Asignatura | null;
  drawerSubject: Asignatura | null;
  mallaErrorMsg: string;
  variables: VariablesSimulacion;
  modeloCalif: ModeloCalificaciones;
  minSemestres: number;
  maxSemestres: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  kanbanScrollRef: RefObject<HTMLDivElement | null>;
  setters: {
    setMallaSetupMode: (mode: string | null) => void;
    setMalla: (malla: Asignatura[]) => void;
    setTotalSemestres: (semestres: number) => void;
    setCurrentMallaId: (id: string | null) => void;
    setNombreMalla: (nombre: string) => void;
    setEstadoGuardado: (estado: 'SIN GUARDAR' | 'GUARDADO') => void;
    setShowMallasGuardadasModal: (show: boolean) => void;
    setSelectedSubject: (subject: Asignatura | null) => void;
    setDrawerSubject: (subject: Asignatura | null) => void;
    setVariables: (updater: VariablesSimulacion | ((prev: VariablesSimulacion) => VariablesSimulacion)) => void;
    setModeloCalif: (updater: ModeloCalificaciones | ((prev: ModeloCalificaciones) => ModeloCalificaciones)) => void;
  };
  actions: {
    handleGuardarMallaClick: () => void;
    handleImportCSV: () => void;
    processCSVFile: (file: File) => void;
    scrollKanban: (direction: 'left' | 'right') => void;
    handleKanbanWheel: WheelEventHandler<HTMLDivElement>;
    handleRemoveSemestre: (semToRemove: number) => void;
    handleAddAsignatura: (sem: number) => void;
    openDrawer: (asig: Asignatura) => void;
    handleAddReq: () => void;
    handleDrawerReqChange: (index: number, value: string) => void;
    handleRemoveReq: (index: number) => void;
    handleDeleteAsignatura: () => void;
    handleSaveDrawer: () => void;
    handleAddSemestre: () => void;
    validateIntegrityAndNext: () => void;
  };
}

export default function MallaStep({
  mallaSetupMode,
  malla,
  totalSemestres,
  nombreMalla,
  estadoGuardado,
  selectedSubject,
  drawerSubject,
  mallaErrorMsg,
  variables,
  modeloCalif,
  minSemestres,
  maxSemestres,
  fileInputRef,
  kanbanScrollRef,
  setters,
  actions,
}: MallaStepProps) {
  const {
    setMallaSetupMode,
    setMalla,
    setTotalSemestres,
    setCurrentMallaId,
    setNombreMalla,
    setEstadoGuardado,
    setShowMallasGuardadasModal,
    setSelectedSubject,
    setDrawerSubject,
    setVariables,
    setModeloCalif,
  } = setters;

  const {
    handleGuardarMallaClick,
    handleImportCSV,
    processCSVFile,
    scrollKanban,
    handleKanbanWheel,
    handleRemoveSemestre,
    handleAddAsignatura,
    openDrawer,
    handleAddReq,
    handleDrawerReqChange,
    handleRemoveReq,
    handleDeleteAsignatura,
    handleSaveDrawer,
    handleAddSemestre,
    validateIntegrityAndNext,
  } = actions;

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [expandedCareer, setExpandedCareer] = useState<string | null>(null);

  const cloneBaseMalla = () => ICE_PAPER_BASE_TEMPLATE.map((a) => ({ ...a, reqs: [...a.reqs] }));

  const scaleFailRate = (value: number, factor: number) => Math.max(0, Math.min(1, Number((value * factor).toFixed(4))));

  const applyPaperScenario = (scenarioId: PaperScenarioId) => {
    let template = cloneBaseMalla();
    let ncsmaxOverride: number | null = null;
    let oporOverride: number | null = null;

    switch (scenarioId) {
      case 'ci':
      case 'ci2':
        template = template.map((a) => ({ ...a, rep: 0 }));
        if (scenarioId === 'ci2') ncsmaxOverride = 25;
        break;
      case 'pe':
        template = template.map((a) => ({ ...a, dictacion: 'anual' }));
        break;
      case 'cas':
        template = template.map((a) => ({ ...a, dictacion: 'semestral' }));
        break;
      case 'nop6':
        oporOverride = 6;
        break;
      case 'r_10':
        template = template.map((a) => ({ ...a, rep: scaleFailRate(a.rep, 0.9) }));
        break;
      case 'r_mas_10':
        template = template.map((a) => ({ ...a, rep: scaleFailRate(a.rep, 1.1) }));
        break;
      case 'r_10_mat':
        template = template.map((a) => ({ ...a, rep: MATH_SUBJECT_IDS.has(a.id) ? scaleFailRate(a.rep, 0.9) : a.rep }));
        break;
      case 'r_10_gt_40':
        template = template.map((a) => ({ ...a, rep: a.rep > 0.4 ? scaleFailRate(a.rep, 0.9) : a.rep }));
        break;
      case 'sin_req_mat117':
        template = template.map((a) => ({ ...a, reqs: a.id === '117' ? [] : a.reqs }));
        break;
      case 'sin_req_fis334':
        template = template.map((a) => ({ ...a, reqs: a.id === '334' ? [] : a.reqs }));
        break;
      case 'r_10_eie252_459':
        template = template.map((a) => ({ ...a, rep: a.id === '252' || a.id === '459' ? scaleFailRate(a.rep, 0.9) : a.rep }));
        break;
      case 'cuatro_as':
        template = template.map((a) => ({ ...a, dictacion: FOUR_AS_IDS.has(a.id) ? 'semestral' : a.dictacion }));
        break;
      case 'pf':
        template = template.map((a) => {
          const withReprob = a.rep > 0.4 ? scaleFailRate(a.rep, 0.9) : a.rep;
          return {
            ...a,
            rep: withReprob,
            dictacion: FOUR_AS_IDS.has(a.id) ? 'semestral' : a.dictacion,
          };
        });
        ncsmaxOverride = 25;
        break;
      case 'caso_actual':
      default:
        break;
    }

    if (ncsmaxOverride !== null || oporOverride !== null) {
      setVariables((prev) => ({
        ...prev,
        ...(ncsmaxOverride !== null ? { ncsmax: ncsmaxOverride } : {}),
        ...(oporOverride !== null ? { opor: oporOverride } : {}),
      }));
    }

    const selectedScenario = PAPER_SCENARIOS.find((s) => s.id === scenarioId);

    setMalla(template);
    setTotalSemestres(12);
    setNombreMalla(`ICE DRA 92/93 - ${selectedScenario?.label || scenarioId}`);
    setCurrentMallaId(null);
    setEstadoGuardado('SIN GUARDAR');
    setMallaSetupMode(`paper_${scenarioId}`);
    setShowTemplatesModal(false);
  };

  const updateVariable = (key: keyof VariablesSimulacion, value: string) => {
    const parsedValue = Number(value);
    if (Number.isNaN(parsedValue)) return;
    setVariables((prev) => ({ ...prev, [key]: parsedValue }));
  };

  const updateModelo = (key: keyof ModeloCalificaciones, value: string) => {
    const parsedValue = Number(value);
    if (Number.isNaN(parsedValue)) return;
    setModeloCalif((prev) => ({ ...prev, [key]: parsedValue }));
  };

  if (!mallaSetupMode) {
    return (
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
        <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
          <div className="bg-slate-900 p-6 text-center">
            <h2 className="text-2xl font-bold text-white">¿Cómo quieres empezar tu Malla?</h2>
            <p className="text-slate-400 mt-2 text-sm">Elige el punto de partida para configurar las asignaturas.</p>
          </div>
          <div className="p-8 grid grid-cols-2 gap-6">
            <button onClick={() => setShowTemplatesModal(true)} className="flex flex-col items-center text-center p-6 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4"><Copy size={28} className="text-blue-600" /></div>
              <h3 className="font-bold text-slate-800 text-lg">Plantillas</h3>
            </button>
            <button onClick={handleImportCSV} className="flex flex-col items-center text-center p-6 border-2 border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><FileSpreadsheet size={28} className="text-green-600" /></div>
              <h3 className="font-bold text-slate-800 text-lg">Importar archivo CSV</h3>
              <p className="text-xs text-slate-500 mt-1">Columnas: ID, Semestre, Créditos, Rep, Prereqs, Dictación</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processCSVFile(file);
                e.target.value = '';
              }} />
            </button>
            <button onClick={() => setShowMallasGuardadasModal(true)} className="flex flex-col items-center text-center p-6 border-2 border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4"><Search size={28} className="text-purple-600" /></div>
              <h3 className="font-bold text-slate-800 text-lg">Malla Guardada</h3>
            </button>
            <button onClick={() => {setMallaSetupMode('blanco'); setMalla([]); setTotalSemestres(minSemestres); setCurrentMallaId(null);}} className="flex flex-col items-center text-center p-6 border-2 border-slate-200 rounded-xl hover:border-slate-800 hover:bg-slate-100 transition-all group">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4"><FilePlus size={28} className="text-slate-700" /></div>
              <h3 className="font-bold text-slate-800 text-lg">Hoja en Blanco</h3>
            </button>
          </div>
        </div>

        {showTemplatesModal && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white w-[min(960px,96vw)] h-[min(780px,92vh)] rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">Plantillas por Carrera</h3>
                <button onClick={() => setShowTemplatesModal(false)} className="text-slate-300 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                <button
                  onClick={() => setExpandedCareer((prev) => (prev === 'ice' ? null : 'ice'))}
                  className="w-full text-left border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded border border-slate-300 bg-white text-slate-900 text-xs font-bold inline-flex items-center justify-center">
                      {expandedCareer === 'ice' ? '▼' : '▶'}
                    </span>
                    <span className="font-bold text-slate-900">Ingeniería Civil Eléctrica</span>
                  </div>
                </button>

                {expandedCareer === 'ice' && (
                  <div className="ml-6 border-l-2 border-slate-200 pl-4 space-y-3">
                    {PAPER_SCENARIOS.map((scenario) => (
                      <button
                        key={scenario.id}
                        onClick={() => applyPaperScenario(scenario.id)}
                        className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-semibold text-sm text-slate-800">{scenario.label}</div>
                        <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{scenario.summary}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in relative min-h-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 z-10 relative">
        <div className="flex items-center gap-3 min-w-0">
          <LayoutGrid size={20} className="text-blue-600" />
          <input
            type="text"
            value={nombreMalla}
            onChange={(e) => {setNombreMalla(e.target.value); setEstadoGuardado('SIN GUARDAR');}}
            className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors min-w-0 w-full sm:w-auto"
          />
          <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ml-2 border ${estadoGuardado === 'GUARDADO' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
            {estadoGuardado}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowConfigModal(true)}
            className="text-sm font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-200 transition-colors flex items-center gap-2"
            title="Configuración global"
          >
            <Settings size={16} /> Configuración
          </button>
          <button onClick={handleGuardarMallaClick} className="text-sm font-semibold text-white bg-slate-800 px-4 py-1.5 rounded hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-sm">
            <Save size={16}/> Guardar Malla
          </button>
          <button onClick={() => setMallaSetupMode(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors underline">
            Cambiar método de inicio
          </button>
        </div>
      </div>

      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-3xl w-full rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg">Configuración Global de Simulación</h3>
                <p className="text-slate-300 text-xs mt-1">Los cambios se guardan automáticamente y quedan persistidos para futuras simulaciones.</p>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-300 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h4 className="font-bold text-slate-800 mb-4">Variables de Simulación</h4>
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase">NE</label>
                  <input type="number" value={variables.ne} onChange={(e) => updateVariable('ne', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />

                  <label className="block text-xs font-bold text-slate-500 uppercase">NCSmax</label>
                  <input type="number" value={variables.ncsmax} onChange={(e) => updateVariable('ncsmax', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />

                  <label className="block text-xs font-bold text-slate-500 uppercase">TAmin</label>
                  <input type="number" step="0.1" value={variables.tamin} onChange={(e) => updateVariable('tamin', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />

                  <label className="block text-xs font-bold text-slate-500 uppercase">NapTAmin</label>
                  <input type="number" value={variables.naptamin} onChange={(e) => updateVariable('naptamin', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />

                  <label className="block text-xs font-bold text-slate-500 uppercase">Opor</label>
                  <input type="number" value={variables.opor} onChange={(e) => updateVariable('opor', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                </div>
              </section>

              <section className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h4 className="font-bold text-slate-800 mb-4">Modelo de Calificaciones</h4>
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase">VMap1234</label>
                  <input type="number" step="0.01" value={modeloCalif.vmap1234} onChange={(e) => updateModelo('vmap1234', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />

                  <label className="block text-xs font-bold text-slate-500 uppercase">Delta1234</label>
                  <input type="number" step="0.01" value={modeloCalif.delta1234} onChange={(e) => updateModelo('delta1234', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />

                  <label className="block text-xs font-bold text-slate-500 uppercase">VMap5678</label>
                  <input type="number" step="0.01" value={modeloCalif.vmap5678} onChange={(e) => updateModelo('vmap5678', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />

                  <label className="block text-xs font-bold text-slate-500 uppercase">Delta5678</label>
                  <input type="number" step="0.01" value={modeloCalif.delta5678} onChange={(e) => updateModelo('delta5678', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />

                  <label className="block text-xs font-bold text-slate-500 uppercase">VMapM</label>
                  <input type="number" step="0.01" value={modeloCalif.vmapm} onChange={(e) => updateModelo('vmapm', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />

                  <label className="block text-xs font-bold text-slate-500 uppercase">DeltaM</label>
                  <input type="number" step="0.01" value={modeloCalif.deltam} onChange={(e) => updateModelo('deltam', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                </div>
              </section>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onClick={() => setShowConfigModal(false)} className="bg-slate-800 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-slate-700 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <KanbanTopControls onScrollLeft={() => scrollKanban('left')} onScrollRight={() => scrollKanban('right')} />

      <div className="flex-1 flex min-h-0 relative">
        <div
          ref={kanbanScrollRef}
          onWheel={handleKanbanWheel}
          className={`flex gap-3 overflow-x-auto overflow-y-auto overscroll-x-contain touch-pan-x flex-1 min-h-72 max-h-[48vh] sm:max-h-[52vh] pb-4 pr-1 transition-all duration-300 snap-x snap-mandatory ${selectedSubject ? 'sm:pr-90' : ''}`}
        >
          {Array.from({ length: totalSemestres }).map((_, i) => {
            const sem = i + 1;
            const ramosDelSemestre = malla.filter(a => a.semestre === sem);
            const canAdd = ramosDelSemestre.length < 10;

            return (
              <div key={sem} className="min-w-60 max-w-60 sm:min-w-62.5 sm:max-w-62.5 bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-col shrink-0 relative snap-start self-start">
                {sem === totalSemestres && sem > minSemestres && (
                  <button onClick={() => handleRemoveSemestre(sem)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors" title="Eliminar Semestre">
                    <Trash2 size={16}/>
                  </button>
                )}
                <h4 className="text-center font-bold text-slate-500 mb-4 text-xs uppercase tracking-wider">Semestre {sem}</h4>
                <div className="space-y-3 pr-1 flex-1">
                  {ramosDelSemestre.map((asig) => (
                    <div key={asig.id} onClick={() => openDrawer(asig)} className={`bg-white p-3 rounded-lg border-2 shadow-sm transition-colors cursor-pointer group ${selectedSubject?.id === asig.id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-slate-300'}`}>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                        <div className="font-black text-slate-800 text-lg group-hover:text-blue-700">{asig.id}</div>
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">{asig.cred} CR</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Reprobación:</span>
                        <span className={`font-bold ${asig.rep >= 0.5 ? 'text-red-500' : 'text-amber-500'}`}>{asig.rep}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span className="text-slate-500 font-medium">Dictación:</span>
                        <span className="font-bold text-blue-600 capitalize">{asig.dictacion || 'N/A'}</span>
                      </div>
                      {asig.reqs.filter(r => r.trim() !== '').length > 0 && (
                        <div className="mt-2 text-[10px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 p-1.5 rounded truncate">
                          REQS: {asig.reqs.filter(r => r.trim() !== '').join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                  {canAdd && (
                    <button onClick={() => handleAddAsignatura(sem)} className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm font-bold text-slate-400 hover:bg-white hover:text-blue-600 hover:border-blue-300 transition-all flex items-center justify-center gap-1">
                      <FilePlus size={14} /> Añadir Asignatura
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <KanbanAddSemesterCard totalSemestres={totalSemestres} maxSemestres={maxSemestres} onAddSemestre={handleAddSemestre} />
        </div>

        {selectedSubject && drawerSubject && (
          <div className="fixed inset-0 sm:absolute sm:inset-auto sm:right-0 sm:top-0 sm:bottom-0 w-full sm:w-90 bg-white border border-slate-200 shadow-[0_0_40px_rgba(0,0,0,0.1)] rounded-none sm:rounded-xl flex flex-col z-30 animate-in slide-in-from-right-8 sm:mb-4">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center rounded-t-xl shrink-0">
              <div className="flex-1 mr-4">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Editar Asignatura</span>
                <input
                  type="text"
                  value={drawerSubject.id}
                  onChange={(e) => setDrawerSubject({...drawerSubject, id: e.target.value.toUpperCase()})}
                  className="font-bold text-xl mt-0.5 bg-transparent border-b border-slate-600 focus:border-white focus:outline-none w-full uppercase"
                />
              </div>
              <button onClick={() => setSelectedSubject(null)} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {mallaErrorMsg && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded border border-red-200">{mallaErrorMsg}</div>}

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dictación (OBLIGATORIO)</label>
                <div className="flex gap-2 mt-1.5">
                  {['anual', 'semestral'].map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setDrawerSubject({...drawerSubject, dictacion: tipo as 'anual' | 'semestral'})}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize border transition-colors ${drawerSubject.dictacion === tipo ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Créditos</label>
                  <input type="number" value={drawerSubject.cred} onChange={(e) => setDrawerSubject({...drawerSubject, cred: Number(e.target.value)})} className="w-full mt-1.5 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa Reprob.</label>
                  <input type="number" step="0.01" value={drawerSubject.rep} onChange={(e) => setDrawerSubject({...drawerSubject, rep: Number(e.target.value)})} className="w-full mt-1.5 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prerrequisitos (OPCIONAL)</label>
                  <button onClick={handleAddReq} className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 font-bold px-2 py-1 rounded hover:bg-blue-100">+ Añadir</button>
                </div>
                {drawerSubject.reqs.length === 0 ? (
                  <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">Sin requisitos previos</div>
                ) : (
                  <div className="space-y-2">
                    {drawerSubject.reqs.map((req, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-xs font-bold text-slate-400 w-10">REQ{idx+1}</span>
                        <input
                          type="text"
                          value={req}
                          onChange={(e) => handleDrawerReqChange(idx, e.target.value.toUpperCase())}
                          placeholder="SIGLA"
                          className="flex-1 bg-transparent border-b border-slate-300 focus:border-blue-500 focus:outline-none text-sm font-bold text-slate-700 uppercase"
                        />
                        <button onClick={() => handleRemoveReq(idx)} className="text-slate-400 hover:text-red-500 ml-2"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 rounded-b-xl shrink-0">
              <button onClick={handleDeleteAsignatura} className="p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="Eliminar Asignatura"><Trash2 size={20}/></button>
              <button onClick={handleSaveDrawer} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-700 transition-colors shadow-md">Guardar Propiedades</button>
            </div>
          </div>
        )}
      </div>

      <KanbanBottomCta onContinue={validateIntegrityAndNext} />
    </div>
  );
}
