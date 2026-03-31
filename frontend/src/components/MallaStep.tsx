import { FileSpreadsheet, FilePlus, Copy, Search, LayoutGrid, Trash2, X, Save } from 'lucide-react';
import type { RefObject, WheelEventHandler } from 'react';
import type { Asignatura } from '../types';
import KanbanTopControls from './KanbanTopControls';
import KanbanBottomCta from './KanbanBottomCta';
import KanbanAddSemesterCard from './KanbanAddSemesterCard';

interface MallaStepProps {
  mallaSetupMode: string | null;
  malla: Asignatura[];
  totalSemestres: number;
  nombreMalla: string;
  estadoGuardado: 'SIN GUARDAR' | 'GUARDADO';
  selectedSubject: Asignatura | null;
  drawerSubject: Asignatura | null;
  mallaErrorMsg: string;
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

  if (!mallaSetupMode) {
    return (
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
        <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
          <div className="bg-slate-900 p-6 text-center">
            <h2 className="text-2xl font-bold text-white">¿Cómo quieres empezar tu Malla?</h2>
            <p className="text-slate-400 mt-2 text-sm">Elige el punto de partida para configurar las asignaturas.</p>
          </div>
          <div className="p-8 grid grid-cols-2 gap-6">
            <button onClick={() => setMallaSetupMode('plantilla_10me')} className="flex flex-col items-center text-center p-6 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4"><Copy size={28} className="text-blue-600" /></div>
              <h3 className="font-bold text-slate-800 text-lg">Plantilla 10me / 10ma</h3>
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
          <button onClick={handleGuardarMallaClick} className="text-sm font-semibold text-white bg-slate-800 px-4 py-1.5 rounded hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-sm">
            <Save size={16}/> Guardar Malla
          </button>
          <button onClick={() => setMallaSetupMode(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors underline">
            Cambiar método de inicio
          </button>
        </div>
      </div>

      <KanbanTopControls onScrollLeft={() => scrollKanban('left')} onScrollRight={() => scrollKanban('right')} />

      <div className="flex-1 flex min-h-104 relative">
        <div
          ref={kanbanScrollRef}
          onWheel={handleKanbanWheel}
          className={`flex gap-4 overflow-x-auto overflow-y-auto overscroll-x-contain touch-pan-x flex-1 min-h-80 max-h-[58vh] pb-6 pr-1 transition-all duration-300 snap-x snap-mandatory ${selectedSubject ? 'sm:pr-[380px]' : ''}`}
        >
          {Array.from({ length: totalSemestres }).map((_, i) => {
            const sem = i + 1;
            const ramosDelSemestre = malla.filter(a => a.semestre === sem);
            const canAdd = ramosDelSemestre.length < 10;

            return (
              <div key={sem} className="min-w-[260px] max-w-[260px] sm:min-w-[280px] sm:max-w-[280px] bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-col shrink-0 relative snap-start self-start">
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
          <div className="fixed inset-0 sm:absolute sm:inset-auto sm:right-0 sm:top-0 sm:bottom-0 w-full sm:w-[360px] bg-white border border-slate-200 shadow-[0_0_40px_rgba(0,0,0,0.1)] rounded-none sm:rounded-xl flex flex-col z-30 animate-in slide-in-from-right-8 sm:mb-4">
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
