import {
  AlertCircle,
  Archive,
  BarChart3,
  BookOpen,
  Download,
  FileSpreadsheet,
  Info,
  LayoutGrid,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  Table,
  Target,
  Upload,
  User,
  Users,
  Waypoints,
} from 'lucide-react';

/**
 * Vista de Ayuda — documentación viva de la plataforma.
 *
 * Se mantiene sincronizada con las vistas reales del sidebar:
 *   - Nueva Simulación (wizard 3 pasos)
 *   - Último Resultado
 *   - Simular Alumno
 *   - Generar Cohorte
 *   - Calibración
 *   - Mallas Guardadas
 *
 * Cada sección documenta: para qué sirve, parámetros, formato de archivos
 * de entrada y salida, fórmulas relevantes.
 */
export default function HelpView() {
  return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <Header />

        <Section icon={<Info size={20} className="text-blue-500" />} title="¿Qué es SimulaPUCV?">
          <p className="text-slate-600 leading-relaxed">
            SimulaPUCV es una plataforma de <strong>simulación curricular</strong> basada en el
            <strong> Método de Montecarlo</strong>. Permite responder preguntas como: ¿qué pasa con
            las tasas de titulación si subo TAmin de 0.5 a 0.6?, ¿cuántos semestres tarda en promedio
            un alumno con perfil "promedio_bajo"?, ¿qué probabilidad tiene este alumno con su
            historial actual de eliminarse por TAmin?
          </p>
          <p className="text-slate-600 leading-relaxed mt-3">
            Está implementada según el modelo de <strong>Jorge Mendoza Baeza (PUCV, 2023)</strong>,
            extendido con motor de predicción individual (modificadores δ) para usar el historial
            real de un alumno y proyectar su futuro probable.
          </p>
        </Section>

        <Section icon={<Rocket size={20} className="text-blue-500" />} title="Vistas de la plataforma">
          <p className="text-slate-600 mb-4">
            El sidebar agrupa las vistas en tres bloques. Esta es la guía rápida:
          </p>
          <ViewCard
            icon={<Rocket size={16} />}
            color="blue"
            name="Nueva Simulación"
            purpose="Lanzar simulación agregada de una cohorte sintética sobre una malla completa."
            inputs="Plantilla / CSV / Malla guardada / Hoja en blanco + variables (NE, NCSmax, TAmin, …) + modelo de calificaciones (VMap, Δ)."
            outputs="KPIs (PPE, PSCE, EE, PEO, retención), distribución por semestre, ramos críticos, heatmap kanban y ZIP descargable."
          />
          <ViewCard
            icon={<BarChart3 size={16} />}
            color="emerald"
            name="Último Resultado"
            purpose="Re-abrir el resultado más reciente sin volver a correr la simulación."
            inputs="Ninguno — usa el resultado guardado en sesión."
            outputs="Mismas tablas y gráficos que la vista de Resultados, con opción de descargar ZIP."
          />
          <ViewCard
            icon={<User size={16} />}
            color="indigo"
            name="Simular Alumno"
            purpose="Predecir trayectoria futura de UN alumno (sintético o construido a mano)."
            inputs="Perfil + escenario, o historial manual (kanban interactivo / CSV / JSON)."
            outputs="Kanban con historial + futuro proyectado, tasas de titulación / eliminación, probabilidad por ramo, semestres esperados."
          />
          <ViewCard
            icon={<Users size={16} />}
            color="purple"
            name="Generar Cohorte"
            purpose="Generar N alumnos sintéticos o construir una cohorte real alumno por alumno."
            inputs="Perfil + escenario + count + seed; o construcción manual con kanban."
            outputs="Estadística agregada (% titulados / eliminados TAmin / Opor con su conteo), tabla por alumno y descarga ZIP. Cada alumno se proyecta con Montecarlo: en 'Ver', el kanban y el banner muestran el resultado MÁS PROBABLE de esa proyección (no la única muestra generada)."
          />
          <ViewCard
            icon={<SlidersHorizontal size={16} />}
            color="amber"
            name="Calibración"
            purpose="Ajustar a mano los pesos W_hist, W_prereq, W_stress del motor δ y medir su impacto de predicción sobre una cohorte sintética (backtest)."
            inputs="Una malla guardada (no usa los escenarios del paper) + perfil + nº de alumnos + iteraciones por corte + seed, y los tres pesos."
            outputs="Métricas Brier / Accuracy / Log-loss comparadas contra el baseline con pesos en 0. Menor Brier y Log-loss = mejor; mayor Accuracy = mejor."
          />
          <ViewCard
            icon={<LayoutGrid size={16} />}
            color="slate"
            name="Mallas Guardadas"
            purpose="Biblioteca de mallas reutilizables. Sirven como escenario en cualquier vista."
            inputs="Mallas creadas en el wizard + las que vienen de fábrica (caso_actual, etc.)."
            outputs="Lista filtrable. Cada malla puede aplicarse como escenario o editarse."
          />
        </Section>

        <Section icon={<Info size={20} className="text-blue-500" />} title="Parámetros de Configuración">
          <p className="text-slate-600 mb-4">
            Estos son los parámetros del motor agregado (Nueva Simulación). Cualquier cambio impacta
            sensiblemente los KPIs — usa la vista de <em>Calibración</em> para ajustarlos contra
            datos reales antes de usarlos en simulación pura.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {[
              ['NE', 'Número de estudiantes simulados. ≥1000 estabiliza KPIs.'],
              ['NCSmax', 'Tope de créditos por semestre. Subir = avance más rápido potencial.'],
              ['TAmin', 'Mínimo de avance académico requerido. Subir = más exigencia, más eliminados.'],
              ['NapTAmin', 'Semestre desde el cual aplica TAmin. Antes no se sanciona.'],
              ['Opor', 'Máximo de reprobaciones permitidas por asignatura.'],
              ['MaxSemestres', 'Cota superior del horizonte (debe ≥ último semestre de la malla).'],
            ].map(([name, desc]) => (
              <ParamCard key={name} name={name} desc={desc} />
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-bold text-slate-800 mb-3">Modelo de Calificaciones (VMap y Δ)</p>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>VMap1234, VMap5678, VMapM:</strong> media de aprobación esperada por ciclo
                (1-4, 5-8, ≥9). Valores más altos reducen repitencia.
              </p>
              <p>
                <strong>Delta1234, Delta5678, DeltaM:</strong> dispersión alrededor de la media.
                Valores mayores introducen más variabilidad entre alumnos.
              </p>
              <p>
                <strong>VMap alto + Δ bajo</strong> → cohortes estables.{' '}
                <strong>VMap bajo + Δ alto</strong> → alta dispersión, más rezago.
              </p>
            </div>
          </div>
        </Section>

        <Section icon={<Target size={20} className="text-emerald-600" />} title="Motor δ (Predicción Individual)">
          <p className="text-slate-600 mb-3">
            En <strong>Simular Alumno</strong> y <strong>Generar Cohorte → Proyectar</strong>, la
            simulación usa el historial del alumno para ajustar la probabilidad de aprobación de
            cada ramo futuro. La probabilidad final es:
          </p>
          <div className="bg-slate-900 rounded-xl p-4 mb-4">
            <pre className="text-emerald-400 font-mono text-xs leading-relaxed overflow-x-auto">
{`P_aprobar_ajustada = clamp(P_base + δ_hist + δ_prereq + δ_stress, 0.05, 0.95)

donde:
  δ_hist   = W_hist   · 0.30 · tanh(3·(ratio_aprobacion - 0.5))
  δ_prereq = W_prereq · (promedio_prereqs - 4.0) / 7.0
  δ_stress = W_stress · min(0, (carga_historica - carga_actual)/6)`}
            </pre>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="font-bold text-emerald-800 mb-1">δ_hist</div>
              <p className="text-emerald-700">Premia/castiga según ratio de aprobación histórico (tanh satura en ±0.30).</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="font-bold text-blue-800 mb-1">δ_prereq</div>
              <p className="text-blue-700">Usa la nota promedio en los prerrequisitos reales del ramo.</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="font-bold text-amber-800 mb-1">δ_stress</div>
              <p className="text-amber-700">Solo castiga sobrecarga: si la carga actual supera la histórica, baja la probabilidad.</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Los pesos por defecto son <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">W(0.0, 0.5, 0.5)</code>.
            Para una cohorte particular, usa <strong>Calibración</strong> para encontrar los óptimos
            por grid search.
          </p>
        </Section>

        <Section icon={<Waypoints size={20} className="text-orange-500" />} title="Flechas del Kanban (prerequisitos y repeticiones)">
          <p className="text-slate-600 mb-4">
            En los kanbans (editor de malla, Simular Alumno y el detalle de cada alumno de una
            cohorte) las cards se ordenan por sigla y pueden mostrar sus relaciones con flechas.
            Por defecto vienen ocultas para no saturar.
          </p>
          <div className="space-y-3">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="font-bold text-orange-800 mb-1 flex items-center gap-2">
                <Waypoints size={16} /> Prerequisitos (por ramo)
              </div>
              <p className="text-sm text-orange-700">
                Cada ramo con relaciones tiene un ícono <Waypoints size={12} className="inline" />.
                Al activarlo se dibujan SOLO las flechas de ese ramo: hacia sus prerrequisitos y
                hacia los ramos que abre. Puede activar varios a la vez; cada uno usa un color
                distinto (el primero naranjo) y aparece como chip arriba, con un botón "Limpiar".
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="font-bold text-red-800 mb-1">Repeticiones (reprobados)</div>
              <p className="text-sm text-red-700">
                El botón <strong>"Ver reprobados"</strong> muestra, en rojo punteado, una flecha
                desde cada ramo reprobado hacia el intento siguiente del mismo ramo. Es un toggle
                global e independiente de los prerrequisitos.
              </p>
            </div>
          </div>
        </Section>

        <Section icon={<BarChart3 size={20} className="text-blue-500" />} title="Métricas del Dashboard">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { sigla: 'PPE', nombre: 'Tasa de Titulación', desc: '% de estudiantes que se titulan del total simulado.' },
              { sigla: 'PSCE', nombre: 'Semestres Promedio', desc: 'Número promedio de semestres de un titulado.' },
              { sigla: 'EE', nombre: 'Eficiencia de Egreso', desc: 'Ratio semestres teóricos / promedio real (1.0 = ideal).' },
              { sigla: 'PEO', nombre: 'Egreso Oportuno', desc: '% que egresa dentro de la duración nominal de la carrera.' },
              { sigla: 'Ret 1°', nombre: 'Retención 1er Año', desc: '% activo luego de 2 semestres.' },
              { sigla: 'Ret 3°', nombre: 'Retención 3er Año', desc: '% activo luego de 6 semestres.' },
            ].map((m) => (
              <div key={m.sigla} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{m.sigla}</span>
                  <span className="font-bold text-slate-800 text-sm">{m.nombre}</span>
                </div>
                <p className="text-xs text-slate-500">{m.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={<Table size={20} className="text-blue-500" />} title="Formato: CSV de Malla (importar mallas)">
          <p className="text-sm text-slate-600 mb-4">
            Al importar una malla CSV en <strong>Nueva Simulación → CSV</strong>, las columnas
            se detectan por nombre (no importa el orden):
          </p>
          <FormatTable
            cols={['Columna', 'Tipo', 'Descripción', 'Ejemplo']}
            rows={[
              ['id / sigla / codigo', 'Texto', 'Identificador único de la asignatura', 'MAT-101'],
              ['semestre / sem', 'Número', 'Semestre nominal (1, 2, 3, …)', '1'],
              ['cred / creditos', 'Número', 'Créditos académicos', '6'],
              ['rep / reprobacion / tasa', 'Decimal', 'Tasa histórica de reprobación (0.0–1.0)', '0.53'],
              ['reqs / prerrequisitos', 'Texto', 'IDs separados por `;` (vacío si no tiene)', 'MAT-101;FIS-101'],
              ['dictacion', 'Texto', '`anual` o `semestral`', 'semestral'],
            ]}
          />
          <CodeBlock
            title="Ejemplo de archivo"
            code={`id,semestre,cred,rep,reqs,dictacion
MAT-101,1,6,0.53,,semestral
FIS-101,1,5,0.48,,semestral
MAT-201,2,6,0.51,MAT-101,semestral
FIS-301,3,5,0.44,FIS-201;MAT-201,anual`}
          />
        </Section>

        <Section icon={<Upload size={20} className="text-purple-600" />} title="Formato: CSV de Historial (importar alumno)">
          <p className="text-sm text-slate-600 mb-4">
            En <strong>Simular Alumno → Manual → Cargar CSV/JSON</strong> y en{' '}
            <strong>Generar Cohorte → Manual</strong>, puedes cargar el historial de un alumno con
            este formato simple:
          </p>
          <FormatTable
            cols={['Columna', 'Tipo', 'Descripción', 'Ejemplo']}
            rows={[
              ['periodo', 'Texto', 'Regex `S[12]-AAAA` (semestre 1 o 2 + año)', 'S1-2023'],
              ['sigla', 'Texto', 'Debe coincidir con una asignatura de la malla', 'MAT-101'],
              ['creditos', 'Entero', 'Créditos del ramo (≥1)', '6'],
              ['nota', 'Decimal', '1.0–7.0 (vacío o 0 si en curso/abandonado)', '5.5'],
              ['estado', 'Texto', '`aprobado` / `reprobado` / `en_curso` / `abandonado`', 'aprobado'],
            ]}
          />
          <CodeBlock
            title="Ejemplo de archivo"
            code={`periodo,sigla,creditos,nota,estado
S1-2022,MAT-101,6,5.5,aprobado
S1-2022,FIS-101,5,3.5,reprobado
S2-2022,MAT-101,6,4.2,aprobado
S2-2022,QUI-101,4,5.0,aprobado
S1-2023,MAT-201,6,0,en_curso`}
          />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800 font-semibold flex items-center gap-2">
              <Info size={16} className="text-blue-600 shrink-0" /> Detección automática
            </p>
            <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-6 list-disc">
              <li>Separador: el archivo puede usar <code className="bg-blue-100 px-1 rounded">,</code> o <code className="bg-blue-100 px-1 rounded">;</code>.</li>
              <li>Decimales: acepta tanto <code className="bg-blue-100 px-1 rounded">5.5</code> como <code className="bg-blue-100 px-1 rounded">5,5</code>.</li>
              <li>Encoding: UTF-8 (con o sin BOM).</li>
              <li>Si una sigla no está en la malla seleccionada, se omite con un warning.</li>
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-3">
            <p className="text-sm text-amber-800 font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0" /> Coherencias automáticas
            </p>
            <ul className="text-xs text-amber-700 mt-2 space-y-1 ml-6 list-disc">
              <li>Si estado=aprobado pero nota &lt; 4.0 → se ajusta a 4.0 (con warning).</li>
              <li>Si estado=reprobado pero nota ≥ 4.0 → se ajusta a 3.9 (con warning).</li>
              <li>Si estado=en_curso o abandonado → nota se fuerza a 0.</li>
            </ul>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            <strong>Round-trip:</strong> el JSON descargado en el ZIP de un alumno (
            <code className="bg-slate-100 px-1.5 rounded font-mono">ID_historial.json</code>) puede
            volver a cargarse tal cual — ideal para editar el historial fuera de la app.
          </p>
        </Section>

        <Section icon={<Sparkles size={20} className="text-violet-600" />} title="Perfiles de Alumno (sintéticos)">
          <p className="text-sm text-slate-600 mb-3">
            En las vistas que generan alumnos sintéticos (<em>Simular Alumno</em>,{' '}
            <em>Generar Cohorte</em>), se elige un perfil que determina los rasgos del alumno. Cada
            perfil tiene 3 valores en [0,1]:
          </p>
          <FormatTable
            cols={['Perfil', 'Esfuerzo', 'Disciplina', 'Tolerancia', 'Descripción']}
            rows={[
              ['esforzado_top', '0.95', '0.90', '0.85', 'Alta capacidad, muy consistente y tolera carga alta'],
              ['promedio_alto', '0.70', '0.75', '0.70', 'Sobre la media en las tres dimensiones'],
              ['promedio', '0.55', '0.60', '0.55', 'Centro de la distribución'],
              ['promedio_bajo', '0.40', '0.45', '0.40', 'Bajo la media, inscribe cargas más livianas'],
              ['en_problemas', '0.25', '0.30', '0.25', 'Riesgo alto: poca capacidad, irregular y baja carga'],
            ]}
          />
          <p className="text-xs text-slate-500 mt-3">
            <strong>Esfuerzo</strong> = capacidad y dedicación (sube la probabilidad de aprobar).{' '}
            <strong>Disciplina</strong> = consistencia (reduce la variabilidad de las notas).{' '}
            <strong>Tolerancia</strong> = cuánta carga inscribe sin saturarse (más alta ⇒ más
            créditos por semestre). El perfil <em>manual</em> aparece cuando el alumno se construyó
            a mano (sin rasgos sintéticos).
          </p>
        </Section>

        <Section icon={<Download size={20} className="text-emerald-600" />} title="Formato: ZIP descargado">
          <p className="text-sm text-slate-600 mb-3">
            Cada vista produce un ZIP con su propio contenido. Aquí está el inventario completo:
          </p>

          <h4 className="font-bold text-slate-700 text-sm mt-4 mb-2">Simulación agregada (Nueva Simulación)</h4>
          <FilesGrid
            files={[
              ['malla.csv', 'Estructura curricular con parámetros'],
              ['parametros.txt', 'Variables y modelo estocástico usados'],
              ['resultados.csv', 'KPIs y distribución de semestres de titulación'],
              ['ramos_criticos.csv', 'Ranking por tasa de fallo'],
              ['heatmap_estado_semestre.csv', 'Estado × semestre'],
              ['heatmap_asignaturas_kanban.csv', 'Tasa de fallo asignatura × semestre'],
              ['transiciones_estado.csv', 'Para vista Sankey'],
              ['sensibilidad_tornado.csv', 'Análisis de sensibilidad'],
              ['graficos/*.png', 'Capturas del dashboard'],
            ]}
          />

          <h4 className="font-bold text-slate-700 text-sm mt-5 mb-2">Alumno individual (Simular Alumno)</h4>
          <FilesGrid
            files={[
              ['ID_historial.json', 'StudentHistory completo (re-importable)'],
              ['ID_trayectoria.csv', 'Una fila por curso, abre en Excel'],
              ['ID_proyeccion.json', 'IndividualPrediction (solo si proyectaste)'],
            ]}
          />

          <h4 className="font-bold text-slate-700 text-sm mt-5 mb-2">Cohorte (Generar Cohorte)</h4>
          <FilesGrid
            files={[
              ['resumen.csv', 'Una fila por alumno con stats básicas'],
              ['alumnos/IDXX.json', 'StudentHistory de cada uno'],
              ['alumnos/IDXX.csv', 'Trayectoria CSV de cada uno'],
            ]}
          />

          <p className="text-xs text-slate-500 mt-4">
            Todos los CSV usan separador <code className="bg-slate-100 px-1.5 rounded">;</code> y
            coma decimal (estilo Excel ES-CL).
          </p>
        </Section>

        <Section icon={<Archive size={20} className="text-slate-600" />} title="Anonimización (IDs A001, A002, …)">
          <p className="text-sm text-slate-600 leading-relaxed">
            Para no exponer datos sensibles, la UI muestra solo <strong>IDs anónimos</strong> tipo{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">A001</code>,{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">A002</code>, etc. — no
            RUTs, no nombres. La asignación es por índice dentro de la cohorte o por hash FNV-1a si
            el alumno viene de un import con RUT.
          </p>
        </Section>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center mt-8">
          <p className="text-sm text-slate-600">
            <strong>SimulaPUCV</strong> — Basado en el modelo de simulación de{' '}
            <strong>Jorge Mendoza Baeza</strong> (PUCV, 2023).
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Motor Montecarlo (Go + goroutines) · UI React + TypeScript · PostgreSQL · Vite + Tailwind v4
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-componentes de presentación
// ============================================

function Header() {
  return (
    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200">
      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
        <BookOpen size={24} className="text-blue-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Guía de Uso — SimulaPUCV</h2>
        <p className="text-sm text-slate-500">
          Documentación completa de vistas, parámetros y formatos
        </p>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-10">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function ViewCard({
  icon,
  color,
  name,
  purpose,
  inputs,
  outputs,
}: {
  icon: React.ReactNode;
  color: string;
  name: string;
  purpose: string;
  inputs: string;
  outputs: string;
}) {
  const colorClass =
    {
      blue: 'border-blue-200 bg-blue-50',
      emerald: 'border-emerald-200 bg-emerald-50',
      indigo: 'border-indigo-200 bg-indigo-50',
      purple: 'border-purple-200 bg-purple-50',
      amber: 'border-amber-200 bg-amber-50',
      slate: 'border-slate-200 bg-slate-50',
    }[color] || 'border-slate-200 bg-slate-50';
  const iconColorClass =
    {
      blue: 'bg-blue-200 text-blue-700',
      emerald: 'bg-emerald-200 text-emerald-700',
      indigo: 'bg-indigo-200 text-indigo-700',
      purple: 'bg-purple-200 text-purple-700',
      amber: 'bg-amber-200 text-amber-700',
      slate: 'bg-slate-200 text-slate-700',
    }[color] || 'bg-slate-200 text-slate-700';
  return (
    <div className={`border rounded-lg p-4 mb-3 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${iconColorClass}`}>
          {icon}
        </div>
        <h4 className="font-bold text-slate-800">{name}</h4>
      </div>
      <p className="text-sm text-slate-700 mb-2">{purpose}</p>
      <div className="text-xs text-slate-600 space-y-1">
        <p>
          <strong>Entrada:</strong> {inputs}
        </p>
        <p>
          <strong>Salida:</strong> {outputs}
        </p>
      </div>
    </div>
  );
}

function ParamCard({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="text-xs font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded inline-block mb-2">
        {name}
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function FormatTable({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-slate-800 text-white">
            {cols.map((c) => (
              <th key={c} className="p-3 text-left font-bold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={
                    j === 0
                      ? 'p-3 font-mono text-xs font-bold text-blue-700'
                      : j === row.length - 1
                        ? 'p-3 font-mono text-xs text-slate-800'
                        : 'p-3 text-xs text-slate-600'
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="bg-slate-900 rounded-xl p-5 mb-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</p>
      <pre className="text-green-400 font-mono text-xs leading-relaxed overflow-x-auto">{code}</pre>
    </div>
  );
}

function FilesGrid({ files }: { files: string[][] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {files.map(([file, desc]) => (
        <div
          key={file}
          className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-3"
        >
          <FileSpreadsheet size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-mono text-xs font-bold text-slate-800">{file}</span>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
