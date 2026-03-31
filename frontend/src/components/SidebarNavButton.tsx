import React from 'react';
import type { ActiveTab } from '../types';

interface SidebarNavButtonProps {
  id: ActiveTab;
  activeTab: ActiveTab;
  icon: React.ReactElement<{ size?: number }>;
  label: string;
  onClick: (id: ActiveTab) => void;
}

export default function SidebarNavButton({ id, activeTab, icon, label, onClick }: SidebarNavButtonProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
        activeTab === id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      {React.cloneElement(icon, { size: 18 })} {label}
    </button>
  );
}
