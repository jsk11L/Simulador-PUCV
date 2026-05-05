import { AlertCircle, BarChart3, BookOpen, Download, FileSpreadsheet, Info, Rocket, Table } from 'lucide-react';

export default function HelpView() {
  return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <BookOpen size={24} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Guía de Uso — SimulaPUCV</h2>
            <p className="text-sm text-slate-500">Aprende a usar la plataforma de simulación curricular</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3"><Info size={20} className="text-blue-500" /> La plataforma SimulaPUCV</h3>
          <p className="text-slate-600 leading-relaxed">
            SimulaPUCV es una plataforma de simulación académica basada en el <strong>Método Estocástico de Montecarlo</strong>.
            Se opera con un <strong>wizard de 3 pasos</strong>, una barra lateral de navegación para consultar resultados
            históricos y una capa de exportación técnica en formato ZIP con métricas, tablas y capturas de gráficos.
          </p>
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-700 font-semibold mb-2">Vistas activas en la barra lateral</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Nueva Simulación, Continuar Simulación, Log Pasado, Último Resultado, Resultados Pasados, Mallas Guardadas y Ayuda.
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><Rocket size={20} className="text-blue-500" /> Flujo de Trabajo Vigente (Wizard)</h3>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Diseño de Malla + Configuración Global', desc: 'Selecciona método de inicio (Plantillas, CSV, Malla guardada o Hoja en Blanco), edita asignaturas en Kanban y define variables/modelo desde el modal de Configuración.' },
              { step: 2, title: 'Resumen y Validación', desc: 'Consolida estructura curricular, parámetros de simulación y modelo de calificaciones antes de ejecutar el motor.' },
              { step: 3, title: 'Resultados y Re-ejecución', desc: 'Visualiza KPIs, distribuciones, heatmaps, Sankey y sensibilidad. Puedes volver a Resumen o relanzar simulación sin reiniciar el flujo.' },
            ].map(s => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">{s.step}</div>
                <div>
                  <h4 className="font-bold text-slate-800">{s.title}</h4>
                  <p className="text-sm text-slate-600 mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><Info size={20} className="text-blue-500" /> Parámetros de Configuración y Efecto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {[
              ['NE', 'Cantidad de estudiantes simulados por corrida. A mayor NE, menor ruido estadístico y mayor costo computacional.'],
              ['NCSmax', 'Tope de créditos que un estudiante puede cursar por semestre. Incrementarlo acelera avance potencial y puede elevar egreso oportuno.'],
              ['TAmin', 'Umbral mínimo de avance académico exigido. Valores más altos endurecen permanencia y aumentan riesgo de eliminación por avance insuficiente.'],
              ['NapTAmin', 'Semestre desde el cual comienza a aplicarse TAmin. Controla cuán temprano entra la restricción de avance.'],
              ['Opor', 'Máximo de reprobaciones toleradas por asignatura. Subirlo reduce expulsiones por oportunidades agotadas.'],
              ['MaxSemestres', 'Cota superior del horizonte de simulación por malla. Debe coincidir con el mayor semestre presente en las asignaturas de la malla.'],
            ].map(([name, desc]) => (
              <div key={name} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-xs font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded inline-block mb-2">{name}</div>
                <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-bold text-slate-800 mb-3">Modelo de Calificaciones (VMap y Delta)</p>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p><strong>VMap1234, VMap5678, VMapM:</strong> media de aprobación esperada por ciclo. Valores mayores tienden a reducir repitencia.</p>
              <p><strong>Delta1234, Delta5678, DeltaM:</strong> dispersión alrededor de la media por ciclo. Valores mayores introducen más variabilidad inter-estudiante y amplían el rango de trayectorias.</p>
              <p>La combinación <strong>VMap alto + Delta bajo</strong> produce cohortes más estables; <strong>VMap bajo + Delta alto</strong> suele aumentar dispersión en tiempos de titulación y riesgo de rezago.</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><BarChart3 size={20} className="text-blue-500" /> Métricas del Dashboard</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { sigla: 'PPE', nombre: 'Tasa de Titulación', desc: 'Porcentaje de estudiantes que logran titularse del total simulado.' },
              { sigla: 'PSCE', nombre: 'Semestres Promedio', desc: 'Número promedio de semestres que tarda un titulado en egresar.' },
              { sigla: 'EE', nombre: 'Eficiencia de Egreso', desc: 'Ratio entre semestres teóricos y el promedio real (1.0 = ideal).' },
              { sigla: 'PEO', nombre: 'Egreso Oportuno', desc: 'Porcentaje que egresa dentro de la duración teórica de la carrera.' },
              { sigla: 'Ret 1°', nombre: 'Retención 1er Año', desc: 'Porcentaje que sigue activo luego del primer año (2 semestres).' },
              { sigla: 'Ret 3°', nombre: 'Retención 3er Año', desc: 'Porcentaje que sigue activo luego del tercer año (6 semestres).' },
            ].map(m => (
              <div key={m.sigla} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{m.sigla}</span>
                  <span className="font-bold text-slate-800 text-sm">{m.nombre}</span>
                </div>
                <p className="text-xs text-slate-500">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><Table size={20} className="text-blue-500" /> Formato de CSV para Importar Mallas</h3>
          <p className="text-sm text-slate-600 mb-4">Para importar una malla desde un archivo CSV, el archivo debe tener las siguientes columnas (el orden no importa, se detectan automáticamente por nombre):</p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead><tr className="bg-slate-800 text-white"><th className="p-3 text-left font-bold">Columna</th><th className="p-3 text-left font-bold">Tipo</th><th className="p-3 text-left font-bold">Descripción</th><th className="p-3 text-left font-bold">Ejemplo</th></tr></thead>
              <tbody>
                {[
                  ['id / sigla / codigo', 'Texto', 'Identificador único de la asignatura', 'MAT-101'],
                  ['semestre / sem', 'Número', 'Semestre donde se ubica (1, 2, 3...)', '1'],
                  ['cred / creditos', 'Número', 'Créditos académicos de la asignatura', '6'],
                  ['rep / reprobacion / tasa', 'Decimal', 'Tasa de reprobación histórica (0.0 a 1.0)', '0.53'],
                  ['reqs / prerrequisitos', 'Texto', 'IDs separados por ; (vacío si no tiene)', 'MAT-101;FIS-101'],
                  ['dictacion', 'Texto', '«anual» o «semestral»', 'semestral'],
                ].map(([col, tipo, desc, ej], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-3 font-mono text-xs font-bold text-blue-700">{col}</td>
                    <td className="p-3 text-slate-600">{tipo}</td>
                    <td className="p-3 text-slate-600">{desc}</td>
                    <td className="p-3 font-mono text-xs text-slate-800 bg-slate-100">{ej}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900 rounded-xl p-5 mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ejemplo de archivo CSV</p>
            <pre className="text-green-400 font-mono text-xs leading-relaxed overflow-x-auto">{`id,semestre,cred,rep,reqs,dictacion
MAT-101,1,6,0.53,,semestral
FIS-101,1,5,0.48,,semestral
QUI-101,1,4,0.40,,semestral
MAT-201,2,6,0.51,MAT-101,semestral
FIS-201,2,5,0.46,FIS-101,anual
FIS-301,3,5,0.44,FIS-201;MAT-201,anual`}</pre>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-semibold flex items-center gap-2"><AlertCircle size={16} className="text-amber-600 shrink-0" />Notas importantes sobre el CSV</p>
            <ul className="text-xs text-amber-700 mt-2 space-y-1 ml-6 list-disc">
              <li>La primera fila debe ser la cabecera con los nombres de columna.</li>
              <li>Los prerrequisitos se separan con punto y coma (<code className="bg-amber-100 px-1 rounded">;</code>).</li>
              <li>Si la asignatura no tiene prerrequisitos, dejar el campo vacío.</li>
              <li>La tasa de reprobación debe ser un decimal entre 0.0 y 1.0 (ej: 0.53 = 53%).</li>
              <li>La dictación debe ser exactamente <code className="bg-amber-100 px-1 rounded">anual</code> o <code className="bg-amber-100 px-1 rounded">semestral</code>.</li>
            </ul>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3"><Download size={20} className="text-blue-500" /> Descarga de Resultados</h3>
          <p className="text-sm text-slate-600 mb-3">Después de ejecutar una simulación, el botón <strong>"Descargar (.zip)"</strong> genera un archivo comprimido con:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['malla.csv', 'Todas las asignaturas con sus parámetros'],
              ['parametros.txt', 'Variables de simulación y modelo estocástico'],
              ['resultados.csv', 'KPIs y distribución de semestres de titulación'],
              ['ramos_criticos.csv', 'Ranking de ramos por tasa de fallo en la simulación'],
              ['heatmap_estado_semestre.csv', 'Matriz de estados por semestre (si está disponible)'],
              ['transiciones_estado.csv', 'Transiciones entre estados para vista Sankey (si aplica)'],
              ['sensibilidad_tornado.csv', 'Análisis de sensibilidad tipo tornado (si aplica)'],
              ['heatmap_asignaturas_kanban.csv', 'Tasa de fallo por asignatura y semestre para heatmap Kanban'],
              ['graficos/*.png', 'Capturas de gráficos del dashboard (si existen en pantalla)'],
            ].map(([file, desc]) => (
              <div key={file} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-3">
                <FileSpreadsheet size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono text-xs font-bold text-slate-800">{file}</span>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600"><strong>SimulaPUCV</strong> — Basado en el modelo de simulación de <strong>Jorge Mendoza Baeza</strong> (PUCV, 2023).</p>
          <p className="text-xs text-slate-400 mt-2">Motor de Montecarlo con Goroutines · React + TypeScript · Go + Gin · PostgreSQL</p>
        </div>
      </div>
    </div>
  );
}
