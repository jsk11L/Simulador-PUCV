import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, Play, 
  ChevronRight, Lock, Mail, Activity, LogOut, ArrowLeft,
  FileSpreadsheet, FilePlus, Copy, Search, LayoutGrid, CheckCircle2, ChevronLeft,
  X, Trash2, AlertCircle, Save, FileText, History, BarChart, Check, Sliders,
  Rocket, Loader2, Download, Users, Shield, Menu
} from 'lucide-react';
import Papa from 'papaparse';
import type { Asignatura, MallaGuardada, VariablesSimulacion, ModeloCalificaciones } from './types';
import JSZip from 'jszip';

export default function App() {
  // ==========================================
  // ESTADOS DE AUTENTICACIÓN
  // ==========================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  // ==========================================
  // ESTADOS PRINCIPALES DE NAVEGACIÓN
  // ==========================================
  const [activeTab, setActiveTab] = useState<string>('wizard');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1); // Paso 5 = Resultados
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResults, setSimResults] = useState<any>(null);
  const [resultadosPasados, setResultadosPasados] = useState<any[]>([]);
  
  // ==========================================
  // ESTADOS DEL WIZARD - PASO 1 (MALLA)
  // ==========================================
  const [mallaSetupMode, setMallaSetupMode] = useState<string | null>(null);
  const [malla, setMalla] = useState<Asignatura[]>([]);
  const [totalSemestres, setTotalSemestres] = useState<number>(4);
  const [nombreMalla, setNombreMalla] = useState<string>("Plan de Estudios (Base)");
  const [estadoGuardado, setEstadoGuardado] = useState<'SIN GUARDAR' | 'GUARDADO'>('SIN GUARDAR');
  const [selectedSubject, setSelectedSubject] = useState<Asignatura | null>(null);
  const [drawerSubject, setDrawerSubject] = useState<Asignatura | null>(null);
  const [mallaErrorMsg, setMallaErrorMsg] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]); 
  const [currentMallaId, setCurrentMallaId] = useState<string | null>(null);

  // ==========================================
  // ESTADOS DEL WIZARD - PASO 2 (VARIABLES)
  // ==========================================
  const [variables, setVariables] = useState<VariablesSimulacion>({
    ne: 150,       
    ncsmax: 21,    
    tamin: 12.3,   
    naptamin: 10,  
    opor: 6        
  });

  // ==========================================
  // ESTADOS DEL WIZARD - PASO 3 (MODELO CALIF)
  // ==========================================
  const [modeloCalif, setModeloCalif] = useState<ModeloCalificaciones>({
    vmap1234: 0.48,
    delta1234: 0.20,
    vmap5678: 0.55,
    delta5678: 0.20,
    vmapm: 0.65,
    deltam: 0.25
  });

  // ==========================================
  // ESTADOS DE GUARDADO Y MODALES GLOBALES
  // ==========================================
  const [mallasGuardadas, setMallasGuardadas] = useState<MallaGuardada[]>([]);
  const [showGuardarMallaModal, setShowGuardarMallaModal] = useState(false);
  const [nombreGuardarInput, setNombreGuardarInput] = useState("");
  const [showMallasGuardadasModal, setShowMallasGuardadasModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // ESTADOS DE ADMIN
  // ==========================================
  const [adminUsuarios, setAdminUsuarios] = useState<any[]>([]);

  // ==========================================
  // EFECTOS
  // ==========================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
      setAuthMode('reset');
      setResetToken(token);
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

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
  }, [mallaSetupMode]);

  const showMsg = (text: string, type: 'error' | 'success' | 'info') => setMsg({ text, type });

  // ==========================================
  // LÓGICA DE AUTENTICACIÓN
  // ==========================================
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
          showMsg('Registro completado. Esperando aprobación del admin.', 'info');
        } else {
          localStorage.setItem('simula_token', data.token);
          setIsAuthenticated(true);
          setIsAdmin(data.is_admin === true);
          // Cargar datos del usuario desde la BD
          setTimeout(() => { fetchMallasGuardadas(); fetchResultadosPasados(); }, 100);
        }
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
    setMalla([]);
    setCurrentMallaId(null);
  };

  // ==========================================
  // EJECUCIÓN DE LA SIMULACIÓN
  // ==========================================
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setWizardStep(5); // Vista de resultados/carga
    
    try {
      const mallaNameParam = encodeURIComponent(nombreMalla);
      const response = await fetch(`http://localhost:8080/api/simular?malla_nombre=${mallaNameParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('simula_token')}`
        },
        body: JSON.stringify({
          asignaturas: malla,
          variables: variables,
          modelo: modeloCalif
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en la simulación');
      
      setSimResults(data);
      // Refrescar lista de resultados pasados
      fetchResultadosPasados();
    } catch (err: any) {
      alert("Error ejecutando la simulación: " + err.message);
      setWizardStep(4);
    } finally {
      setIsSimulating(false);
    }
  };

  // ==========================================
  // LÓGICA DE MALLA (KANBAN)
  // ==========================================
  const handleAddSemestre = () => {
    setTotalSemestres(prev => prev + 1);
    setEstadoGuardado('SIN GUARDAR');
  };
  
  const handleRemoveSemestre = (semToRemove: number) => {
    if (semToRemove === totalSemestres && semToRemove > 4) {
      setMalla(prev => prev.filter(a => a.semestre !== semToRemove));
      setTotalSemestres(prev => prev - 1);
      setEstadoGuardado('SIN GUARDAR');
    }
  };

  const handleAddAsignatura = (sem: number) => {
    let yy = 0;
    let newId = `${sem}${String(yy).padStart(2, '0')}`;
    while (malla.some(a => a.id === newId)) {
      yy++;
      newId = `${sem}${String(yy).padStart(2, '0')}`;
    }
    const newAsig: Asignatura = { id: newId, cred: 0, rep: 0, reqs: [], semestre: sem };
    setMalla([...malla, newAsig]);
    setEstadoGuardado('SIN GUARDAR');
  };

  const openDrawer = (asig: Asignatura) => {
    setSelectedSubject(asig);
    setDrawerSubject(JSON.parse(JSON.stringify(asig))); 
    setMallaErrorMsg("");
  };

  const handleDrawerReqChange = (index: number, value: string) => {
    if (!drawerSubject) return;
    const newReqs = [...drawerSubject.reqs];
    newReqs[index] = value;
    setDrawerSubject({ ...drawerSubject, reqs: newReqs });
  };

  const handleAddReq = () => {
    if (!drawerSubject) return;
    setDrawerSubject({ ...drawerSubject, reqs: [...drawerSubject.reqs, ''] });
  };

  const handleRemoveReq = (index: number) => {
    if (!drawerSubject) return;
    const newReqs = drawerSubject.reqs.filter((_, i) => i !== index);
    setDrawerSubject({ ...drawerSubject, reqs: newReqs });
  };

  const handleSaveDrawer = () => {
    if (!drawerSubject || !selectedSubject) return;
    
    if (!drawerSubject.id.trim()) {
      setMallaErrorMsg("La sigla no puede estar vacía.");
      return;
    }

    if (!drawerSubject.dictacion) {
      setMallaErrorMsg("Debes seleccionar una opción de Dictación (Anual o Semestral).");
      return;
    }

    const isDuplicate = malla.some(a => a.id === drawerSubject.id && a.id !== selectedSubject.id);
    if (isDuplicate) {
      setMallaErrorMsg(`La sigla "${drawerSubject.id}" ya existe en la malla.`);
      return;
    }

    const newMalla = malla.map(a => a.id === selectedSubject.id ? drawerSubject : a);
    
    if (drawerSubject.id !== selectedSubject.id) {
      newMalla.forEach(asig => {
        asig.reqs = asig.reqs.map(r => r === selectedSubject.id ? drawerSubject.id : r);
      });
    }

    setMalla(newMalla);
    setEstadoGuardado('SIN GUARDAR');
    setSelectedSubject(null);
    setDrawerSubject(null);
  };

  const handleDeleteAsignatura = () => {
    if (!selectedSubject) return;
    const newMalla = malla.filter(a => a.id !== selectedSubject.id);
    newMalla.forEach(asig => {
      asig.reqs = asig.reqs.filter(r => r !== selectedSubject.id);
    });

    setMalla(newMalla);
    setEstadoGuardado('SIN GUARDAR');
    setSelectedSubject(null);
    setDrawerSubject(null);
  };

  const handleGuardarMallaClick = () => {
    setNombreGuardarInput(nombreMalla === "Plan de Estudios (Base)" ? "Nueva Malla 1" : nombreMalla);
    setShowGuardarMallaModal(true);
  };

  const confirmGuardarMalla = async (tipoAccion: 'nueva' | 'sobrescribir') => {
    if (!nombreGuardarInput.trim()) return;
    const token = localStorage.getItem('simula_token');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    try {
      if (tipoAccion === 'sobrescribir' && currentMallaId) {
        await fetch(`http://localhost:8080/api/mallas/${currentMallaId}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ nombre: nombreGuardarInput, asignaturas: malla, total_semestres: totalSemestres })
        });
      } else {
        const res = await fetch('http://localhost:8080/api/mallas', {
          method: 'POST', headers,
          body: JSON.stringify({ nombre: nombreGuardarInput, asignaturas: malla, total_semestres: totalSemestres })
        });
        const data = await res.json();
        if (data.id) setCurrentMallaId(data.id);
      }
      setNombreMalla(nombreGuardarInput);
      setEstadoGuardado('GUARDADO');
      setShowGuardarMallaModal(false);
      fetchMallasGuardadas();
    } catch (err) {
      console.error('Error al guardar malla:', err);
    }
  };

  const fetchMallasGuardadas = async () => {
    const token = localStorage.getItem('simula_token');
    try {
      const res = await fetch('http://localhost:8080/api/mallas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMallasGuardadas(data.map((m: any) => ({
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
    const token = localStorage.getItem('simula_token');
    try {
      const res = await fetch('http://localhost:8080/api/resultados', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setResultadosPasados(data);
      }
    } catch (err) {
      console.error('Error al cargar resultados:', err);
    }
  };

  const loadMallaGuardada = (mg: MallaGuardada) => {
    setMalla(JSON.parse(JSON.stringify(mg.asignaturas)));
    setTotalSemestres(mg.totalSemestres);
    setNombreMalla(mg.nombre);
    setCurrentMallaId(mg.id);
    setEstadoGuardado('GUARDADO');
    setMallaSetupMode('guardada');
    setShowMallasGuardadasModal(false);
  };

  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const processCSVFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const asignaturas: Asignatura[] = [];
          const rows = results.data as Record<string, string>[];

          if (rows.length === 0) {
            alert('El archivo CSV está vacío.');
            return;
          }

          // Detectar columnas automáticamente (case-insensitive)
          const headers = Object.keys(rows[0]);
          const findCol = (keywords: string[]) => 
            headers.find(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))) || '';

          const colId = findCol(['codigo', 'código', 'id', 'sigla', 'asignatura']);
          const colCred = findCol(['credito', 'crédito', 'cred', 'SCT']);
          const colSem = findCol(['semestre', 'sem', 'nivel']);
          const colRep = findCol(['reprobacion', 'reprobación', 'rep', 'tasa']);
          const colReqs = findCol(['prerequisito', 'prerrequisito', 'prereq', 'req']);
          const colDict = findCol(['dictacion', 'dictación', 'dict', 'oferta']);

          if (!colId || !colSem) {
            alert(`No se encontraron las columnas obligatorias.\nSe requiere al menos: ID/Código y Semestre.\nColumnas encontradas: ${headers.join(', ')}`);
            return;
          }

          for (const row of rows) {
            const id = (row[colId] || '').trim();
            if (!id) continue;

            const semestre = parseInt(row[colSem] || '1', 10);
            const creditos = parseInt(row[colCred] || '4', 10);
            const rep = parseFloat(row[colRep] || '0.5');
            const reqsRaw = (row[colReqs] || '').trim();
            const reqs = reqsRaw ? reqsRaw.split(/[;,|]/).map(r => r.trim()).filter(r => r) : [];
            
            let dictacion: 'anual' | 'semestral' = 'anual';
            if (colDict) {
              const val = (row[colDict] || '').toLowerCase().trim();
              if (val.includes('semestral') || val === 's' || val === 'ambos' || val === 'both') {
                dictacion = 'semestral';
              }
            }

            asignaturas.push({ id, cred: creditos, rep, reqs, semestre, dictacion });
          }

          if (asignaturas.length === 0) {
            alert('No se pudieron extraer asignaturas del archivo. Verifica las columnas.');
            return;
          }

          const maxSem = Math.max(...asignaturas.map(a => a.semestre));
          setMalla(asignaturas);
          setTotalSemestres(maxSem);
          setMallaSetupMode('csv');
          setEstadoGuardado('SIN GUARDAR');
          setCurrentMallaId(null);
          setNombreMalla(file.name.replace(/\.csv$/i, ''));

          alert(`✅ Importación exitosa: ${asignaturas.length} asignaturas en ${maxSem} semestres.`);
        } catch (err: any) {
          alert('Error al procesar el CSV: ' + err.message);
        }
      },
      error: (err) => {
        alert('Error al leer el archivo: ' + err.message);
      }
    });
  };

  const validateIntegrityAndNext = () => {
    const errors: string[] = [];
    for (let s = 1; s <= totalSemestres; s++) {
      const asignaturasDelSemestre = malla.filter(a => a.semestre === s);
      if (asignaturasDelSemestre.length === 0) {
        errors.push(`Semestre ${s}: Está vacío. Debes añadir asignaturas o eliminar el semestre (si es el último y > 4).`);
      }
    }
    for (const asig of malla) {
      if (asig.cred <= 0) errors.push(`Asignatura '${asig.id}' (Semestre ${asig.semestre}): Debe tener más de 0 créditos.`);
      if (asig.rep <= 0) errors.push(`Asignatura '${asig.id}' (Semestre ${asig.semestre}): Debe tener una tasa de reprobación mayor a 0.`);
      if (!asig.dictacion) errors.push(`Asignatura '${asig.id}' (Semestre ${asig.semestre}): Falta seleccionar la opción de Dictación (OBLIGATORIO).`);
      for (const req of asig.reqs) {
        if (!req.trim()) continue; 
        const reqParent = malla.find(a => a.id === req);
        if (!reqParent) {
          errors.push(`Asignatura '${asig.id}': El prerrequisito '${req}' NO EXISTE en la malla.`);
        } else if (reqParent.semestre >= asig.semestre) {
          errors.push(`Asignatura '${asig.id}': El prerrequisito '${req}' está en el semestre ${reqParent.semestre}. Debe cursarse en un semestre estrictamente anterior.`);
        }
      }
    }
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
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 font-sans text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-8 text-center relative">
            <div className="w-16 h-16 bg-blue-500 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg">
              <Activity size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">SimulaPUCV</h1>
            <p className="text-slate-400 text-sm mt-2">Plataforma SaaS Multiusuario</p>
          </div>
          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-700 mb-6 text-center">
              {authMode === 'register' ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </h2>
            <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Correo Institucional</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="usuario@pucv.cl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-6 shadow-md transition-colors">
                {authMode === 'register' ? 'Crear Cuenta' : 'Entrar a la Plataforma'}
              </button>
            </form>
            <div className="mt-6 text-center text-sm">
              {authMode === 'login' ? (
                <p className="text-slate-500">
                  ¿No tienes cuenta?{' '}
                  <button onClick={() => setAuthMode('register')} className="text-blue-600 font-bold hover:underline">Regístrate aquí</button>
                </p>
              ) : (
                <p className="text-slate-500">
                  ¿Ya tienes cuenta?{' '}
                  <button onClick={() => setAuthMode('login')} className="text-blue-600 font-bold hover:underline">Inicia Sesión</button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }


  // ==========================================
  // FUNCIONES ADMIN
  // ==========================================
  const fetchAdminUsuarios = async () => {
    const token = localStorage.getItem('simula_token');
    try {
      const res = await fetch('http://localhost:8080/api/admin/usuarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUsuarios(data || []);
      }
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const handleToggleApproval = async (userId: string, currentApproved: boolean) => {
    const token = localStorage.getItem('simula_token');
    try {
      const res = await fetch(`http://localhost:8080/api/admin/usuarios/${userId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: !currentApproved })
      });
      if (res.ok) {
        fetchAdminUsuarios();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al actualizar usuario');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  // ==========================================
  // DESCARGA .ZIP DE RESULTADOS
  // ==========================================
  const handleDownloadZip = async () => {
    if (!simResults) return;

    const zip = new JSZip();
    const m = simResults.metricas_globales;
    const dist = simResults.distribucion_semestres || {};
    const ramos = simResults.ramos_criticos || [];

    // 1. malla.csv
    const mallaHeader = 'ID,Semestre,Creditos,Tasa_Reprobacion,Prerrequisitos,Dictacion';
    const mallaRows = malla.map(a => `${a.id},${a.semestre},${a.cred},${a.rep},"${a.reqs.join(';')}",${a.dictacion || 'anual'}`);
    zip.file('malla.csv', [mallaHeader, ...mallaRows].join('\n'));

    // 2. parametros.txt
    const paramLines = [
      '=== SIMULAPUCV — Parámetros de Simulación ===',
      `Fecha: ${new Date().toLocaleString('es-CL')}`,
      `Malla: ${nombreMalla}`,
      `Total Asignaturas: ${malla.length}`,
      `Total Semestres: ${totalSemestres}`,
      `Total Créditos: ${malla.reduce((s, a) => s + a.cred, 0)}`,
      '',
      '--- Variables de Simulación ---',
      `NE (Alumnos): ${variables.ne}`,
      `NCSmax (Créditos Máx/Sem): ${variables.ncsmax}`,
      `TAmin (Avance Mínimo): ${variables.tamin}`,
      `NapTAmin (Sem Aplicación TAmin): ${variables.naptamin}`,
      `Opor (Oportunidades): ${variables.opor}`,
      '',
      '--- Modelo Estocástico ---',
      `Ciclo Básico (Sem 1-4): VMap=${modeloCalif.vmap1234}, Delta=${modeloCalif.delta1234}`,
      `Ciclo Profesional (Sem 5-8): VMap=${modeloCalif.vmap5678}, Delta=${modeloCalif.delta5678}`,
      `Ciclo Titulación (Sem 9+): VMap=${modeloCalif.vmapm}, Delta=${modeloCalif.deltam}`,
    ];
    zip.file('parametros.txt', paramLines.join('\n'));

    // 3. resultados.csv
    const resHeader = 'Metrica,Valor';
    const resRows = [
      `Alumnos Simulados,${m.alumnos_simulados}`,
      `Titulados,${m.titulados}`,
      `Tasa Titulación (%),${m.tasa_titulacion_pct}`,
      `Semestres Promedio,${m.semestres_promedio}`,
      `Eficiencia Egreso,${m.eficiencia_egreso}`,
      `Egreso Oportuno (%),${m.egreso_oportuno_pct}`,
      `Eliminados TAmin,${m.eliminados_tamin}`,
      `Eliminados Oportunidades,${m.eliminados_opor}`,
      `Retención 1er Año (%),${m.retencion_1er_anio_pct}`,
      `Retención 3er Año (%),${m.retencion_3er_anio_pct}`,
    ];
    const distKeys = Object.keys(dist).map(Number).sort((a, b) => a - b);
    resRows.push('', 'Distribucion Semestres,');
    distKeys.forEach(k => resRows.push(`Semestre ${k},${dist[k]}`));
    zip.file('resultados.csv', [resHeader, ...resRows].join('\n'));

    // 4. ramos_criticos.csv
    const ramosHeader = 'Sigla,Intentos,Reprobaciones,Tasa_Fallo_%';
    const ramosRows = ramos.map((r: any) => `${r.sigla},${r.intentos},${r.reprobaciones},${r.tasa_fallo_pct}`);
    zip.file('ramos_criticos.csv', [ramosHeader, ...ramosRows].join('\n'));

    // Generar y descargar
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SimulaPUCV_${nombreMalla.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // ==========================================
  // RENDER: WIZARD PASOS
  // ==========================================
  const renderMallaStep = () => {
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
              <button onClick={() => {setMallaSetupMode('blanco'); setMalla([]); setTotalSemestres(4); setCurrentMallaId(null);}} className="flex flex-col items-center text-center p-6 border-2 border-slate-200 rounded-xl hover:border-slate-800 hover:bg-slate-100 transition-all group">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4"><FilePlus size={28} className="text-slate-700" /></div>
                <h3 className="font-bold text-slate-800 text-lg">Hoja en Blanco</h3>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col h-full animate-in fade-in relative">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 z-10 relative">
          <div className="flex items-center gap-3">
            <LayoutGrid size={20} className="text-blue-600" />
            <input type="text" value={nombreMalla} onChange={(e) => {setNombreMalla(e.target.value); setEstadoGuardado('SIN GUARDAR');}}
              className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
            />
            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ml-2 border ${estadoGuardado === 'GUARDADO' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
              {estadoGuardado}
            </span>
          </div>
          <div className="flex gap-4">
            <button onClick={handleGuardarMallaClick} className="text-sm font-semibold text-white bg-slate-800 px-4 py-1.5 rounded hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-sm">
              <Save size={16}/> Guardar Malla
            </button>
            <button onClick={() => setMallaSetupMode(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors underline">
              Cambiar método de inicio
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          <div className={`flex gap-4 overflow-x-auto flex-1 min-h-0 pb-4 transition-all duration-300 ${selectedSubject ? 'pr-[380px]' : ''}`}>
            {Array.from({ length: totalSemestres }).map((_, i) => {
              const sem = i + 1;
              const ramosDelSemestre = malla.filter(a => a.semestre === sem);
              const canAdd = ramosDelSemestre.length < 10;

              return (
                <div key={sem} className="min-w-[260px] max-w-[260px] bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-col h-full shrink-0 relative">
                  {sem === totalSemestres && sem > 4 && (
                    <button onClick={() => handleRemoveSemestre(sem)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors" title="Eliminar Semestre">
                      <Trash2 size={16}/>
                    </button>
                  )}
                  <h4 className="text-center font-bold text-slate-500 mb-4 text-xs uppercase tracking-wider">Semestre {sem}</h4>
                  <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                    {ramosDelSemestre.map((asig) => (
                      <div key={asig.id} onClick={() => openDrawer(asig)}
                        className={`bg-white p-3 rounded-lg border-2 shadow-sm transition-colors cursor-pointer group ${selectedSubject?.id === asig.id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-slate-300'}`}
                      >
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
            <div className="min-w-[260px] bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-xl p-3 flex items-center justify-center shrink-0">
              <button onClick={handleAddSemestre} className="text-slate-400 font-bold hover:text-blue-600 transition-colors flex flex-col items-center gap-2">
                <FilePlus size={24} /> Añadir Semestre {totalSemestres + 1}
              </button>
            </div>
          </div>

          {selectedSubject && drawerSubject && (
            <div className="w-[360px] bg-white border border-slate-200 shadow-[0_0_40px_rgba(0,0,0,0.1)] rounded-xl flex flex-col absolute right-0 top-0 bottom-0 z-30 animate-in slide-in-from-right-8 mb-4">
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center rounded-t-xl shrink-0">
                <div className="flex-1 mr-4">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Editar Asignatura</span>
                  <input type="text" value={drawerSubject.id} onChange={(e) => setDrawerSubject({...drawerSubject, id: e.target.value.toUpperCase()})}
                    className="font-bold text-xl mt-0.5 bg-transparent border-b border-slate-600 focus:border-white focus:outline-none w-full uppercase"
                  />
                </div>
                <button onClick={() => setSelectedSubject(null)} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {mallaErrorMsg && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded border border-red-200">{mallaErrorMsg}</div>}
                
                {/* DICTACIÓN */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dictación (OBLIGATORIO)</label>
                  <div className="flex gap-2 mt-1.5">
                    {['anual', 'semestral'].map(tipo => (
                      <button
                        key={tipo}
                        onClick={() => setDrawerSubject({...drawerSubject, dictacion: tipo as any})}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize border transition-colors ${
                          drawerSubject.dictacion === tipo 
                            ? 'bg-blue-100 border-blue-300 text-blue-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
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
                          <input type="text" value={req} onChange={(e) => handleDrawerReqChange(idx, e.target.value.toUpperCase())}
                            placeholder="SIGLA" className="flex-1 bg-transparent border-b border-slate-300 focus:border-blue-500 focus:outline-none text-sm font-bold text-slate-700 uppercase"
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

        <div className="flex justify-end pt-6 mt-4 border-t border-slate-200 gap-4 shrink-0">
          <button onClick={validateIntegrityAndNext} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all">
            Siguiente: Variables de Simulación <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderVariablesStep = () => {
    return (
      <div className="flex-1 flex flex-col h-full animate-in fade-in relative">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 z-10 relative">
          <div className="flex items-center gap-3">
            <Sliders size={20} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">Variables de Simulación</h3>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Definir Variables de Simulación (Estudiantes y Avance)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">NE (Número de Estudiantes)</label>
                <input type="number" value={variables.ne} onChange={(e) => setVariables({...variables, ne: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-slate-500 mt-1">Cantidad de estudiantes virtuales a generar por iteración.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">NCSmax (Créditos Máximos)</label>
                <input type="number" value={variables.ncsmax} onChange={(e) => setVariables({...variables, ncsmax: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-slate-500 mt-1">Tope de créditos permitidos en inscripción semestral.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Opor (Oportunidades Máximas)</label>
                <input type="number" value={variables.opor} onChange={(e) => setVariables({...variables, opor: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-slate-500 mt-1">Nº máximo de veces para cursar y reprobar una misma asignatura.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">TAmin (Tasa de Avance Mínima)</label>
                <input type="number" step="0.1" value={variables.tamin} onChange={(e) => setVariables({...variables, tamin: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-slate-500 mt-1">Créditos mínimos que se deben aprobar para no ser eliminado.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">NapTAmin (Semestre Aplicación TAmin)</label>
                <input type="number" value={variables.naptamin} onChange={(e) => setVariables({...variables, naptamin: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-slate-500 mt-1">Semestre en el que comienza a regir la eliminación por TAmin.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 mt-4 border-t border-slate-200 shrink-0">
          <button onClick={() => setWizardStep(1)} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
            <ChevronLeft size={18} /> Volver a la Malla
          </button>
          <button onClick={() => setWizardStep(3)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all">
            Siguiente: Modelo Calificaciones <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderModelosStep = () => {
    return (
      <div className="flex-1 flex flex-col h-full animate-in fade-in relative">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 z-10 relative">
          <div className="flex items-center gap-3">
            <BarChart3 size={20} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">Modelo de Calificaciones</h3>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Configurar Modelo Estocástico de Calificaciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2">Ciclo Básico (Sem 1 al 4)</h4>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">VMap1234 (Valor Medio Aprob.)</label>
                <input type="number" step="0.01" value={modeloCalif.vmap1234} onChange={(e) => setModeloCalif({...modeloCalif, vmap1234: Number(e.target.value)})} className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Delta1234 (Desviación)</label>
                <input type="number" step="0.01" value={modeloCalif.delta1234} onChange={(e) => setModeloCalif({...modeloCalif, delta1234: Number(e.target.value)})} className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2">Ciclo Profesional (Sem 5 al 8)</h4>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">VMap5678 (Valor Medio Aprob.)</label>
                <input type="number" step="0.01" value={modeloCalif.vmap5678} onChange={(e) => setModeloCalif({...modeloCalif, vmap5678: Number(e.target.value)})} className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Delta5678 (Desviación)</label>
                <input type="number" step="0.01" value={modeloCalif.delta5678} onChange={(e) => setModeloCalif({...modeloCalif, delta5678: Number(e.target.value)})} className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2">Ciclo Titulación (Sem 9+)</h4>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">VMapM (Valor Medio Aprob.)</label>
                <input type="number" step="0.01" value={modeloCalif.vmapm} onChange={(e) => setModeloCalif({...modeloCalif, vmapm: Number(e.target.value)})} className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">DeltaM (Desviación)</label>
                <input type="number" step="0.01" value={modeloCalif.deltam} onChange={(e) => setModeloCalif({...modeloCalif, deltam: Number(e.target.value)})} className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 mt-4 border-t border-slate-200 shrink-0">
          <button onClick={() => setWizardStep(2)} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
            <ChevronLeft size={18} /> Volver a Variables
          </button>
          <button onClick={() => setWizardStep(4)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all">
            Siguiente: Revisión Final <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderResumenStep = () => {
    return (
      <div className="flex-1 flex flex-col h-full animate-in fade-in relative">
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-200">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <Rocket size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Resumen de la Simulación</h2>
              <p className="text-slate-500 font-medium mt-1">Verifica todos los parámetros ingresados antes de ejecutar el motor de Montecarlo.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                <LayoutGrid className="text-blue-500" size={20} />
                <h3 className="font-bold text-slate-800 text-lg">Malla Curricular</h3>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">Nombre</span> <span className="font-black text-slate-900 truncate ml-2">{nombreMalla}</span></li>
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">Asignaturas</span> <span className="font-black text-slate-900">{malla.length}</span></li>
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">Semestres Totales</span> <span className="font-black text-slate-900">{totalSemestres}</span></li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                <Sliders className="text-blue-500" size={20} />
                <h3 className="font-bold text-slate-800 text-lg">Variables</h3>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">NE (Alumnos)</span> <span className="font-black text-slate-900">{variables.ne}</span></li>
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">NCSmax (Créditos Máx)</span> <span className="font-black text-slate-900">{variables.ncsmax}</span></li>
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">TAmin (Avance Mín)</span> <span className="font-black text-slate-900">{variables.tamin}</span></li>
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">NapTAmin (Semestre Aplic)</span> <span className="font-black text-slate-900">{variables.naptamin}</span></li>
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">Opor (Oportunidades)</span> <span className="font-black text-slate-900">{variables.opor}</span></li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                <BarChart3 className="text-blue-500" size={20} />
                <h3 className="font-bold text-slate-800 text-lg">Modelo Estocástico</h3>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">VMap1234 (Media Básica)</span> <span className="font-black text-slate-900">{modeloCalif.vmap1234}</span></li>
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">Delta1234 (Desv Básica)</span> <span className="font-black text-slate-900">{modeloCalif.delta1234}</span></li>
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">VMap5678 (Media Prof.)</span> <span className="font-black text-slate-900">{modeloCalif.vmap5678}</span></li>
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">Delta5678 (Desv Prof.)</span> <span className="font-black text-slate-900">{modeloCalif.delta5678}</span></li>
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">VMapM (Media Titulación)</span> <span className="font-black text-slate-900">{modeloCalif.vmapm}</span></li>
                <li className="flex justify-between"><span className="text-slate-500 font-semibold">DeltaM (Desv Titulación)</span> <span className="font-black text-slate-900">{modeloCalif.deltam}</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 mt-4 border-t border-slate-200 shrink-0">
          <button onClick={() => setWizardStep(3)} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
            <ChevronLeft size={18} /> Volver
          </button>
          <button onClick={handleRunSimulation} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-green-500/30 transition-all text-lg">
            <Play size={20} className="fill-white" /> Iniciar Simulación
          </button>
        </div>
      </div>
    );
  };

  const renderResultadosStep = () => {
    // Estado: Simulando
    if (isSimulating) {
      return (
        <div className="flex-1 flex flex-col h-full animate-in fade-in relative">
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8 relative">
              <Loader2 size={48} className="text-blue-600 animate-spin absolute" />
              <Activity size={24} className="text-blue-400" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Simulando...</h2>
            <p className="text-slate-500 max-w-md text-lg">El motor de Montecarlo está procesando a los estudiantes con Golang.</p>
          </div>
        </div>
      );
    }

    // Sin resultados
    if (!simResults) return null;

    const m = simResults.metricas_globales;
    const dist = simResults.distribucion_semestres || {};
    const ramos = simResults.ramos_criticos || [];

    // Preparar datos del histograma
    const semKeys = Object.keys(dist).map(Number).sort((a, b) => a - b);
    const maxCount = semKeys.length > 0 ? Math.max(...semKeys.map(k => dist[k])) : 1;

    // Helper: color por calidad del KPI
    const kpiColor = (value: number, thresholds: [number, number]) => {
      if (value >= thresholds[1]) return 'text-green-600';
      if (value >= thresholds[0]) return 'text-amber-600';
      return 'text-red-600';
    };

    const kpiBg = (value: number, thresholds: [number, number]) => {
      if (value >= thresholds[1]) return 'bg-green-50 border-green-200';
      if (value >= thresholds[0]) return 'bg-amber-50 border-amber-200';
      return 'bg-red-50 border-red-200';
    };

    return (
      <div className="flex-1 flex flex-col h-full animate-in fade-in overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 shrink-0 gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                <BarChart3 size={22} className="text-green-600" />
              </div>
              Resultados de la Simulación
            </h2>
            <p className="text-slate-500 mt-1 ml-0 sm:ml-[52px] text-sm">
              {m.alumnos_simulados} estudiantes simulados · Motor Montecarlo
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handleDownloadZip}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all text-xs sm:text-sm animate-pulse hover:animate-none"
            >
              <Download size={16} /> Descargar (.zip)
            </button>
            <button
              onClick={() => setWizardStep(4)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 sm:px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs sm:text-sm"
            >
              <ArrowLeft size={16} /> Volver
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 shrink-0">
          {/* Tasa de Titulación */}
          <div className={`rounded-xl border p-5 ${kpiBg(m.tasa_titulacion_pct, [30, 50])}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tasa de Titulación (PPE)</p>
            <p className={`text-3xl font-black ${kpiColor(m.tasa_titulacion_pct, [30, 50])}`}>
              {m.tasa_titulacion_pct}%
            </p>
            <p className="text-xs text-slate-500 mt-1">{m.titulados} de {m.alumnos_simulados} egresaron</p>
          </div>

          {/* Semestres Promedio */}
          <div className="rounded-xl border bg-slate-50 border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Semestres Promedio (PSCE)</p>
            <p className="text-3xl font-black text-slate-800">{m.semestres_promedio}</p>
            <p className="text-xs text-slate-500 mt-1">Semestres para titularse</p>
          </div>

          {/* Eficiencia de Egreso */}
          <div className={`rounded-xl border p-5 ${m.eficiencia_egreso <= 1.3 ? 'bg-green-50 border-green-200' : m.eficiencia_egreso <= 1.6 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Eficiencia de Egreso (EE)</p>
            <p className={`text-3xl font-black ${m.eficiencia_egreso <= 1.3 ? 'text-green-600' : m.eficiencia_egreso <= 1.6 ? 'text-amber-600' : 'text-red-600'}`}>
              {m.eficiencia_egreso}
            </p>
            <p className="text-xs text-slate-500 mt-1">{m.eficiencia_egreso <= 1.0 ? 'Ideal' : `${((m.eficiencia_egreso - 1) * 100).toFixed(0)}% sobre el tiempo teórico`}</p>
          </div>

          {/* Egreso Oportuno */}
          <div className={`rounded-xl border p-5 ${kpiBg(m.egreso_oportuno_pct, [5, 20])}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Egreso Oportuno (PEO)</p>
            <p className={`text-3xl font-black ${kpiColor(m.egreso_oportuno_pct, [5, 20])}`}>
              {m.egreso_oportuno_pct}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Se titularon dentro del plazo</p>
          </div>

          {/* Retención 1er Año */}
          <div className={`rounded-xl border p-5 ${kpiBg(m.retencion_1er_anio_pct, [70, 85])}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Retención 1er Año</p>
            <p className={`text-3xl font-black ${kpiColor(m.retencion_1er_anio_pct, [70, 85])}`}>
              {m.retencion_1er_anio_pct}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Sobreviven al 1er año</p>
          </div>

          {/* Retención 3er Año */}
          <div className={`rounded-xl border p-5 ${kpiBg(m.retencion_3er_anio_pct, [50, 70])}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Retención 3er Año</p>
            <p className={`text-3xl font-black ${kpiColor(m.retencion_3er_anio_pct, [50, 70])}`}>
              {m.retencion_3er_anio_pct}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Sobreviven al 3er año</p>
          </div>
        </div>

        {/* Eliminados breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 shrink-0">
          <div className="rounded-xl border bg-orange-50 border-orange-200 p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle size={24} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-800">Eliminados por Tasa de Avance</p>
              <p className="text-2xl font-black text-orange-600">{m.eliminados_tamin} <span className="text-sm font-normal text-orange-500">estudiantes</span></p>
            </div>
          </div>
          <div className="rounded-xl border bg-red-50 border-red-200 p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <X size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800">Eliminados por Oportunidades</p>
              <p className="text-2xl font-black text-red-600">{m.eliminados_opor} <span className="text-sm font-normal text-red-500">estudiantes</span></p>
            </div>
          </div>
        </div>

        {/* Histograma de distribución */}
        {semKeys.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6 shrink-0">
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              <BarChart size={20} className="text-blue-500" />
              Distribución de Semestres de Titulación
            </h3>
            <p className="text-xs text-slate-500 mb-5">Cantidad de estudiantes que se titularon en cada semestre</p>

            <div className="flex items-end gap-1.5" style={{ height: '200px' }}>
              {semKeys.map(sem => {
                const count = dist[sem];
                const heightPct = (count / maxCount) * 100;
                return (
                  <div key={sem} className="flex-1 flex flex-col items-center justify-end h-full group">
                    {/* Tooltip */}
                    <div className="text-xs font-bold text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {count}
                    </div>
                    {/* Barra */}
                    <div
                      className="w-full rounded-t-md transition-all duration-300 group-hover:opacity-80"
                      style={{
                        height: `${Math.max(heightPct, 3)}%`,
                        backgroundColor: sem <= totalSemestres ? '#22c55e' : sem <= totalSemestres + 2 ? '#3b82f6' : sem <= totalSemestres + 6 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                    {/* Label */}
                    <span className="text-[10px] text-slate-500 mt-1.5 font-medium">S{sem}</span>
                  </div>
                );
              })}
            </div>

            {/* Leyenda */}
            <div className="flex items-center gap-5 mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                <span className="text-[11px] text-slate-500">En tiempo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-[11px] text-slate-500">Oportuno (+2 sem)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-500" />
                <span className="text-[11px] text-slate-500">Atrasado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-500" />
                <span className="text-[11px] text-slate-500">Muy atrasado (+6 sem)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de Ramos Críticos */}
        {ramos.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6 shrink-0">
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500" />
              Ramos Críticos
            </h3>
            <p className="text-xs text-slate-500 mb-4">Asignaturas rankeadas por tasa de fallo durante la simulación</p>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-500">#</th>
                    <th className="text-left px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-500">Sigla</th>
                    <th className="text-center px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-500">Intentos</th>
                    <th className="text-center px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-500">Reprobaciones</th>
                    <th className="text-right px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-500">Tasa de Fallo</th>
                  </tr>
                </thead>
                <tbody>
                  {ramos.slice(0, 15).map((ramo: any, idx: number) => (
                    <tr key={ramo.sigla} className={`border-t border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors`}>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800">{ramo.sigla}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{ramo.intentos}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{ramo.reprobaciones}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`inline-flex items-center gap-1 font-bold ${
                          ramo.tasa_fallo_pct >= 40 ? 'text-red-600' :
                          ramo.tasa_fallo_pct >= 25 ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {ramo.tasa_fallo_pct}%
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden ml-1">
                            <div
                              className={`h-full rounded-full ${
                                ramo.tasa_fallo_pct >= 40 ? 'bg-red-500' :
                                ramo.tasa_fallo_pct >= 25 ? 'bg-amber-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(ramo.tasa_fallo_pct, 100)}%` }}
                            />
                          </div>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ramos.length > 15 && (
                <div className="px-4 py-2 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-200">
                  Mostrando los 15 ramos más críticos de {ramos.length} totales
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configuración usada (collapsible) */}
        <details className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 shrink-0 group">
          <summary className="px-6 py-4 cursor-pointer select-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Sliders size={16} className="text-slate-500" />
              Configuración Utilizada
            </h3>
            <ChevronRight size={16} className="text-slate-400 group-open:rotate-90 transition-transform" />
          </summary>
          <div className="px-6 pb-5 pt-2 grid grid-cols-3 gap-4 border-t border-slate-100">
            {/* Malla */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Malla</p>
              <p className="text-sm text-slate-700"><strong>{malla.length}</strong> asignaturas</p>
              <p className="text-sm text-slate-700"><strong>{totalSemestres}</strong> semestres</p>
            </div>
            {/* Variables */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Variables</p>
              <p className="text-sm text-slate-700">NE = <strong>{variables.ne}</strong></p>
              <p className="text-sm text-slate-700">NCSmax = <strong>{variables.ncsmax}</strong></p>
              <p className="text-sm text-slate-700">TAmin = <strong>{variables.tamin}</strong></p>
              <p className="text-sm text-slate-700">NapTAmin = <strong>{variables.naptamin}</strong></p>
              <p className="text-sm text-slate-700">Opor = <strong>{variables.opor}</strong></p>
            </div>
            {/* Modelo */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Modelo Estocástico</p>
              <p className="text-sm text-slate-700">Básico: <strong>{modeloCalif.vmap1234}</strong> ± {modeloCalif.delta1234}</p>
              <p className="text-sm text-slate-700">Profesional: <strong>{modeloCalif.vmap5678}</strong> ± {modeloCalif.delta5678}</p>
              <p className="text-sm text-slate-700">Titulación: <strong>{modeloCalif.vmapm}</strong> ± {modeloCalif.deltam}</p>
            </div>
          </div>
        </details>

        {/* Acciones finales */}
        <div className="flex justify-between pt-4 border-t border-slate-200 shrink-0 mb-4">
          <button
            onClick={() => setWizardStep(4)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
          >
            <ArrowLeft size={18} /> Modificar Parámetros
          </button>
          <button
            onClick={handleRunSimulation}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all"
          >
            <Play size={18} /> Ejecutar de Nuevo
          </button>
        </div>
      </div>
    );
  };

  const renderWizardStepIndicator = () => {
    const steps = [
      { num: 1, label: 'Diseño de Malla' },
      { num: 2, label: 'Variables de Simulación' },
      { num: 3, label: 'Modelo de Calificaciones' },
      { num: 4, label: 'Resumen y Verificación' },
    ];

    if (wizardStep === 5) return null; // No mostrar stepper durante simulación

    return (
      <div className="flex items-center justify-center w-full max-w-4xl mx-auto py-6 mb-12">
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
              <span className={`absolute top-12 text-[11px] uppercase tracking-wider font-bold w-max max-w-[140px] text-center ${
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

  const renderSidebarButton = (id: string, icon: any, label: string) => (
    <button 
      onClick={() => {
        setActiveTab(id);
        setSidebarOpen(false);
        if (id === 'mallas') fetchMallasGuardadas();
        if (id === 'resultados_pasados') fetchResultadosPasados();
      }} 
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
    >
      {React.cloneElement(icon, { size: 18 })} {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* ========================================== */}
      {/* MODALES DE VALIDACIÓN Y MALLAS GUARDADAS   */}
      {/* ========================================== */}
      {validationErrors.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white border-2 border-red-500 rounded-xl shadow-2xl max-w-2xl w-full p-6 relative animate-in zoom-in-95">
            <button onClick={() => setValidationErrors([])} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 rounded-full p-1 transition-colors"><X size={20}/></button>
            <div className="flex items-center gap-3 mb-4"><AlertCircle className="text-red-500" size={28}/><h3 className="text-xl font-bold text-slate-800">Se encontraron errores en la malla</h3></div>
            <p className="text-sm text-slate-600 mb-4">Antes de continuar, debes corregir los siguientes problemas de integridad:</p>
            <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {validationErrors.map((err, idx) => (
                <li key={idx} className="text-sm text-red-800 bg-red-50 p-3 rounded-lg border border-red-200 shadow-sm flex items-start gap-2">
                  <span className="font-bold text-red-500 shrink-0">•</span><span>{err}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setValidationErrors([])} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Entendido, ir a corregir</button>
            </div>
          </div>
        </div>
      )}

      {showGuardarMallaModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95">
            <button onClick={() => setShowGuardarMallaModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition-colors"><X size={20}/></button>
            <div className="flex items-center gap-3 mb-4"><Save className="text-blue-600" size={28}/><h3 className="text-xl font-bold text-slate-800">¿Quieres guardar esta malla?</h3></div>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
              <p className="text-sm text-slate-900 font-bold">Resumen del Plan:</p>
              <ul className="text-sm font-medium text-slate-900 mt-1">
                <li>• <span className="font-black">{malla.length}</span> Asignaturas creadas</li>
                <li>• <span className="font-black">{totalSemestres}</span> Semestres en total</li>
              </ul>
            </div>

            <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de la Malla</label>
            <input type="text" value={nombreGuardarInput} onChange={(e) => setNombreGuardarInput(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"/>
            {currentMallaId ? (
              <div className="flex flex-col gap-3 mt-6">
                <button onClick={() => confirmGuardarMalla('sobrescribir')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center justify-center gap-2"><Check size={18}/> Sobrescribir Existente</button>
                <button onClick={() => confirmGuardarMalla('nueva')} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center justify-center gap-2"><FilePlus size={18}/> Guardar como Nueva</button>
              </div>
            ) : (
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => confirmGuardarMalla('nueva')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-md flex items-center gap-2"><Check size={18}/> Guardar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showMallasGuardadasModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 relative animate-in zoom-in-95 flex flex-col max-h-[80vh]">
            <button onClick={() => setShowMallasGuardadasModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition-colors"><X size={20}/></button>
            <div className="flex items-center gap-3 mb-6 shrink-0"><Search className="text-purple-600" size={28}/><h3 className="text-xl font-bold text-slate-800">Seleccionar Malla Guardada</h3></div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {mallasGuardadas.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200"><LayoutGrid size={40} className="mx-auto text-slate-300 mb-3" /><p className="text-slate-500 font-medium">No tienes ninguna malla guardada por ahora.</p></div>
              ) : (
                mallasGuardadas.map(mg => (
                  <div key={mg.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 transition-colors shadow-sm">
                    <div><h4 className="font-bold text-slate-800 text-lg">{mg.nombre}</h4><div className="flex gap-4 mt-1 text-xs font-semibold text-slate-500"><span>{mg.asignaturas.length} Asignaturas</span><span>{mg.totalSemestres} Semestres</span><span>Guardado el: {mg.fecha}</span></div></div>
                    <button onClick={() => loadMallaGuardada(mg)} className="bg-green-100 text-green-700 hover:bg-green-200 font-bold px-4 py-2 rounded-lg transition-colors">Utilizar Malla</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR PRINCIPAL */}
      <aside className={`fixed lg:relative top-0 left-0 h-full w-64 bg-slate-900 text-white flex flex-col shadow-xl z-40 shrink-0 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2"><Activity className="text-blue-400" /> SimulaPUCV</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Simulación</div>
        <nav className="px-4 space-y-1">
          <button 
            onClick={() => {
              setActiveTab('wizard');
              setWizardStep(1);
              setMallaSetupMode(null);
              setSelectedSubject(null);
              setMalla([]);
              setCurrentMallaId(null);
              setTotalSemestres(4);
              setNombreMalla("Plan de Estudios (Base)");
              setEstadoGuardado('SIN GUARDAR');
              setSidebarOpen(false);
            }} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'wizard' && !mallaSetupMode ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            <Play size={18} /> Nueva Simulación
          </button>
          
          <button 
            onClick={() => { setActiveTab('wizard'); setSidebarOpen(false); }}
            disabled={!mallaSetupMode || activeTab === 'wizard'}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all mt-1 ${(!mallaSetupMode || activeTab === 'wizard') ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            <Play size={18} /> Continuar Simulación
          </button>

          <div className="pt-2">
            {renderSidebarButton('log', <FileText/>, 'Log Pasado')}
            {renderSidebarButton('ultimo_resultado', <BarChart/>, 'Último Resultado')}
            {renderSidebarButton('resultados_pasados', <History/>, 'Resultados Pasados')}
          </div>
        </nav>

        <div className="p-4 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Biblioteca</div>
        <nav className="flex-1 px-4 space-y-1">
          {renderSidebarButton('mallas', <LayoutGrid/>, 'Mallas Guardadas')}
        </nav>

        {isAdmin && (
          <>
            <div className="p-4 mt-2 text-xs font-bold text-amber-400 uppercase tracking-wider">Administración</div>
            <nav className="px-4 space-y-1">
              <button
                onClick={() => { setActiveTab('admin'); fetchAdminUsuarios(); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'admin' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Shield size={18} /> Gestión de Usuarios
              </button>
            </nav>
          </>
        )}

        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-red-500/20 flex items-center justify-center gap-2">
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative p-4 sm:p-6 lg:p-8 pb-4">
        {/* HAMBURGER BUTTON (MOBILE) */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-20 bg-slate-900 text-white p-2 rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
        >
          <Menu size={20} />
        </button>
        {activeTab === 'wizard' && (
          <>
            <div className="mb-4 mt-2 shrink-0">
              <h2 className="text-2xl font-black text-slate-800 text-center">Configurar Nueva Simulación</h2>
            </div>
            {renderWizardStepIndicator()}
            {wizardStep === 1 && renderMallaStep()}
            {wizardStep === 2 && renderVariablesStep()}
            {wizardStep === 3 && renderModelosStep()}
            {wizardStep === 4 && renderResumenStep()}
            {wizardStep === 5 && renderResultadosStep()}
          </>
        )}

        {activeTab === 'mallas' && (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-12">
            <div className="w-full max-w-4xl">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200">
                <LayoutGrid size={32} className="text-blue-600" />
                <h2 className="text-2xl font-bold text-slate-800">Tus Mallas Guardadas</h2>
              </div>
              
              {mallasGuardadas.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <LayoutGrid size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 text-lg font-medium">No tienes ninguna malla guardada por ahora.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mallasGuardadas.map(mg => (
                    <div key={mg.id} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <h4 className="font-bold text-slate-800 text-lg mb-2">{mg.nombre}</h4>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded">{mg.asignaturas.length} Asignaturas</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">{mg.totalSemestres} Semestres</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">Fecha: {mg.fecha}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'resultados_pasados' && (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
              <History size={28} className="text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Resultados Pasados</h2>
                <p className="text-sm text-slate-500">{resultadosPasados.length} simulaciones registradas</p>
              </div>
            </div>
            {resultadosPasados.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 text-lg font-medium">Aún no has ejecutado ninguna simulación.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {resultadosPasados.map((r: any) => (
                  <div key={r.id} className="p-5 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-800 text-lg">{r.malla_nombre}</h4>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{new Date(r.created_at).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Malla</p>
                        <p className="text-sm text-slate-700"><strong>{r.total_asignaturas}</strong> asignaturas · <strong>{r.total_semestres}</strong> semestres</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Simulación</p>
                        <p className="text-sm text-slate-700"><strong>{r.metricas_globales?.alumnos_simulados}</strong> alumnos simulados</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className={`px-3 py-1 rounded-lg font-bold ${r.metricas_globales?.tasa_titulacion_pct >= 50 ? 'bg-green-100 text-green-700' : r.metricas_globales?.tasa_titulacion_pct >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        PPE: {r.metricas_globales?.tasa_titulacion_pct}%
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">PSCE: {r.metricas_globales?.semestres_promedio}</span>
                      <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">EE: {r.metricas_globales?.eficiencia_egreso}</span>
                      <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold">PEO: {r.metricas_globales?.egreso_oportuno_pct}%</span>
                      <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold">Ret 1°: {r.metricas_globales?.retencion_1er_anio_pct}%</span>
                      <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold">Ret 3°: {r.metricas_globales?.retencion_3er_anio_pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ultimo_resultado' && (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-8">
            {simResults ? (
              <div className="w-full max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                  <BarChart3 size={28} className="text-green-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Último Resultado</h2>
                    <p className="text-sm text-slate-500">Malla: {nombreMalla} · {malla.length} asignaturas · {totalSemestres} semestres · {malla.reduce((s, a) => s + a.cred, 0)} créditos</p>
                  </div>
                </div>

                {/* KPIs principales */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Tasa Titulación (PPE)</p>
                    <p className="text-2xl font-black text-blue-600">{simResults.metricas_globales?.tasa_titulacion_pct}%</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Semestres Promedio (PSCE)</p>
                    <p className="text-2xl font-black text-slate-800">{simResults.metricas_globales?.semestres_promedio}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Egreso Oportuno (PEO)</p>
                    <p className="text-2xl font-black text-green-600">{simResults.metricas_globales?.egreso_oportuno_pct}%</p>
                  </div>
                </div>

                {/* Métricas secundarias */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase">NE</p>
                    <p className="text-lg font-black text-slate-700">{simResults.metricas_globales?.alumnos_simulados}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase">Eficiencia</p>
                    <p className="text-lg font-black text-slate-700">{simResults.metricas_globales?.eficiencia_egreso}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase">Ret. 1° año</p>
                    <p className="text-lg font-black text-slate-700">{simResults.metricas_globales?.retencion_1er_anio_pct}%</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase">Ret. 3° año</p>
                    <p className="text-lg font-black text-slate-700">{simResults.metricas_globales?.retencion_3er_anio_pct}%</p>
                  </div>
                </div>

                {/* Hiperparámetros usados */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Hiperparámetros usados</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">NCSmax: {variables.ncsmax}</span>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">TAmin: {variables.tamin}</span>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">NapTAmin: {variables.naptamin}</span>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">Opor: {variables.opor}</span>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">VMap Básico: {modeloCalif.vmap1234}</span>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">VMap Prof: {modeloCalif.vmap5678}</span>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-semibold">VMap Tit: {modeloCalif.vmapm}</span>
                  </div>
                </div>

                <button onClick={() => { setActiveTab('wizard'); setWizardStep(5); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
                  <BarChart3 size={16} /> Ver Dashboard Completo
                </button>
              </div>
            ) : (
              <div className="text-center py-20">
                <Activity size={48} className="mx-auto text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Sin resultados recientes</h2>
                <p className="text-slate-500">Ejecuta una simulación primero para ver resultados aquí.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'log' && (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
              <FileText size={28} className="text-slate-600" />
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Log de Datos (JSON)</h2>
                {simResults && <p className="text-sm text-slate-500">Malla: {nombreMalla} · {malla.length} asignaturas · {simResults.metricas_globales?.alumnos_simulados} alumnos</p>}
              </div>
            </div>
            {simResults ? (
              <>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-bold text-slate-400">PPE</p>
                    <p className="text-lg font-black text-blue-600">{simResults.metricas_globales?.tasa_titulacion_pct}%</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-bold text-slate-400">PSCE</p>
                    <p className="text-lg font-black text-slate-700">{simResults.metricas_globales?.semestres_promedio}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-bold text-slate-400">PEO</p>
                    <p className="text-lg font-black text-green-600">{simResults.metricas_globales?.egreso_oportuno_pct}%</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-bold text-slate-400">EE</p>
                    <p className="text-lg font-black text-slate-700">{simResults.metricas_globales?.eficiencia_egreso}</p>
                  </div>
                </div>
                <pre className="bg-slate-900 text-green-400 p-6 rounded-xl text-xs overflow-auto max-h-[60vh] font-mono leading-relaxed">
                  {JSON.stringify(simResults, null, 2)}
                </pre>
              </>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 text-lg font-medium">No hay datos de simulación para mostrar.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'admin' && isAdmin && (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
              <Shield size={28} className="text-amber-600" />
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Panel de Administración</h2>
                <p className="text-sm text-slate-500">Gestiona las cuentas de usuario de la plataforma</p>
              </div>
            </div>

            {adminUsuarios.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <Users size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 text-lg font-medium">No hay usuarios registrados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                      <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                      <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                      <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                      <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Registro</th>
                      <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsuarios.map((u: any) => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${u.is_admin ? 'bg-amber-500' : 'bg-blue-500'}`}>
                              {u.email[0].toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-800">{u.email}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${u.is_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            <span className={`w-2 h-2 rounded-full ${u.is_approved ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {u.is_approved ? 'Aprobado' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {u.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                              <Shield size={12} /> Admin
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Usuario</span>
                          )}
                        </td>
                        <td className="p-4 text-center text-sm text-slate-500">
                          {new Date(u.created_at).toLocaleDateString('es-CL')}
                        </td>
                        <td className="p-4 text-center">
                          {!u.is_admin && (
                            <button
                              onClick={() => handleToggleApproval(u.id, u.is_approved)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${u.is_approved ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                            >
                              {u.is_approved ? 'Revocar' : 'Aprobar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm text-slate-600">
                    <span className="font-bold">{adminUsuarios.length}</span> usuarios registrados · 
                    <span className="font-bold text-emerald-600"> {adminUsuarios.filter((u: any) => u.is_approved).length}</span> aprobados · 
                    <span className="font-bold text-red-600"> {adminUsuarios.filter((u: any) => !u.is_approved).length}</span> pendientes
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}