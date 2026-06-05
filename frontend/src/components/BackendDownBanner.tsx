import { AlertTriangle, RefreshCw } from 'lucide-react';

// Banner rojo fijo que avisa cuando el backend de SimulaPUCV dejó de
// responder (proceso cerrado). Sin backend la app no puede guardar ni
// simular, así que se muestra por encima de todo.
export default function BackendDownBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-red-600 text-white shadow-lg animate-in slide-in-from-top">
      <div className="max-w-5xl mx-auto flex items-center gap-3 px-4 py-2.5">
        <AlertTriangle size={20} className="shrink-0" />
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-bold">Se perdió la conexión con SimulaPUCV.</span>{' '}
          <span className="text-red-100">
            El proceso pudo haberse cerrado. Vuelva a ejecutar{' '}
            <code className="bg-red-700/60 px-1.5 py-0.5 rounded">SimulaPUCV.exe</code> y recargue la página.
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 inline-flex items-center gap-1.5 bg-white text-red-700 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          <RefreshCw size={13} /> Recargar
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-1.5 border border-white/60 text-white font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
