import { useState } from 'react';
import type { ActiveTab } from '../types';

interface UseAppNavigationParams {
  onOpenMallas: () => void;
  onOpenResultadosPasados: () => void;
}

export default function useAppNavigation({ onOpenMallas, onOpenResultadosPasados }: UseAppNavigationParams) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('wizard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarNav = (id: ActiveTab) => {
    setActiveTab(id);
    setSidebarOpen(false);

    if (id === 'mallas') onOpenMallas();
    if (id === 'resultados_pasados') onOpenResultadosPasados();
  };

  return {
    activeTab,
    setActiveTab,
    sidebarOpen,
    setSidebarOpen,
    handleSidebarNav,
  };
}
