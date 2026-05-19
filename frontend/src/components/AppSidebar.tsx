import {
  BarChart,
  FilePlus,
  FlaskConical,
  GraduationCap,
  Headphones,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Play,
  Power,
  Shield,
  SlidersHorizontal,
  User,
  Users,
  X,
} from 'lucide-react';
import SidebarNavButton from './SidebarNavButton';
import type { ActiveTab } from '../types';

interface AppSidebarProps {
  sidebarOpen: boolean;
  activeTab: ActiveTab;
  mallaSetupMode: string | null;
  isAdmin: boolean;
  // standalone: cuando el backend corre como ejecutable single-user,
  // ocultamos la sección de Administración y el botón de Cerrar Sesión
  // (no hay usuarios ni sesiones que gestionar). En su lugar aparece el
  // botón "Salir" que apaga el proceso del binario portable.
  standalone?: boolean;
  hasCrearMallaDraft?: boolean;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  fetchAdminUsuarios: () => void;
  handleSidebarNav: (id: ActiveTab) => void;
  handleLogout: () => void;
  handleNewSimulation: () => void;
  handleCrearMallaNueva: () => void;
  handleContinuarMalla: () => void;
  handleShutdown?: () => void;
}

export default function AppSidebar({
  sidebarOpen,
  activeTab,
  mallaSetupMode,
  isAdmin,
  standalone = false,
  hasCrearMallaDraft = false,
  setSidebarOpen,
  setActiveTab,
  fetchAdminUsuarios,
  handleSidebarNav,
  handleLogout,
  handleNewSimulation,
  handleCrearMallaNueva,
  handleContinuarMalla,
  handleShutdown,
}: AppSidebarProps) {
  return (
    <aside className={`fixed lg:relative top-0 left-0 h-full w-64 bg-slate-900 text-white flex flex-col shadow-xl z-40 shrink-0 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
            <GraduationCap size={18} className="text-white" />
          </span>
          SimulaPUCV
        </h1>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Simulación</div>
      <nav className="px-4 space-y-1">
        <button
          onClick={handleNewSimulation}
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
          <SidebarNavButton id="ultimo_resultado" activeTab={activeTab} icon={<BarChart />} label="Último Resultado" onClick={handleSidebarNav} />
        </div>
      </nav>

      <div className="p-4 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
        <FlaskConical size={12} /> Predicción Individual
      </div>
      <nav className="px-4 space-y-1">
        <SidebarNavButton id="simular_individual" activeTab={activeTab} icon={<User />} label="Simular Alumno" onClick={handleSidebarNav} />
        <SidebarNavButton id="generar_cohorte" activeTab={activeTab} icon={<Users />} label="Generar Cohorte" onClick={handleSidebarNav} />
        <SidebarNavButton id="calibracion" activeTab={activeTab} icon={<SlidersHorizontal />} label="Calibración" onClick={handleSidebarNav} />
      </nav>

      <div className="p-4 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Biblioteca</div>
      <nav className="flex-1 px-4 space-y-1">
        <button
          onClick={handleCrearMallaNueva}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'crear_malla' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
        >
          <FilePlus size={18} /> Crear Malla
        </button>
        {hasCrearMallaDraft && activeTab !== 'crear_malla' && (
          <button
            onClick={handleContinuarMalla}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <Play size={18} /> Continuar Malla
          </button>
        )}
        <SidebarNavButton id="mallas" activeTab={activeTab} icon={<LayoutGrid />} label="Mallas Guardadas" onClick={handleSidebarNav} />
        <SidebarNavButton id="ayuda" activeTab={activeTab} icon={<HelpCircle />} label="Ayuda" onClick={handleSidebarNav} />
        <SidebarNavButton id="soporte" activeTab={activeTab} icon={<Headphones />} label="Soporte" onClick={handleSidebarNav} />
      </nav>

      {isAdmin && !standalone && (
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
        {standalone ? (
          <>
            <button
              onClick={handleShutdown}
              className="w-full py-2 rounded-lg text-sm font-bold text-slate-300 hover:text-white hover:bg-red-500/20 flex items-center justify-center gap-2"
            >
              <Power size={16} /> Salir de SimulaPUCV
            </button>
            <div className="text-center text-[10px] text-slate-500 mt-2">
              Versión portable · Datos locales en este equipo
            </div>
          </>
        ) : (
          <button onClick={handleLogout} className="w-full py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-red-500/20 flex items-center justify-center gap-2">
            <LogOut size={16} /> Cerrar Sesión
          </button>
        )}
      </div>
    </aside>
  );
}
