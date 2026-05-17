import {
  AlertCircle,
  Bug,
  Code2,
  HeadphonesIcon,
  Lightbulb,
  Mail,
  MessageCircle,
} from 'lucide-react';

/**
 * Vista de Soporte — información de contacto para reportar bugs,
 * solicitar features o pedir ayuda con la plataforma.
 *
 * Los datos de contacto son del usuario titular de la cuenta del
 * proyecto (mantener actualizado si cambia el responsable).
 */
export default function SoporteView() {
  return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <Header />

        <section className="mb-8">
          <p className="text-slate-600 leading-relaxed">
            Si tiene <strong>dudas de uso</strong>, encontró un <strong>bug</strong>, o quiere
            sugerir una <strong>nueva funcionalidad</strong>, puede contactarme directamente.
            Le responderé lo antes posible — usualmente en menos de 48 horas.
          </p>
        </section>

        <section className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MessageCircle size={20} className="text-blue-500" />
            Canales de contacto
          </h3>
          <div className="space-y-3">
            <ContactCard
              icon={<Mail size={20} />}
              label="Email"
              value="psoficialjavo0408@gmail.com"
              href="mailto:psoficialjavo0408@gmail.com"
              color="blue"
              note="Canal principal. Ideal para reportes detallados y consultas privadas."
            />
            <ContactCard
              icon={<Code2 size={20} />}
              label="GitHub Issues"
              value="github.com/jsk11L/Simulador-PUCV/issues"
              href="https://github.com/jsk11L/Simulador-PUCV/issues"
              color="slate"
              note="Para reportes públicos de bugs o pedidos de features. Lleva tracking del estado."
            />
          </div>
        </section>

        <section className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Lightbulb size={20} className="text-amber-500" />
            ¿Qué incluir al contactar?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TipoContacto
              icon={<Bug size={18} />}
              titulo="Reporte de bug"
              color="red"
              items={[
                'Qué hacía cuando pasó',
                'Qué esperaba que pasara',
                'Qué pasó en su lugar',
                'Captura de pantalla si es visual',
                'Navegador y sistema operativo',
              ]}
            />
            <TipoContacto
              icon={<Lightbulb size={18} />}
              titulo="Nueva feature"
              color="amber"
              items={[
                'Qué problema quiere resolver',
                'Cómo lo resuelve hoy (workaround)',
                'Cómo imagina la solución ideal',
                '¿Es bloqueante o nice-to-have?',
              ]}
            />
            <TipoContacto
              icon={<HeadphonesIcon size={18} />}
              titulo="Ayuda de uso"
              color="blue"
              items={[
                'Qué vista está usando',
                'Qué resultado espera obtener',
                'Cualquier captura ayuda',
                'Antes revise la pestaña Ayuda',
              ]}
            />
          </div>
        </section>

        <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-amber-600" />
            Sobre la integración con API PUCV
          </h4>
          <p className="text-sm text-amber-800 leading-relaxed">
            La conexión con la API oficial de la PUCV (para cargar historiales reales
            automáticamente) está <strong>pendiente y fuera de mi control</strong> — depende de
            convenios institucionales. Mientras tanto, puede cargar datos manualmente vía CSV o
            JSON (ver pestaña <em>Ayuda → Formato CSV de Historial</em>).
          </p>
        </section>

        <section className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h4 className="font-bold text-slate-800 mb-2">Tiempos de respuesta</h4>
          <ul className="text-sm text-slate-600 space-y-1.5 ml-5 list-disc">
            <li>
              <strong>Bugs críticos</strong> (la app no funciona): &lt; 24 horas
            </li>
            <li>
              <strong>Bugs menores</strong> y dudas: &lt; 48 horas
            </li>
            <li>
              <strong>Nuevas features</strong>: respondo en &lt; 48 horas si la implementaré, con
              ETA cuando aplica
            </li>
          </ul>
        </section>

        <div className="text-center mt-8 text-xs text-slate-400">
          SimulaPUCV · Soporte mantenido por el autor del proyecto
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200">
      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
        <HeadphonesIcon size={24} className="text-emerald-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Soporte</h2>
        <p className="text-sm text-slate-500">
          Reporte bugs, pida features o consulte dudas de uso
        </p>
      </div>
    </div>
  );
}

function ContactCard({
  icon,
  label,
  value,
  href,
  color,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
  color: string;
  note: string;
}) {
  const colorClass =
    {
      blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      slate: 'bg-slate-50 border-slate-200 hover:bg-slate-100',
    }[color] || 'bg-slate-50 border-slate-200';
  const iconClass =
    {
      blue: 'bg-blue-200 text-blue-700',
      slate: 'bg-slate-200 text-slate-700',
    }[color] || 'bg-slate-200 text-slate-700';
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className={`block border rounded-xl p-4 transition-all ${colorClass}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</div>
          <div className="font-mono text-sm font-semibold text-slate-800 break-all">{value}</div>
          <p className="text-xs text-slate-600 mt-1">{note}</p>
        </div>
      </div>
    </a>
  );
}

function TipoContacto({
  icon,
  titulo,
  color,
  items,
}: {
  icon: React.ReactNode;
  titulo: string;
  color: string;
  items: string[];
}) {
  const colorClass =
    {
      red: 'border-red-200 bg-red-50',
      amber: 'border-amber-200 bg-amber-50',
      blue: 'border-blue-200 bg-blue-50',
    }[color] || 'border-slate-200 bg-slate-50';
  const iconColorClass =
    {
      red: 'bg-red-200 text-red-700',
      amber: 'bg-amber-200 text-amber-700',
      blue: 'bg-blue-200 text-blue-700',
    }[color] || 'bg-slate-200 text-slate-700';
  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-8 h-8 rounded-md flex items-center justify-center ${iconColorClass}`}
        >
          {icon}
        </div>
        <h5 className="font-bold text-slate-800 text-sm">{titulo}</h5>
      </div>
      <ul className="text-xs text-slate-700 space-y-1 ml-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-slate-400">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
