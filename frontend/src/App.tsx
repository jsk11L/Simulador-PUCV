import React, { useEffect, useState, useRef } from 'react';
import {
} from 'lucide-react';
import type { AdminUsuario, Asignatura, MallaGuardada, MallaGuardadaApi, ResultadoPasado } from './types';
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
import useRuntimeMode from './hooks/useRuntimeMode';
import { MAX_SEMESTRES, MIN_SEMESTRES } from './constants/wizard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

export default function App() {
  // ==========================================
  // ESTADOS PRINCIPALES DE NAVEGACIÓN
  // ==========================================
  const [resultadosPasados, setResultadosPasados] = useState<ResultadoPasado[]>([]);
  // appCerrada: en modo portable, tras pulsar "Salir de SimulaPUCV", la
  // UI queda bloqueada con una pantalla full-screen. El backend ya hizo
  // os.Exit, así que cualquier interacción sería engañosa.
  const [appCerrada, setAppCerrada] = useState(false);

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

  // ==========================================
  // SNAPSHOTS WIZARD ↔ CREAR_MALLA
  // ==========================================
  // El editor de malla del Wizard y el de "Crear Malla" comparten los
  // mismos states (malla, totalSemestres, etc.) — usar uno pisaría el
  // draft del otro. Solución: snapshots por tab. Al cambiar de activeTab
  // entre 'wizard' y 'crear_malla', guardamos el draft saliente y
  // restauramos el entrante.
  type MallaDraft = {
    malla: Asignatura[];
    totalSemestres: number;
    nombreMalla: string;
    mallaSetupMode: string | null;
    currentMallaId: string | null;
    estadoGuardado: 'SIN GUARDAR' | 'GUARDADO';
  };
  const [crearMallaSnapshot, setCrearMallaSnapshot] = useState<MallaDraft | null>(null);
  const [wizardSnapshot, setWizardSnapshot] = useState<MallaDraft | null>(null);
  const previousTabRef = useRef<typeof activeTab | null>(null);

  const snapshotActual = (): MallaDraft => ({
    malla,
    totalSemestres,
    nombreMalla,
    mallaSetupMode,
    currentMallaId,
    estadoGuardado,
  });

  const restaurarDraft = (d: MallaDraft) => {
    setMalla(d.malla);
    setTotalSemestres(d.totalSemestres);
    setNombreMalla(d.nombreMalla);
    setMallaSetupMode(d.mallaSetupMode);
    setCurrentMallaId(d.currentMallaId);
    setEstadoGuardado(d.estadoGuardado);
  };

  const draftEnBlanco = (): MallaDraft => ({
    malla: [],
    totalSemestres: MIN_SEMESTRES,
    nombreMalla: 'Nueva Malla',
    // null muestra el menú de selección (plantilla / CSV / malla
    // guardada / hoja en blanco) en lugar de un kanban vacío directo.
    mallaSetupMode: null,
    currentMallaId: null,
    estadoGuardado: 'SIN GUARDAR',
  });

  useEffect(() => {
    const prev = previousTabRef.current;
    previousTabRef.current = activeTab;
    if (prev === activeTab) return;

    const wasOnCrearMalla = prev === 'crear_malla';
    const goingToCrearMalla = activeTab === 'crear_malla';

    if (wasOnCrearMalla && !goingToCrearMalla) {
      // Salida de crear_malla → guardar su draft + restaurar wizard.
      setCrearMallaSnapshot(snapshotActual());
      if (wizardSnapshot) {
        restaurarDraft(wizardSnapshot);
      } else {
        restaurarDraft({
          malla: [],
          totalSemestres: MIN_SEMESTRES,
          nombreMalla: 'Plan de Estudios (Base)',
          mallaSetupMode: null,
          currentMallaId: null,
          estadoGuardado: 'SIN GUARDAR',
        });
      }
    } else if (!wasOnCrearMalla && goingToCrearMalla) {
      // Entrada a crear_malla → guardar wizard + cargar draft de crear_malla.
      setWizardSnapshot(snapshotActual());
      restaurarDraft(crearMallaSnapshot ?? draftEnBlanco());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const hasCrearMallaDraft = Boolean(
    (activeTab !== 'crear_malla' && crearMallaSnapshot && crearMallaSnapshot.malla.length > 0)
      || (activeTab === 'crear_malla' && malla.length > 0)
  );

  // "Crear Malla" del sidebar: descarta cualquier draft previo y empieza
  // limpio. Si está editando algo, pide confirmación.
  const handleCrearMallaNueva = () => {
    if (hasCrearMallaDraft) {
      const ok = window.confirm('Hay una malla en construcción guardada. ¿Descartarla y empezar una nueva?');
      if (!ok) return;
    }
    // Tirar snapshot previo y arrancar blank en la nueva navegación.
    setCrearMallaSnapshot(null);
    setActiveTab('crear_malla');
    setSidebarOpen(false);
  };

  // "Continuar Malla" del sidebar: solo navega; el useEffect restaura
  // el snapshot existente.
  const handleContinuarMalla = () => {
    setActiveTab('crear_malla');
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
        setWizardStep(3);
      },
      onSuccess: (data) => setSimResults(data),
      onError: (message) => {
        alert('Error ejecutando la simulacion: ' + message);
        setWizardStep(2);
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

  // Abre una malla guardada desde la vista de "Mis Mallas". La lleva al
  // editor en modo "solo malla" para que el usuario pueda modificar y
  // guardar SIN que la edición dispare una simulación al avanzar
  // accidentalmente. Si después quiere simular sobre esa malla, usa
  // Nueva Simulación y la carga desde el wizard.
  const handleAbrirMallaGuardada = (malla: MallaGuardada) => {
    loadMallaGuardada(malla);
    setActiveTab('crear_malla');
    setSidebarOpen(false);
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
  // RENDER: MODO RUNTIME (standalone vs servidor)
  // ==========================================
  // /api/info dice si el backend corre en modo portable (single-user, sin
  // login) o en modo servidor (auth normal). En standalone se saltea la
  // pantalla de login y se cargan las mallas del usuario local pre-creado.
  const runtimeInfo = useRuntimeMode(apiUrl);
  const standalone = runtimeInfo?.standalone === true;
  const isLoggedIn = standalone || isAuthenticated;

  useEffect(() => {
    if (standalone) {
      fetchMallasGuardadas();
      fetchResultadosPasados();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standalone]);

  if (runtimeInfo === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600 text-sm">
        Cargando SimulaPUCV...
      </div>
    );
  }

  if (appCerrada) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-100 p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl">
            ⏻
          </div>
          <h1 className="text-2xl font-bold mb-3">SimulaPUCV se ha cerrado</h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            El proceso fue detenido correctamente. Puede cerrar esta pestaña del navegador.
          </p>
          <p className="text-xs text-slate-500">
            Para volver a usar la aplicación, vuelva a ejecutar <code className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">SimulaPUCV.exe</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
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
  // APAGAR EL BINARIO PORTABLE
  // ==========================================
  // Pide al backend /api/shutdown (os.Exit en goroutine) y bloquea la UI
  // con una pantalla full-screen que el usuario no puede esquivar — sin
  // backend, navegar es engañoso (los datos no se persisten).
  // (appCerrada se declara arriba con los demás estados.)
  const handleShutdown = async () => {
    const ok = window.confirm('¿Cerrar SimulaPUCV? Se detendrá el proceso y deberá iniciar la aplicación nuevamente para usarla.');
    if (!ok) return;
    try {
      await fetch(apiUrl('/api/shutdown'), { method: 'POST' });
    } catch {
      // Esperado: el server se apaga en medio de la respuesta.
    }
    setAppCerrada(true);
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
        isAdmin={isAdmin && !standalone}
        standalone={standalone}
        hasCrearMallaDraft={hasCrearMallaDraft}
        setSidebarOpen={setSidebarOpen}
        setActiveTab={setActiveTab}
        fetchAdminUsuarios={fetchAdminUsuarios}
        handleSidebarNav={handleSidebarNav}
        handleLogout={handleLogout}
        handleNewSimulation={handleNewSimulation}
        handleCrearMallaNueva={handleCrearMallaNueva}
        handleContinuarMalla={handleContinuarMalla}
        handleShutdown={handleShutdown}
      />

      <AppMainContent
        activeTab={activeTab}
        wizardStep={wizardStep}
        mallaSetupMode={mallaSetupMode}
        isAdmin={isAdmin}
        standalone={standalone}
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
        apiUrl={apiUrl}
        onAbrirMallaGuardada={handleAbrirMallaGuardada}
      />
    </div>
  );
}