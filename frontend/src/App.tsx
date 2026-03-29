import React, { useState } from 'react';
import { 
  BarChart3, Settings, Users, BookOpen, Play, Save, FolderOpen,
  ChevronRight, AlertTriangle, Search, FileUp, X, PieChart, LineChart,
  Plus, Trash2, Edit2, Link
} from 'lucide-react';

// --- TYPES & INTERFACES ---
interface Subject {
  id: string;
  name: string;
  rate: string;
  impact: 'Alto' | 'Medio' | 'Bajo';
}

interface Student {
  id: string;
  name: string;
  profile: string;
  status: string;
  semesters: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('malla');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentScenario, setCurrentScenario] = useState<string>('Escenario Original 10ma');
  
  // Drill-down states
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setActiveTab('dashboard');
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20 relative">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="text-blue-400" />
            SimulaPUCV
          </h1>
          <p className="text-xs text-slate-400 mt-1">Ing. Civil Eléctrica</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavItem icon={<BarChart3 />} label="Resultados Globales" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Settings />} label="Hiperparámetros" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
          <NavItem icon={<BookOpen />} label="Malla y Asignaturas" active={activeTab === 'malla'} onClick={() => setActiveTab('malla')} />
          <NavItem icon={<Users />} label="Gestión de Alumnos" active={activeTab === 'alumnos'} onClick={() => setActiveTab('alumnos')} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleSimulate}
            disabled={isSimulating}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              isSimulating ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-lg hover:shadow-blue-500/20'
            }`}
          >
            {isSimulating ? <span className="animate-pulse">Calculando iteraciones...</span> : <><Play size={18} /> Iniciar Simulación</>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-700">
              {activeTab === 'dashboard' ? 'Resultados de Simulación' : 
               activeTab === 'config' ? 'Configuración del Algoritmo' :
               activeTab === 'malla' ? 'Customización de Malla' : 'Gestión de Cohorte'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Escenario Activo:</span>
              <select 
                value={currentScenario}
                onChange={(e) => setCurrentScenario(e.target.value)}
                className="text-xs font-semibold text-blue-600 bg-transparent border-none focus:ring-0 cursor-pointer hover:bg-slate-50 rounded p-1"
              >
                <option>Escenario Original 10ma</option>
                <option>Prueba: Sin Prerrequisito FIS115</option>
                <option>Prueba: Tasa de Avance Flexible</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <FolderOpen size={16} /> Cargar
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors shadow-sm">
              <Save size={16} /> Guardar Escenario
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 relative">
          {activeTab === 'dashboard' && <DashboardView onSelectSubject={setSelectedSubject} onSelectStudent={setSelectedStudent} />}
          {activeTab === 'config' && <ConfigView />}
          {activeTab === 'malla' && <MallaView />}
          {activeTab === 'alumnos' && <AlumnosView />}
        </div>

        {/* Modals for Drill-Down */}
        {selectedSubject && <SubjectResultModal subject={selectedSubject} onClose={() => setSelectedSubject(null)} />}
        {selectedStudent && <StudentResultModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
      </main>
    </div>
  );
}

// --- VIEWS ---

function DashboardView({ onSelectSubject, onSelectStudent }: { onSelectSubject: (s: Subject) => void, onSelectStudent: (s: Student) => void }) {
  const mockSubjects: Subject[] = [
    { id: 'FIS115', name: 'Física General I', rate: '53%', impact: 'Alto' },
    { id: 'MAT116', name: 'Cálculo II', rate: '50%', impact: 'Alto' },
    { id: 'EIE133', name: 'Análisis de Redes', rate: '49%', impact: 'Medio' },
  ];

  const mockStudents: Student[] = [
    { id: '2026-001', name: 'Alumno Ficticio A', profile: 'Promedio', status: 'Egresado', semesters: 14 },
    { id: '2026-002', name: 'Alumno Ficticio B', profile: 'Riesgo', status: 'Eliminado', semesters: 4 },
    { id: '2026-003', name: 'Alumno Ficticio C', profile: 'Sobresaliente', status: 'Egresado', semesters: 11 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Tasa de Titulación" value="42.5%" trend="+2.1%" />
        <KpiCard title="Semestres Promedio" value="16.4" sub="Ideal: 12.0" isNegative />
        <KpiCard title="Tasa de Retención" value="68.2%" trend="-1.5%" isNegative />
        <KpiCard title="Eficiencia de Malla" value="73%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-500"/> Distribución de Tiempos de Titulación
          </h3>
          <div className="h-64 flex items-end gap-2 mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            {[12, 13, 14, 15, 16, 17, 18, 19, 20].map((sem, i) => {
              const height = [5, 10, 25, 40, 60, 80, 45, 20, 10][i];
              return (
                <div key={sem} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-blue-500 rounded-t-sm relative group cursor-pointer hover:bg-blue-400 transition-all" style={{ height: `${height}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                      {height} alumnos
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-500">{sem}s</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            Top Asignaturas Críticas
          </h3>
          <p className="text-xs text-slate-500 mb-4">Haz clic para ver notas simuladas por certamen.</p>
          <div className="space-y-3 flex-1 overflow-auto pr-2">
            {mockSubjects.map(sub => (
              <div 
                key={sub.id} 
                onClick={() => onSelectSubject(sub)}
                className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 rounded-lg border border-slate-200 cursor-pointer transition-colors group"
              >
                <div>
                  <div className="text-sm font-bold text-slate-800 group-hover:text-blue-700">{sub.id}</div>
                  <div className="text-xs text-slate-500 truncate w-28">{sub.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Reprueban</div>
                  <div className="text-sm font-bold text-red-600">{sub.rate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigView() {
  return (
    <div className="max-w-4xl bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
      <h3 className="text-xl font-bold mb-6 text-slate-800 border-b border-slate-100 pb-4">Parámetros del Algoritmo</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <NumberInput label="Tasa de Avance Mínima (TAmin)" desc="Créditos mínimos aprobados para no ser eliminado." defaultVal={12.3} step={0.1} />
        <NumberInput label="Créditos Máx. Semestre (NCSmax)" desc="Tope de créditos permitidos en inscripción." defaultVal={21} step={1} />
        <NumberInput label="Oportunidades de Reprobación (Opor)" desc="Veces máximas que puede cursar un ramo." defaultVal={6} step={1} />
        <NumberInput label="Iteraciones Montecarlo" desc="Cantidad de veces que se repite la simulación." defaultVal={10000} step={1000} />
      </div>
    </div>
  );
}

function MallaView() {
  const [selectedSubject, setSelectedSubject] = useState<string | null>('MAT111');

  return (
    <div className="flex flex-col h-full animate-in fade-in gap-4">
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-4">
          <select className="border border-slate-300 rounded-lg text-sm p-2 bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Malla Civil Eléctrica - Plan 10me</option>
            <option>Malla Civil Eléctrica - Plan 10ma</option>
          </select>
        </div>
        <button className="flex items-center gap-2 bg-blue-50 text-blue-700 font-bold px-4 py-2 rounded-lg text-sm hover:bg-blue-100 transition-colors border border-blue-200">
          <Plus size={16} /> Añadir Asignatura a la Malla
        </button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Grilla de la Malla */}
        <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="flex gap-4 h-full">
            {[1, 2, 3].map(sem => (
              <div key={sem} className="min-w-[240px] bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
                <h4 className="text-center font-bold text-slate-500 mb-3 text-xs uppercase tracking-wider">Semestre {sem}</h4>
                <div className="space-y-3 overflow-y-auto pr-1">
                  
                  {/* Subject Item 1 */}
                  <div 
                    onClick={() => setSelectedSubject(`MAT11${sem}`)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedSubject === `MAT11${sem}` ? 'border-blue-500 bg-blue-50 shadow-md relative' : 'border-transparent bg-white shadow-sm hover:border-slate-300'}`}
                  >
                    {selectedSubject === `MAT11${sem}` && <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-blue-500 rotate-45 rounded-sm z-10" />}
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-slate-800 text-sm">MAT11{sem} Cálculo {sem}</div>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">{sem === 1 ? '6 CR' : '4 CR'}</span>
                    </div>
                    {sem > 1 && (
                      <div className="mt-2 text-[10px] flex items-center gap-1 text-slate-500">
                        <Link size={10} /> Req: MAT11{sem-1}
                      </div>
                    )}
                  </div>

                  {/* Subject Item 2 */}
                  <div className="p-3 rounded-lg border-2 border-transparent bg-white shadow-sm hover:border-slate-300 cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-slate-800 text-sm">FIS10{sem} Física {sem}</div>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">4 CR</span>
                    </div>
                  </div>

                </div>
              </div>
            ))}
            {/* Empty state for more semesters to show scroll */}
            <div className="min-w-[240px] bg-slate-50/50 border border-dashed border-slate-300 rounded-xl p-3 flex items-center justify-center">
              <span className="text-slate-400 font-semibold text-sm">+ Añadir Semestre</span>
            </div>
          </div>
        </div>

        {/* Panel Editor: Prerrequisitos y Certámenes */}
        {selectedSubject && (
          <div className="w-[400px] bg-white rounded-xl border border-slate-200 shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right-8">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-blue-400">Editor de Asignatura</span>
                <h3 className="font-bold text-xl">{selectedSubject === 'MAT111' ? 'Cálculo 1' : selectedSubject}</h3>
                <p className="text-xs text-slate-400 mt-1">ID: {selectedSubject} | 6 Créditos</p>
              </div>
              <button className="text-slate-400 hover:text-white" onClick={() => setSelectedSubject(null)}><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-8">
              
              {/* Sección Prerrequisitos */}
              <section>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Link size={16}/> Prerrequisitos</h4>
                  <button className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200">+ Añadir</button>
                </div>
                <div className="space-y-2">
                  {selectedSubject === 'MAT111' ? (
                    <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded border border-slate-100 text-center">No tiene prerrequisitos (1er Semestre)</div>
                  ) : (
                    <div className="flex justify-between items-center p-2 bg-slate-50 border border-slate-200 rounded-lg group">
                      <span className="text-sm font-semibold text-slate-700">MAT111 Cálculo 1</span>
                      <button className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14}/></button>
                    </div>
                  )}
                </div>
              </section>

              <hr className="border-slate-100" />

              {/* Sección Evaluaciones / Certámenes */}
              <section>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Edit2 size={16}/> Simulador de Notas (Certámenes)</h4>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Suma: 100%</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">Define la estructura de evaluaciones para simular las notas finales de los alumnos.</p>
                
                <div className="space-y-3">
                  <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input type="text" defaultValue="Certamen 1" className="flex-1 bg-white border border-slate-300 rounded-md p-1.5 text-sm font-medium" />
                    <div className="relative w-20">
                      <input type="number" defaultValue={30} className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-sm font-medium pr-6" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    </div>
                    <button className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                  </div>
                  
                  <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input type="text" defaultValue="Certamen 2" className="flex-1 bg-white border border-slate-300 rounded-md p-1.5 text-sm font-medium" />
                    <div className="relative w-20">
                      <input type="number" defaultValue={30} className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-sm font-medium pr-6" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    </div>
                    <button className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                  </div>

                  <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input type="text" defaultValue="Examen Final" className="flex-1 bg-white border border-slate-300 rounded-md p-1.5 text-sm font-medium" />
                    <div className="relative w-20">
                      <input type="number" defaultValue={40} className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-sm font-medium pr-6" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    </div>
                    <button className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                  </div>

                  <button className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
                    + Añadir Nueva Evaluación
                  </button>
                </div>

                <div className="mt-6">
                  <label className="text-sm font-bold text-slate-700 block mb-1">Dificultad Base (Desviación Estándar σ)</label>
                  <p className="text-xs text-slate-500 mb-2">Afecta la varianza de las notas en la simulación Montecarlo.</p>
                  <input type="number" defaultValue={1.2} step={0.1} className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-semibold" />
                </div>
              </section>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AlumnosView() {
  const [activeSubTab, setActiveSubTab] = useState<'perfiles'|'lista'|'csv'>('perfiles');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col animate-in fade-in">
      <div className="flex justify-between items-center border-b border-slate-200 px-6 pt-4 bg-slate-50 rounded-t-xl">
        <div className="flex gap-6">
          <button onClick={() => setActiveSubTab('perfiles')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeSubTab === 'perfiles' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Generación por Perfiles</button>
          <button onClick={() => setActiveSubTab('lista')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeSubTab === 'lista' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Edición Manual</button>
          <button onClick={() => setActiveSubTab('csv')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeSubTab === 'csv' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Importar Datos Históricos</button>
        </div>
      </div>

      <div className="p-8 flex-1 overflow-auto">
        {activeSubTab === 'perfiles' && (
          <div className="max-w-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Cohorte Estocástica</h3>
            <p className="text-sm text-slate-600 mb-6">El simulador creará estudiantes virtuales basados en estos porcentajes de rendimiento histórico.</p>
            <div className="space-y-4">
              <NumberInput label="Total de Alumnos a Generar" defaultVal={150} step={10} />
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <NumberInput label="% Sobresalientes" defaultVal={15} step={5} />
                <NumberInput label="% Promedio" defaultVal={60} step={5} />
                <NumberInput label="% En Riesgo" defaultVal={25} step={5} />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'lista' && (
          <div>
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Directorio Manual de Alumnos</h3>
              <button className="flex items-center gap-2 bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-slate-700 transition-colors shadow-sm">
                <Plus size={16} /> Añadir Alumno Manualmente
              </button>
            </div>
            <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <Users size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="font-semibold">La tabla de estudiantes está vacía.</p>
              <p className="text-sm">Genera perfiles, importa un CSV o añade un alumno manualmente.</p>
            </div>
          </div>
        )}

        {activeSubTab === 'csv' && (
          <div className="max-w-xl border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center bg-slate-50">
            <FileUp size={48} className="text-slate-400 mb-4" />
            <h4 className="font-bold text-slate-700 mb-2">Sube tu archivo de notas (.csv, .xlsx)</h4>
            <p className="text-sm text-slate-500 text-center mb-6">El archivo debe contener el ID del alumno y sus notas históricas por certamen para calibrar el modelo base.</p>
            <button className="bg-white border border-slate-300 font-semibold text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-100 shadow-sm">
              Seleccionar Archivo Local
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- DRILL-DOWN MODALS ---

function SubjectResultModal({ subject, onClose }: { subject: Subject, onClose: () => void }) {
  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-8 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{subject.id}</span>
            <h2 className="text-2xl font-bold text-slate-800">{subject.name}</h2>
            <p className="text-sm text-slate-500 mt-1">Resultados basados en la simulación de Certámenes.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        <div className="p-8 grid grid-cols-2 gap-8 bg-white">
          <div className="space-y-6">
            <div className="p-5 bg-red-50 border border-red-100 rounded-xl shadow-inner">
               <div className="text-sm font-bold text-red-800 mb-1">Tasa de Reprobación Global (Nota Final &lt; 4.0)</div>
               <div className="text-4xl font-black text-red-600">{subject.rate}</div>
               <p className="text-xs text-red-700 mt-2">De 150 alumnos simulados, 79 reprobaron la asignatura.</p>
            </div>
             
            <div>
               <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2"><Edit2 size={16}/> Rendimiento Simulado por Evaluación</h4>
               <div className="space-y-3">
                 <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-700">Certamen 1 <span className="text-xs font-normal text-slate-500">(30%)</span></span> 
                      <span className="font-bold text-red-600 text-sm">Prom: 3.2</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-red-500 h-1.5 rounded-full" style={{width: '45%'}}></div></div>
                 </div>
                 
                 <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-700">Certamen 2 <span className="text-xs font-normal text-slate-500">(30%)</span></span> 
                      <span className="font-bold text-amber-500 text-sm">Prom: 3.9</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: '55%'}}></div></div>
                 </div>

                 <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-700">Examen <span className="text-xs font-normal text-slate-500">(40%)</span></span> 
                      <span className="font-bold text-green-600 text-sm">Prom: 4.5</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-green-500 h-1.5 rounded-full" style={{width: '65%'}}></div></div>
                 </div>
               </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><LineChart size={18}/> Curva de Notas Finales (Simulación)</h4>
            <div className="h-64 bg-slate-50 border border-slate-200 rounded-xl flex items-end justify-between p-6">
              {[1, 2, 3, 4, 5, 6, 7].map((nota, i) => {
                const height = [5, 15, 30, 80, 60, 20, 5][i];
                return (
                  <div key={nota} className="flex flex-col items-center gap-2 w-full">
                    <div className={`w-3/4 rounded-t-md transition-all hover:opacity-80 ${nota < 4 ? 'bg-red-400' : 'bg-green-500'}`} style={{ height: `${height}px` }}></div>
                    <span className="text-xs font-bold text-slate-500">{nota}.0</span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-slate-500 text-center mt-3 bg-blue-50 text-blue-700 p-2 rounded border border-blue-100">
              Gran concentración de alumnos en nota 3.0. Recomendar revisar dificultad del Certamen 1.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentResultModal({ student, onClose }: { student: Student, onClose: () => void }) {
  // Modal de estudiante omitido por brevedad en este snippet, es el mismo de la V2.
  return null;
}

// --- REUSABLE COMPONENTS ---

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
        active ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      {label}
      {active && <ChevronRight size={16} className="ml-auto" />}
    </button>
  );
}

function NumberInput({ label, desc, defaultVal, step }: { label: string, desc?: string, defaultVal: number, step: number }) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
      <label className="block text-sm font-bold text-slate-800 mb-1">{label}</label>
      {desc && <p className="text-xs text-slate-500 mb-3">{desc}</p>}
      <input 
        type="number" 
        defaultValue={defaultVal} 
        step={step} 
        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
    </div>
  );
}

function KpiCard({ title, value, sub, trend, isNegative }: { title: string, value: string, sub?: string, trend?: string, isNegative?: boolean }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
      <h4 className="text-slate-500 text-sm font-bold">{title}</h4>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-black text-slate-800 tracking-tight">{value}</span>
        {trend && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isNegative ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {trend}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-slate-400 mt-2 font-medium">{sub}</p>}
    </div>
  );
}