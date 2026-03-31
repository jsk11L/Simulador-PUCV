import React, { useState, useEffect, useRef } from 'react';
import { 
} from 'lucide-react';
import type { AdminUsuario, MallaGuardada, MallaGuardadaApi, ResultadoPasado } from './types';
import ValidationErrorsModal from './components/ValidationErrorsModal';
import GuardarMallaModal from './components/GuardarMallaModal';
import MallasGuardadasModal from './components/MallasGuardadasModal';
import AuthView from './components/AuthView';
import AppSidebar from './components/AppSidebar';
import AppMainContent from './components/AppMainContent';
import useSimulaApi from './hooks/useSimulaApi';
import useWizardState from './hooks/useWizardState';
import useMallaEditorActions from './hooks/useMallaEditorActions';
import useSimulationActions from './hooks/useSimulationActions';
import useAuth from './hooks/useAuth';
import useAppNavigation from './hooks/useAppNavigation';
import useMallaPersistence from './hooks/useMallaPersistence';
import { MAX_SEMESTRES, MIN_SEMESTRES } from './constants/wizard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

export default function App() {
  // ==========================================
  // ESTADOS PRINCIPALES DE NAVEGACIÓN
  // ==========================================
  const [resultadosPasados, setResultadosPasados] = useState<ResultadoPasado[]>([]);

  const {
    wizardStep,
    setWizardStep,
    isSimulating,
    setIsSimulating,
    simResults,
    setSimResults,
    mallaSetupMode,
    setMallaSetupMode,
    malla,
    setMalla,
    totalSemestres,
    setTotalSemestres,
    nombreMalla,
    setNombreMalla,
    estadoGuardado,
    setEstadoGuardado,
    selectedSubject,
    setSelectedSubject,
    drawerSubject,
    setDrawerSubject,
    mallaErrorMsg,
    setMallaErrorMsg,
    validationErrors,
    setValidationErrors,
    currentMallaId,
    setCurrentMallaId,
    variables,
    setVariables,
    modeloCalif,
    setModeloCalif,
    resetWizardDraft,
  } = useWizardState();
  
  // ==========================================
  // ESTADOS DE GUARDADO Y MODALES GLOBALES
  // ==========================================
  const [mallasGuardadas, setMallasGuardadas] = useState<MallaGuardada[]>([]);
  const [showGuardarMallaModal, setShowGuardarMallaModal] = useState(false);
  const [nombreGuardarInput, setNombreGuardarInput] = useState("");
  const [showMallasGuardadasModal, setShowMallasGuardadasModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const kanbanScrollRef = useRef<HTMLDivElement>(null);

  const { fetchMallasGuardadas: fetchMallasGuardadasApi, fetchResultadosPasados: fetchResultadosPasadosApi, fetchAdminUsuarios: fetchAdminUsuariosApi, toggleAdminApproval } = useSimulaApi({ apiUrl });
  const { runSimulation, downloadZip } = useSimulationActions({ apiUrl });

  // ==========================================
  // ESTADOS DE ADMIN
  // ==========================================
  const [adminUsuarios, setAdminUsuarios] = useState<AdminUsuario[]>([]);

  const fetchMallasGuardadas = async () => {
    try {
      const data = await fetchMallasGuardadasApi();
      if (Array.isArray(data)) {
        setMallasGuardadas((data as MallaGuardadaApi[]).map((m) => ({
          id: m.id,
          nombre: m.nombre,
          asignaturas: m.asignaturas || [],
          totalSemestres: m.total_semestres,
          fecha: new Date(m.updated_at).toLocaleDateString()
        })));
      }
    } catch (err) {
      console.error('Error al cargar mallas:', err);
    }
  };

  const fetchResultadosPasados = async () => {
    try {
      const data = await fetchResultadosPasadosApi();
      if (Array.isArray(data)) {
        setResultadosPasados(data as ResultadoPasado[]);
      }
    } catch (err) {
      console.error('Error al cargar resultados:', err);
    }
  };

  const { activeTab, setActiveTab, sidebarOpen, setSidebarOpen, handleSidebarNav } = useAppNavigation({
    onOpenMallas: fetchMallasGuardadas,
    onOpenResultadosPasados: fetchResultadosPasados,
  });

  const hasSimulationDraft = Boolean(mallaSetupMode || malla.length > 0 || simResults || wizardStep > 1);

  const handleNewSimulation = () => {
    if (hasSimulationDraft) {
      const confirmed = window.confirm('Esto reiniciara la simulacion actual y podrias perder cambios no guardados. Deseas continuar?');
      if (!confirmed) return;
    }

    setActiveTab('wizard');
    resetWizardDraft();
    setSidebarOpen(false);
  };

  const {
    isAuthenticated,
    isAdmin,
    authMode,
    email,
    password,
    setAuthMode,
    setEmail,
    setPassword,
    handleAuth,
    handleLogout,
  } = useAuth({
    apiUrl,
    onLoginSuccess: () => {
      setTimeout(() => {
        fetchMallasGuardadas();
        fetchResultadosPasados();
      }, 100);
    },
    onLogout: resetWizardDraft,
  });

  const { handleGuardarMallaClick, confirmGuardarMalla, loadMallaGuardada, processCSVFile } = useMallaPersistence({
    apiUrl,
    nombreMalla,
    nombreGuardarInput,
    currentMallaId,
    malla,
    totalSemestres,
    fetchMallasGuardadas,
    setNombreGuardarInput,
    setShowGuardarMallaModal,
    setMalla,
    setTotalSemestres,
    setNombreMalla,
    setCurrentMallaId,
    setEstadoGuardado,
    setMallaSetupMode,
    setShowMallasGuardadasModal,
  });

  // ==========================================
  // EFECTOS
  // ==========================================


  useEffect(() => {
    if (mallaSetupMode === 'plantilla_10me' && malla.length === 0) {
      setMalla([
        // Semestre 1 — Ciencias Básicas
        { id: 'MAT-101', cred: 6, rep: 0.53, reqs: [], semestre: 1, dictacion: 'semestral' },
        { id: 'FIS-101', cred: 5, rep: 0.48, reqs: [], semestre: 1, dictacion: 'semestral' },
        { id: 'QUI-101', cred: 4, rep: 0.40, reqs: [], semestre: 1, dictacion: 'semestral' },
        { id: 'INF-101', cred: 4, rep: 0.35, reqs: [], semestre: 1, dictacion: 'semestral' },
        // Semestre 2 — Ciencias Básicas II
        { id: 'MAT-201', cred: 6, rep: 0.51, reqs: ['MAT-101'], semestre: 2, dictacion: 'semestral' },
        { id: 'FIS-201', cred: 5, rep: 0.46, reqs: ['FIS-101'], semestre: 2, dictacion: 'semestral' },
        { id: 'ALG-201', cred: 5, rep: 0.50, reqs: ['MAT-101'], semestre: 2, dictacion: 'anual' },
        { id: 'INF-201', cred: 4, rep: 0.32, reqs: ['INF-101'], semestre: 2, dictacion: 'semestral' },
        // Semestre 3 — Ciencias de la Ingeniería I
        { id: 'MAT-301', cred: 5, rep: 0.49, reqs: ['MAT-201'], semestre: 3, dictacion: 'anual' },
        { id: 'FIS-301', cred: 5, rep: 0.44, reqs: ['FIS-201', 'MAT-201'], semestre: 3, dictacion: 'anual' },
        { id: 'EST-301', cred: 4, rep: 0.38, reqs: ['MAT-201'], semestre: 3, dictacion: 'semestral' },
        { id: 'ING-301', cred: 4, rep: 0.30, reqs: ['INF-201'], semestre: 3, dictacion: 'semestral' },
        // Semestre 4 — Ciencias de la Ingeniería II
        { id: 'MAT-401', cred: 5, rep: 0.47, reqs: ['MAT-301'], semestre: 4, dictacion: 'anual' },
        { id: 'ELE-401', cred: 5, rep: 0.45, reqs: ['FIS-301'], semestre: 4, dictacion: 'anual' },
        { id: 'MEC-401', cred: 4, rep: 0.42, reqs: ['FIS-301', 'MAT-301'], semestre: 4, dictacion: 'semestral' },
        { id: 'ING-401', cred: 4, rep: 0.28, reqs: ['ING-301', 'EST-301'], semestre: 4, dictacion: 'semestral' },
        // Semestre 5 — Especialidad I
        { id: 'ELE-501', cred: 5, rep: 0.43, reqs: ['ELE-401'], semestre: 5, dictacion: 'anual' },
        { id: 'CTR-501', cred: 5, rep: 0.40, reqs: ['MAT-401', 'ELE-401'], semestre: 5, dictacion: 'anual' },
        { id: 'TER-501', cred: 4, rep: 0.36, reqs: ['MEC-401'], semestre: 5, dictacion: 'semestral' },
        { id: 'ADM-501', cred: 3, rep: 0.22, reqs: [], semestre: 5, dictacion: 'semestral' },
        // Semestre 6 — Especialidad II
        { id: 'ELE-601', cred: 5, rep: 0.41, reqs: ['ELE-501'], semestre: 6, dictacion: 'anual' },
        { id: 'CTR-601', cred: 5, rep: 0.38, reqs: ['CTR-501'], semestre: 6, dictacion: 'anual' },
        { id: 'POT-601', cred: 4, rep: 0.35, reqs: ['ELE-501', 'TER-501'], semestre: 6, dictacion: 'semestral' },
        { id: 'ECO-601', cred: 3, rep: 0.20, reqs: ['ADM-501'], semestre: 6, dictacion: 'semestral' },
        // Semestre 7 — Integración
        { id: 'PRY-701', cred: 6, rep: 0.33, reqs: ['ELE-601', 'CTR-601'], semestre: 7, dictacion: 'anual' },
        { id: 'ELE-701', cred: 5, rep: 0.37, reqs: ['ELE-601'], semestre: 7, dictacion: 'anual' },
        { id: 'GES-701', cred: 3, rep: 0.18, reqs: ['ECO-601'], semestre: 7, dictacion: 'semestral' },
        { id: 'LAB-701', cred: 3, rep: 0.25, reqs: ['POT-601'], semestre: 7, dictacion: 'semestral' },
        // Semestre 8 — Titulación
        { id: 'TIT-801', cred: 8, rep: 0.30, reqs: ['PRY-701'], semestre: 8, dictacion: 'semestral' },
        { id: 'PRA-801', cred: 5, rep: 0.15, reqs: ['PRY-701', 'ELE-701'], semestre: 8, dictacion: 'semestral' },
        { id: 'SEM-801', cred: 3, rep: 0.20, reqs: ['GES-701'], semestre: 8, dictacion: 'semestral' },
        { id: 'ETI-801', cred: 2, rep: 0.10, reqs: [], semestre: 8, dictacion: 'semestral' },
      ]);
      setTotalSemestres(8);
      setNombreMalla('Ingeniería Civil (Plantilla 8 Sem)');
      setEstadoGuardado('SIN GUARDAR');
      setCurrentMallaId(null);
    }
  }, [mallaSetupMode, malla.length, setCurrentMallaId, setEstadoGuardado, setMalla, setNombreMalla, setTotalSemestres]);

  // ==========================================
  // EJECUCIÓN DE LA SIMULACIÓN
  // ==========================================
  const handleRunSimulation = async () => {
    await runSimulation({
      nombreMalla,
      malla,
      variables,
      modeloCalif,
      onStart: () => {
        setIsSimulating(true);
        setWizardStep(5);
      },
      onSuccess: (data) => setSimResults(data),
      onError: (message) => {
        alert('Error ejecutando la simulacion: ' + message);
        setWizardStep(4);
      },
      onFinally: () => setIsSimulating(false),
      refreshResultadosPasados: fetchResultadosPasados,
    });
  };

  // ==========================================
  // LÓGICA DE MALLA (KANBAN)
  // ==========================================
  const {
    handleAddSemestre,
    handleRemoveSemestre,
    handleAddAsignatura,
    openDrawer,
    handleDrawerReqChange,
    handleAddReq,
    handleRemoveReq,
    handleSaveDrawer,
    handleDeleteAsignatura,
    validateMallaIntegrity,
  } = useMallaEditorActions({
    malla,
    totalSemestres,
    selectedSubject,
    drawerSubject,
    minSemestres: MIN_SEMESTRES,
    maxSemestres: MAX_SEMESTRES,
    setMalla,
    setTotalSemestres,
    setEstadoGuardado,
    setSelectedSubject,
    setDrawerSubject,
    setMallaErrorMsg,
  });

  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const validateIntegrityAndNext = () => {
    const errors = validateMallaIntegrity();
    if (errors.length > 0) setValidationErrors(errors);
    else {
      setValidationErrors([]);
      setWizardStep(2);
    }
  };

  // ==========================================
  // RENDER: LOGIN
  // ==========================================
  if (!isAuthenticated) {
    return (
      <AuthView
        authMode={authMode}
        email={email}
        password={password}
        setAuthMode={setAuthMode}
        setEmail={setEmail}
        setPassword={setPassword}
        handleAuth={handleAuth}
      />
    );
  }


  // ==========================================
  // FUNCIONES ADMIN
  // ==========================================
  const fetchAdminUsuarios = async () => {
    try {
      const data = await fetchAdminUsuariosApi();
      setAdminUsuarios(data);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const scrollKanban = (direction: 'left' | 'right') => {
    if (!kanbanScrollRef.current) return;
    const amount = direction === 'left' ? -360 : 360;
    kanbanScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleKanbanWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    const container = kanbanScrollRef.current;
    if (!container) return;

    // Preserve normal vertical page scrolling; only map wheel-to-horizontal when Shift is pressed.
    if (event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      container.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  };

  const handleToggleApproval = async (userId: string, currentApproved: boolean) => {
    try {
      const result = await toggleAdminApproval(userId, !currentApproved);
      if (result.ok) {
        fetchAdminUsuarios();
      } else {
        alert(result.error || 'Error al actualizar usuario');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  // ==========================================
  // DESCARGA .ZIP DE RESULTADOS
  // ==========================================
  const handleDownloadZip = async () => {
    if (!simResults) return;
    await downloadZip({
      simResults,
      nombreMalla,
      malla,
      totalSemestres,
      variables,
      modeloCalif,
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* ========================================== */}
      {/* MODALES DE VALIDACIÓN Y MALLAS GUARDADAS   */}
      {/* ========================================== */}
      <ValidationErrorsModal errors={validationErrors} onClose={() => setValidationErrors([])} />

      <GuardarMallaModal
        isOpen={showGuardarMallaModal}
        mallaLength={malla.length}
        totalSemestres={totalSemestres}
        nombreGuardarInput={nombreGuardarInput}
        currentMallaId={currentMallaId}
        onClose={() => setShowGuardarMallaModal(false)}
        onNombreChange={setNombreGuardarInput}
        onConfirm={confirmGuardarMalla}
      />

      <MallasGuardadasModal
        isOpen={showMallasGuardadasModal}
        mallasGuardadas={mallasGuardadas}
        onClose={() => setShowMallasGuardadasModal(false)}
        onSelectMalla={loadMallaGuardada}
      />

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <AppSidebar
        sidebarOpen={sidebarOpen}
        activeTab={activeTab}
        mallaSetupMode={mallaSetupMode}
        isAdmin={isAdmin}
        setSidebarOpen={setSidebarOpen}
        setActiveTab={setActiveTab}
        fetchAdminUsuarios={fetchAdminUsuarios}
        handleSidebarNav={handleSidebarNav}
        handleLogout={handleLogout}
        handleNewSimulation={handleNewSimulation}
      />

      <AppMainContent
        activeTab={activeTab}
        wizardStep={wizardStep}
        mallaSetupMode={mallaSetupMode}
        isAdmin={isAdmin}
        onOpenSidebar={() => setSidebarOpen(true)}
        setActiveTab={setActiveTab}
        setWizardStep={setWizardStep}
        setMallaSetupMode={setMallaSetupMode}
        setMalla={setMalla}
        setTotalSemestres={setTotalSemestres}
        setCurrentMallaId={setCurrentMallaId}
        setNombreMalla={setNombreMalla}
        setEstadoGuardado={setEstadoGuardado}
        setShowMallasGuardadasModal={setShowMallasGuardadasModal}
        setSelectedSubject={setSelectedSubject}
        setDrawerSubject={setDrawerSubject}
        setVariables={setVariables}
        setModeloCalif={setModeloCalif}
        malla={malla}
        totalSemestres={totalSemestres}
        nombreMalla={nombreMalla}
        estadoGuardado={estadoGuardado}
        selectedSubject={selectedSubject}
        drawerSubject={drawerSubject}
        mallaErrorMsg={mallaErrorMsg}
        variables={variables}
        modeloCalif={modeloCalif}
        simResults={simResults}
        isSimulating={isSimulating}
        mallasGuardadas={mallasGuardadas}
        resultadosPasados={resultadosPasados}
        adminUsuarios={adminUsuarios}
        minSemestres={MIN_SEMESTRES}
        maxSemestres={MAX_SEMESTRES}
        fileInputRef={fileInputRef}
        kanbanScrollRef={kanbanScrollRef}
        handleGuardarMallaClick={handleGuardarMallaClick}
        handleImportCSV={handleImportCSV}
        processCSVFile={processCSVFile}
        scrollKanban={scrollKanban}
        handleKanbanWheel={handleKanbanWheel}
        handleRemoveSemestre={handleRemoveSemestre}
        handleAddAsignatura={handleAddAsignatura}
        openDrawer={openDrawer}
        handleAddReq={handleAddReq}
        handleDrawerReqChange={handleDrawerReqChange}
        handleRemoveReq={handleRemoveReq}
        handleDeleteAsignatura={handleDeleteAsignatura}
        handleSaveDrawer={handleSaveDrawer}
        handleAddSemestre={handleAddSemestre}
        validateIntegrityAndNext={validateIntegrityAndNext}
        handleRunSimulation={handleRunSimulation}
        handleDownloadZip={handleDownloadZip}
        handleToggleApproval={handleToggleApproval}
      />
    </div>
  );
}