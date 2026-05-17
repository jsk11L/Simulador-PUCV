import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /** Etiqueta opcional para identificar dónde ocurrió el error en logs. */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: React.ErrorInfo | null;
}

/**
 * Captura errores de render de sus children y muestra un fallback en vez
 * de dejar pantalla en blanco. Pensado para envolver vistas individuales
 * (no toda la app), de modo que un crash en una vista no rompa el sidebar
 * ni el resto de la UI.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.label ? ' ' + this.props.label : ''}]`, error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-6 m-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={24} className="text-red-600 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-900 mb-1">
              Ocurrió un error en esta vista
            </h3>
            <p className="text-sm text-red-800 mb-3">
              La vista se rompió mientras renderizaba. Esto evita que la app entera quede en blanco.
              Pruebe recargar esta sección o moverse a otra desde el menú lateral.
            </p>
            {this.state.error && (
              <details className="text-xs bg-white border border-red-200 rounded p-2 mb-3 font-mono">
                <summary className="cursor-pointer text-red-700 font-semibold">
                  Detalles técnicos
                </summary>
                <div className="mt-2 whitespace-pre-wrap text-slate-700">
                  {this.state.error.toString()}
                  {this.state.info?.componentStack && (
                    <>
                      {'\n\n'}
                      {this.state.info.componentStack}
                    </>
                  )}
                </div>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              <RotateCcw size={14} /> Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
