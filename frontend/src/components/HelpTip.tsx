import { CircleHelp } from 'lucide-react';

// ==========================================
// HelpTip — ícono "?" con tooltip al pasar el mouse / enfocar
// ==========================================
// Accesible: el disparador es un <button> enfocable con teclado; el tooltip
// aparece en hover y también en focus (group-focus-within). Pensado para
// explicar parámetros con jerga (pesos de calibración, NCSmax, TAmin, etc.).

interface Props {
  text: string;
  /** Posición del globo respecto al ícono. Default 'top'. */
  side?: 'top' | 'bottom';
  className?: string;
}

export default function HelpTip({ text, side = 'top', className }: Props) {
  const pos =
    side === 'bottom'
      ? 'top-full mt-1.5'
      : 'bottom-full mb-1.5';
  return (
    <span className={`relative inline-flex group align-middle ${className ?? ''}`}>
      <button
        type="button"
        aria-label="Más información"
        className="text-slate-400 hover:text-blue-600 focus:text-blue-600 focus:outline-none transition-colors cursor-help"
        onClick={(e) => e.preventDefault()}
      >
        <CircleHelp size={14} />
      </button>
      <span
        role="tooltip"
        className={[
          'pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 w-56 rounded-lg bg-slate-900 p-2.5',
          'text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-white shadow-xl',
          'opacity-0 invisible transition-opacity duration-150',
          'group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible',
          pos,
        ].join(' ')}
      >
        {text}
      </span>
    </span>
  );
}
