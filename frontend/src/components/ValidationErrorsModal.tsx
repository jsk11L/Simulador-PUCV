import { AlertCircle, X } from 'lucide-react';

type ValidationErrorsModalProps = {
  errors: string[];
  onClose: () => void;
};

export default function ValidationErrorsModal({ errors, onClose }: ValidationErrorsModalProps) {
  if (errors.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-white border-2 border-red-500 rounded-xl shadow-2xl max-w-2xl w-full p-6 relative animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 rounded-full p-1 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="text-red-500" size={28} />
          <h3 className="text-xl font-bold text-slate-800">Se encontraron errores en la malla</h3>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Antes de continuar, debes corregir los siguientes problemas de integridad:
        </p>

        <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {errors.map((err, idx) => (
            <li
              key={idx}
              className="text-sm text-red-800 bg-red-50 p-3 rounded-lg border border-red-200 shadow-sm flex items-start gap-2"
            >
              <span className="font-bold text-red-500 shrink-0">-</span>
              <span>{err}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Entendido, ir a corregir
          </button>
        </div>
      </div>
    </div>
  );
}
