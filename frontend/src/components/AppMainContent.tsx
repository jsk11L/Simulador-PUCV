import { Menu } from 'lucide-react';
import type { ActiveTab, Asignatura, ModeloCalificaciones, ResultadoPasado, SimulacionResponse, VariablesSimulacion, MallaGuardada, AdminUsuario } from '../types';
import WizardStepIndicator from './WizardStepIndicator';
import MallaStep from './MallaStep';
import ResumenStep from './ResumenStep';
import ResultadosStep from './ResultadosStep';
import MallasGuardadasView from './MallasGuardadasView';
import ResultadosPasadosView from './ResultadosPasadosView';
import UltimoResultadoView from './UltimoResultadoView';
import LogView from './LogView';
import AdminView from './AdminView';
import HelpView from './HelpView';
import type { Dispatch, RefObject, SetStateAction, WheelEventHandler } from 'react';

type WizardStep = 1 | 2 | 3;

interface AppMainContentProps {
  activeTab: ActiveTab;
  wizardStep: WizardStep;
  mallaSetupMode: string | null;
  isAdmin: boolean;
  onOpenSidebar: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  setWizardStep: Dispatch<SetStateAction<WizardStep>>;
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
  malla: Asignatura[];
  totalSemestres: number;
  nombreMalla: string;
  estadoGuardado: 'SIN GUARDAR' | 'GUARDADO';
  selectedSubject: Asignatura | null;
  drawerSubject: Asignatura | null;
  mallaErrorMsg: string;
  variables: VariablesSimulacion;
  modeloCalif: ModeloCalificaciones;
  simResults: SimulacionResponse | null;
  isSimulating: boolean;
  mallasGuardadas: MallaGuardada[];
  resultadosPasados: ResultadoPasado[];
  adminUsuarios: AdminUsuario[];
  minSemestres: number;
  maxSemestres: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  kanbanScrollRef: RefObject<HTMLDivElement | null>;
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
  handleRunSimulation: () => void;
  handleDownloadZip: () => void;
  handleToggleApproval: (userId: string, currentApproved: boolean) => void;
}

export default function AppMainContent({
  activeTab,
  wizardStep,
  mallaSetupMode,
  isAdmin,
  onOpenSidebar,
  setActiveTab,
  setWizardStep,
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
  malla,
  totalSemestres,
  nombreMalla,
  estadoGuardado,
  selectedSubject,
  drawerSubject,
  mallaErrorMsg,
  variables,
  modeloCalif,
  simResults,
  isSimulating,
  mallasGuardadas,
  resultadosPasados,
  adminUsuarios,
  minSemestres,
  maxSemestres,
  fileInputRef,
  kanbanScrollRef,
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
  handleRunSimulation,
  handleDownloadZip,
  handleToggleApproval,
}: AppMainContentProps) {
  const isMallaCreationView = activeTab === 'wizard' && wizardStep === 1;

  const renderWizardStep = () => {
    if (wizardStep === 1) {
      return (
        <MallaStep
          mallaSetupMode={mallaSetupMode}
          malla={malla}
          totalSemestres={totalSemestres}
          nombreMalla={nombreMalla}
          estadoGuardado={estadoGuardado}
          selectedSubject={selectedSubject}
          drawerSubject={drawerSubject}
          mallaErrorMsg={mallaErrorMsg}
          variables={variables}
          modeloCalif={modeloCalif}
          minSemestres={minSemestres}
          maxSemestres={maxSemestres}
          fileInputRef={fileInputRef}
          kanbanScrollRef={kanbanScrollRef}
          setters={{
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
          }}
          actions={{
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
          }}
        />
      );
    }

    if (wizardStep === 2) {
      return (
        <ResumenStep
          nombreMalla={nombreMalla}
          malla={malla}
          totalSemestres={totalSemestres}
          variables={variables}
          modeloCalif={modeloCalif}
          onBack={() => setWizardStep(1)}
          onRunSimulation={handleRunSimulation}
        />
      );
    }

    return (
      <ResultadosStep
        isSimulating={isSimulating}
        simResults={simResults}
        totalSemestres={totalSemestres}
        variables={variables}
        modeloCalif={modeloCalif}
        malla={malla}
        handleDownloadZip={handleDownloadZip}
        setWizardStep={setWizardStep}
        handleRunSimulation={handleRunSimulation}
      />
    );
  };

  return (
    <main className={`flex-1 flex flex-col h-screen relative p-4 sm:p-6 lg:p-8 pb-4 ${isMallaCreationView ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}>
      <button
        onClick={onOpenSidebar}
        className="lg:hidden fixed top-4 left-4 z-20 bg-slate-900 text-white p-2 rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
      >
        <Menu size={20} />
      </button>

      {activeTab === 'wizard' && (
        <>
          <div className="mb-4 mt-2 shrink-0 pl-10 lg:pl-0">
            <h2 className="text-lg sm:text-2xl font-black text-slate-800 text-center">Configurar Nueva Simulación</h2>
          </div>
          <WizardStepIndicator wizardStep={wizardStep} />
          {renderWizardStep()}
        </>
      )}

      {activeTab === 'mallas' && <MallasGuardadasView mallasGuardadas={mallasGuardadas} />}

      {activeTab === 'resultados_pasados' && <ResultadosPasadosView resultadosPasados={resultadosPasados} />}

      {activeTab === 'ultimo_resultado' && (
        <UltimoResultadoView
          simResults={simResults}
          nombreMalla={nombreMalla}
          malla={malla}
          totalSemestres={totalSemestres}
          variables={variables}
          modeloCalif={modeloCalif}
          onVerDashboardCompleto={() => {
            setActiveTab('wizard');
            setWizardStep(3);
          }}
        />
      )}

      {activeTab === 'log' && <LogView simResults={simResults} nombreMalla={nombreMalla} malla={malla} />}

      {activeTab === 'admin' && isAdmin && (
        <AdminView adminUsuarios={adminUsuarios} onToggleApproval={handleToggleApproval} />
      )}

      {activeTab === 'ayuda' && <HelpView />}
    </main>
  );
}
