import { Check, FilePlus, Save, X } from 'lucide-react';

type GuardarMallaModalProps = {
  isOpen: boolean;
  mallaLength: number;
  totalSemestres: number;
  nombreGuardarInput: string;
  currentMallaId: string | null;
  onClose: () => void;
  onNombreChange: (value: string) => void;
  onConfirm: (tipoAccion: 'nueva' | 'sobrescribir') => void;
};

export default function GuardarMallaModal({
  isOpen,
  mallaLength,
  totalSemestres,
  nombreGuardarInput,
  currentMallaId,
  onClose,
  onNombreChange,
  onConfirm,
}: GuardarMallaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <Save className="text-blue-600" size={28} />
          <h3 className="text-xl font-bold text-slate-800">Quieres guardar esta malla?</h3>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
          <p className="text-sm text-slate-900 font-bold">Resumen del Plan:</p>
          <ul className="text-sm font-medium text-slate-900 mt-1">
            <li>
              - <span className="font-black">{mallaLength}</span> Asignaturas creadas
            </li>
            <li>
              - <span className="font-black">{totalSemestres}</span> Semestres en total
            </li>
          </ul>
        </div>

        <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de la Malla</label>
        <input
          type="text"
          value={nombreGuardarInput}
          onChange={(e) => onNombreChange(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
        />

        {currentMallaId ? (
          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={() => onConfirm('sobrescribir')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center justify-center gap-2"
            >
              <Check size={18} /> Sobrescribir Existente
            </button>
            <button
              onClick={() => onConfirm('nueva')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center justify-center gap-2"
            >
              <FilePlus size={18} /> Guardar como Nueva
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => onConfirm('nueva')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-md flex items-center gap-2"
            >
              <Check size={18} /> Guardar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
