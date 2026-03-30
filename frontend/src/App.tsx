import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Settings, Users, BookOpen, Play, 
  ChevronRight, Lock, Mail, Activity, LogOut, KeyRound, ArrowLeft,
  FileSpreadsheet, FilePlus, Copy, Search, LayoutGrid, CheckCircle2, ChevronLeft,
  X, Trash2, AlertCircle
} from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  
  // Estados para los formularios
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Estados del Menú y Wizard (Fase 2)
  const [activeTab, setActiveTab] = useState<'wizard' | 'mallas' | 'cohortes' | 'parametros'>('wizard');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [mallaSetupMode, setMallaSetupMode] = useState<string | null>(null);
  
  // Estado para la asignatura seleccionada en el Kanban
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);

  // Detectar si venimos de un enlace de recuperación de contraseña
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
      setAuthMode('reset');
      setResetToken(token);
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  const showMsg = (text: string, type: 'error' | 'success' | 'info') => setMsg({ text, type });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg({ text: '', type: '' });

    try {
      if (authMode === 'login' || authMode === 'register') {
        const endpoint = authMode === 'login' ? 'http://localhost:8080/api/login' : 'http://localhost:8080/api/register';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        if (authMode === 'register') {
          setAuthMode('login');
          showMsg('Registro completado. Tu cuenta debe ser aprobada por el administrador antes de poder entrar.', 'info');
        } else {
          localStorage.setItem('simula_token', data.token);
          setIsAuthenticated(true);
        }
      } 
      else if (authMode === 'forgot') {
        const response = await fetch('http://localhost:8080/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        showMsg(data.message, 'success');
      }
      else if (authMode === 'reset') {
        const response = await fetch('http://localhost:8080/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, new_password: password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        showMsg('¡Contraseña actualizada! Ya puedes iniciar sesión.', 'success');
        setAuthMode('login');
        setPassword('');
      }
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('simula_token');
    setIsAuthenticated(false);
    setWizardStep(1);
    setMallaSetupMode(null);
    setSelectedSubject(null);
  };

  // ----------------------------------------------------------------------
  // VISTA 1: LANDING PAGE & AUTENTICACIÓN
  // ----------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 font-sans text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-8 text-center relative">
            {authMode !== 'login' && authMode !== 'reset' && (
              <button onClick={() => {setAuthMode('login'); setMsg({text:'', type:''})}} className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="w-16 h-16 bg-blue-500 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg">
              {authMode === 'reset' ? <KeyRound size={32} className="text-white" /> : <Activity size={32} className="text-white" />}
            </div>
            <h1 className="text-2xl font-bold text-white">SimulaPUCV</h1>
            <p className="text-slate-400 text-sm mt-2">Plataforma SaaS Multiusuario</p>
          </div>

          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-700 mb-6 text-center">
              {authMode === 'login' ? 'Iniciar Sesión' : 
               authMode === 'register' ? 'Solicitar Acceso' : 
               authMode === 'forgot' ? 'Recuperar Contraseña' : 'Crear Nueva Contraseña'}
            </h2>

            {msg.text && (
              <div className={`p-3 mb-6 text-sm font-semibold rounded-lg text-center ${
                msg.type === 'error' ? 'bg-red-100 text-red-700' : 
                msg.type === 'info' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                'bg-green-100 text-green-700'
              }`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {(authMode === 'login' || authMode === 'register' || authMode === 'forgot') && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico Institucional</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="ejemplo@pucv.cl"
                    />
                  </div>
                </div>
              )}

              {(authMode === 'login' || authMode === 'register' || authMode === 'reset') && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {authMode === 'reset' ? 'Nueva Contraseña' : 'Contraseña'}
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-6 shadow-md transition-colors flex justify-center items-center"
              >
                {isLoading ? 'Procesando...' : 
                 authMode === 'login' ? 'Entrar a la Plataforma' : 
                 authMode === 'register' ? 'Enviar Solicitud' :
                 authMode === 'forgot' ? 'Enviar Enlace de Recuperación' : 'Guardar Nueva Contraseña'}
              </button>
            </form>

            {authMode === 'login' && (
              <div className="mt-6 text-center text-sm flex flex-col gap-3">
                <button 
                  onClick={() => {setAuthMode('forgot'); setMsg({text:'', type:''});}}
                  className="font-bold text-slate-500 hover:text-slate-800"
                >
                  ¿Olvidaste tu contraseña?
                </button>
                <div className="border-t border-slate-100 pt-3">
                  <span className="text-slate-500">¿No tienes cuenta?</span>
                  <button 
                    onClick={() => {setAuthMode('register'); setMsg({text:'', type:''});}}
                    className="ml-2 font-bold text-blue-600 hover:text-blue-800"
                  >
                    Solicita acceso aquí
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // COMPONENTES DEL WIZARD (FASE 2)
  // ----------------------------------------------------------------------

  const renderWizardStepIndicator = () => {
    const steps = [
      { num: 1, label: 'Diseño de Malla' },
      { num: 2, label: 'Cohorte de Alumnos' },
      { num: 3, label: 'Hiperparámetros' },
      { num: 4, label: 'Revisión y Ejecución' },
    ];

    return (
      <div className="flex items-center justify-center w-full max-w-3xl mx-auto py-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.num}>
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
                wizardStep === step.num ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 
                wizardStep > step.num ? 'bg-green-500 border-green-500 text-white' : 
                'bg-white border-slate-300 text-slate-400'
              }`}>
                {wizardStep > step.num ? <CheckCircle2 size={20} /> : step.num}
              </div>
              <span className={`absolute top-12 text-xs font-bold w-32 text-center ${
                wizardStep === step.num ? 'text-blue-700' : 
                wizardStep > step.num ? 'text-slate-700' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded transition-colors ${
                wizardStep > step.num ? 'bg-green-500' : 'bg-slate-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderMallaStep = () => {
    // Función mock para generar asignaturas según el semestre
    const getMockAsignaturas = (sem: number) => {
      if (mallaSetupMode === 'blanco') return [];
      if (sem === 1) return [
        { id: '115', cred: 6, rep: 0.53, reqs: [] },
        { id: '116', cred: 6, rep: 0.50, reqs: [] }
      ];
      if (sem === 2) return [
        { id: '117', cred: 4, rep: 0.51, reqs: ['115'] },
        { id: '133', cred: 5, rep: 0.49, reqs: ['115'] }
      ];
      if (sem === 3) return [
        { id: '215', cred: 5, rep: 0.45, reqs: ['117', '116'] }
      ];
      return [];
    };

    // ESTADO: Popup Inicial Activo
    if (!mallaSetupMode) {
      return (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 p-6 text-center">
              <h2 className="text-2xl font-bold text-white">¿Cómo quieres empezar tu Malla?</h2>
              <p className="text-slate-400 mt-2 text-sm">Elige el punto de partida para configurar las asignaturas de esta simulación.</p>
            </div>
            
            <div className="p-8 grid grid-cols-2 gap-6">
              <button onClick={() => setMallaSetupMode('plantilla_10me')} className="flex flex-col items-center text-center p-6 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Copy size={28} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Plantilla 10me / 10ma</h3>
                <p className="text-xs text-slate-500 mt-2">Carga la malla base oficial precargada en el sistema para realizarle modificaciones puntuales.</p>
              </button>

              <button onClick={() => setMallaSetupMode('csv')} className="flex flex-col items-center text-center p-6 border-2 border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={28} className="text-green-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Importar archivo CSV</h3>
                <p className="text-xs text-slate-500 mt-2">Sube el archivo Excel (CSV) estructurado con semestre, sigla, créditos, reprobación y prerrequisitos.</p>
              </button>

              <button onClick={() => setMallaSetupMode('guardada')} className="flex flex-col items-center text-center p-6 border-2 border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Search size={28} className="text-purple-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Malla Guardada</h3>
                <p className="text-xs text-slate-500 mt-2">Busca en tu historial de mallas guardadas anteriormente en tu cuenta.</p>
              </button>

              <button onClick={() => setMallaSetupMode('blanco')} className="flex flex-col items-center text-center p-6 border-2 border-slate-200 rounded-xl hover:border-slate-800 hover:bg-slate-100 transition-all group">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FilePlus size={28} className="text-slate-700" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Hoja en Blanco</h3>
                <p className="text-xs text-slate-500 mt-2">Inicia con un tablero de Kanban vacío y añade los ramos y prerrequisitos uno a uno.</p>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ESTADO: Tablero Kanban + Menú Lateral
    return (
      <div className="flex-1 flex flex-col h-full animate-in fade-in relative">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 z-10 relative">
          <div className="flex items-center gap-3">
            <LayoutGrid size={20} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">
              {mallaSetupMode === 'blanco' ? 'Malla Personalizada (Vacía)' : 'Plan de Estudios (Base)'}
            </h3>
            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded ml-2 border border-amber-200">Sin Guardar</span>
          </div>
          <button onClick={() => setMallaSetupMode(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors underline">
            Cambiar método de inicio
          </button>
        </div>

        {/* CONTENEDOR PRINCIPAL: Tablero + Popup Derecho */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Zona del Tablero (Ajusta su ancho si el menú está abierto) */}
          <div className={`flex gap-4 overflow-x-auto flex-1 min-h-0 pb-4 transition-all duration-300 ${selectedSubject ? 'pr-[380px]' : ''}`}>
            {[1, 2, 3].map(sem => (
              <div key={sem} className="min-w-[260px] max-w-[260px] bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-col h-full shrink-0">
                <h4 className="text-center font-bold text-slate-500 mb-4 text-xs uppercase tracking-wider">Semestre {sem}</h4>
                <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                  
                  {/* Renderizado dinámico de tarjetas */}
                  {getMockAsignaturas(sem).map((asig: any) => (
                    <div 
                      key={asig.id}
                      onClick={() => setSelectedSubject(asig)}
                      className={`bg-white p-3 rounded-lg border-2 shadow-sm transition-colors cursor-pointer group ${selectedSubject?.id === asig.id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-slate-300'}`}
                    >
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                        <div className="font-black text-slate-800 text-lg group-hover:text-blue-700">{asig.id}</div>
                        <div className="flex gap-1">
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">{asig.cred} CR</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Reprobación:</span>
                        <span className={`font-bold ${asig.rep >= 0.5 ? 'text-red-500' : 'text-amber-500'}`}>{asig.rep}</span>
                      </div>
                      
                      {asig.reqs.length > 0 && (
                        <div className="mt-2 text-[10px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 p-1.5 rounded">
                          REQS: {asig.reqs.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <button className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm font-bold text-slate-400 hover:bg-white hover:text-blue-600 hover:border-blue-300 transition-all flex items-center justify-center gap-1">
                    <FilePlus size={14} /> Añadir Sigla
                  </button>

                </div>
              </div>
            ))}
            <div className="min-w-[260px] bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-xl p-3 flex items-center justify-center shrink-0">
              <button className="text-slate-400 font-bold hover:text-blue-600 transition-colors flex flex-col items-center gap-2">
                <FilePlus size={24} /> Añadir Semestre {mallaSetupMode !== 'blanco' ? '4' : '1'}
              </button>
            </div>
          </div>

          {/* POPUP LATERAL (Cerrable) */}
          {selectedSubject && (
            <div className="w-[360px] bg-white border border-slate-200 shadow-[0_0_40px_rgba(0,0,0,0.1)] rounded-xl flex flex-col absolute right-0 top-0 bottom-0 z-30 animate-in slide-in-from-right-8 mb-4">
              
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center rounded-t-xl shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Propiedades de Asignatura</span>
                  <h3 className="font-bold text-xl mt-0.5">Sigla: {selectedSubject.id}</h3>
                </div>
                <button 
                  onClick={() => setSelectedSubject(null)} 
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Créditos Oficiales</label>
                  <input type="number" defaultValue={selectedSubject.cred} className="w-full mt-1.5 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"/>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa Histórica Reprobación</label>
                  <div className="relative mt-1.5">
                    <input type="number" step="0.01" defaultValue={selectedSubject.rep} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"/>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Formato decimal (Ej: 0.53 = 53%)</p>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prerrequisitos</label>
                    <button className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 font-bold px-2 py-1 rounded hover:bg-blue-100 transition-colors">+ Añadir</button>
                  </div>
                  
                  {selectedSubject.reqs.length === 0 ? (
                    <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">Sin requisitos previos</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedSubject.reqs.map((r: string, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">REQ{idx+1}</span>
                            <span className="text-sm font-bold text-slate-700">{r}</span>
                          </div>
                          <button className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info sobre Control de Errores */}
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 mt-8">
                  <AlertCircle size={20} className="text-amber-500 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-800 mb-1">Control de Integridad</h5>
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                      El sistema validará automáticamente que los prerrequisitos (Siglas) existan y estén ubicados en semestres anteriores antes de permitirte ejecutar la simulación.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl shrink-0">
                <button className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-700 transition-colors shadow-md">
                  Guardar Propiedades
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botonera inferior del Wizard */}
        <div className="flex justify-end pt-6 mt-4 border-t border-slate-200 gap-4 shrink-0">
          <button 
            onClick={() => {
              setWizardStep(2);
              setSelectedSubject(null);
            }} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all"
          >
            Siguiente: Alumnos <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderPlaceholderStep = (stepName: string) => (
    <div className="flex-1 flex flex-col h-full animate-in fade-in">
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-12 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Activity size={32} className="text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Paso {wizardStep}: {stepName}</h2>
        <p className="text-slate-500 max-w-md">Esta pantalla se desarrollará en el siguiente paso. Incluirá su propio Popup Inicial para elegir cómo cargar los datos.</p>
      </div>
      <div className="flex justify-between pt-6 mt-4 border-t border-slate-200">
        <button onClick={() => setWizardStep((wizardStep - 1) as any)} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
          <ChevronLeft size={18} /> Volver
        </button>
        <button onClick={() => setWizardStep((wizardStep + 1) as any)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all">
          {wizardStep === 4 ? 'Iniciar Simulación' : 'Siguiente Paso'} {wizardStep !== 4 && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );

  // ----------------------------------------------------------------------
  // VISTA 2: APLICACIÓN PRINCIPAL (ESQUELETO SAAS)
  // ----------------------------------------------------------------------
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-blue-400" />
            SimulaPUCV
          </h1>
          <p className="text-xs text-slate-400 mt-1">Ing. Civil Eléctrica</p>
        </div>
        
        <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Principal</div>
        <nav className="px-4 space-y-1">
          <button 
            onClick={() => {setActiveTab('wizard'); setWizardStep(1); setMallaSetupMode(null); setSelectedSubject(null);}} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'wizard' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            <Play size={18} /> Nueva Simulación
          </button>
        </nav>

        <div className="p-4 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Historial y Biblioteca</div>
        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => setActiveTab('mallas')} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'mallas' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            <LayoutGrid size={18} /> Mallas Guardadas
          </button>
          <button 
            onClick={() => setActiveTab('cohortes')} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'cohortes' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            <Users size={18} /> Cohortes Guardadas
          </button>
          <button 
            onClick={() => setActiveTab('parametros')} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'parametros' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            <Settings size={18} /> Parámetros
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-red-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative p-8 pb-4">
        
        {/* WIZARD FLOW */}
        {activeTab === 'wizard' && (
          <>
            {/* Header del Wizard con Stepper */}
            <div className="mb-8 mt-2 shrink-0">
              <h2 className="text-2xl font-black text-slate-800 text-center">Configurar Nueva Simulación</h2>
              {renderWizardStepIndicator()}
            </div>

            {/* Contenedor dinámico de Pasos */}
            <div className="flex-1 min-h-0 relative">
              {wizardStep === 1 && renderMallaStep()}
              {wizardStep === 2 && renderPlaceholderStep('Cohorte Estocástica')}
              {wizardStep === 3 && renderPlaceholderStep('Hiperparámetros Algorítmicos')}
              {wizardStep === 4 && renderPlaceholderStep('Resumen y Verificación')}
            </div>
          </>
        )}

        {/* PANTALLAS DE BIBLIOTECA (Placeholder) */}
        {activeTab !== 'wizard' && (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center p-12 animate-in fade-in">
             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
               <BookOpen size={32} className="text-slate-400" />
             </div>
             <h2 className="text-2xl font-bold text-slate-800 mb-2 capitalize">{activeTab} Guardadas</h2>
             <p className="text-slate-500">Aquí se mostrará la tabla con el historial de configuraciones guardadas por el usuario actual.</p>
          </div>
        )}

      </main>
    </div>
  );
}