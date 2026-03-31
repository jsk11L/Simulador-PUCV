import {
  Activity,
  BarChart,
  FileText,
  HelpCircle,
  History as HistoryIcon,
  LayoutGrid,
  LogOut,
  Play,
  Shield,
  X,
} from 'lucide-react';
import SidebarNavButton from './SidebarNavButton';
import type { ActiveTab } from '../types';

interface AppSidebarProps {
  sidebarOpen: boolean;
  activeTab: ActiveTab;
  mallaSetupMode: string | null;
  isAdmin: boolean;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  fetchAdminUsuarios: () => void;
  handleSidebarNav: (id: ActiveTab) => void;
  handleLogout: () => void;
  handleNewSimulation: () => void;
}

export default function AppSidebar({
  sidebarOpen,
  activeTab,
  mallaSetupMode,
  isAdmin,
  setSidebarOpen,
  setActiveTab,
  fetchAdminUsuarios,
  handleSidebarNav,
  handleLogout,
  handleNewSimulation,
}: AppSidebarProps) {
  return (
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
          <SidebarNavButton id="log" activeTab={activeTab} icon={<FileText />} label="Log Pasado" onClick={handleSidebarNav} />
          <SidebarNavButton id="ultimo_resultado" activeTab={activeTab} icon={<BarChart />} label="Último Resultado" onClick={handleSidebarNav} />
          <SidebarNavButton id="resultados_pasados" activeTab={activeTab} icon={<HistoryIcon />} label="Resultados Pasados" onClick={handleSidebarNav} />
        </div>
      </nav>

      <div className="p-4 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Biblioteca</div>
      <nav className="flex-1 px-4 space-y-1">
        <SidebarNavButton id="mallas" activeTab={activeTab} icon={<LayoutGrid />} label="Mallas Guardadas" onClick={handleSidebarNav} />
        <SidebarNavButton id="ayuda" activeTab={activeTab} icon={<HelpCircle />} label="Ayuda" onClick={handleSidebarNav} />
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
  );
}
