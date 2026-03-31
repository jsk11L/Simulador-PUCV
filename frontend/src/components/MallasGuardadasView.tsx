import { LayoutGrid } from 'lucide-react';
import type { MallaGuardada } from '../types';

interface MallasGuardadasViewProps {
  mallasGuardadas: MallaGuardada[];
}

export default function MallasGuardadasView({ mallasGuardadas }: MallasGuardadasViewProps) {
  return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12">
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
  );
}
