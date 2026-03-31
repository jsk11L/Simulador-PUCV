📘 SimulaPUCV: Documentación y Bitácora del Proyecto

1. Visión y Objetivos Iniciales

SimulaPUCV nace de la necesidad de modernizar y empaquetar un modelo de simulación académica desarrollado originalmente en MATLAB (MallasV12.m). El objetivo principal es proporcionar a la jefatura de carrera de Ingeniería Civil Eléctrica de la PUCV una Plataforma SaaS (Software as a Service) Web interactiva.

La herramienta permite evaluar cambios curriculares y estrategias de implementación mediante el Método Estocástico de Montecarlo, proyectando indicadores clave de rendimiento (KPIs) como la tasa de titulación, tiempos de egreso y cuellos de botella sin necesidad de conocimientos en programación.

2. Stack Tecnológico Elegido

Frontend: React.js con TypeScript, construido sobre Vite. Estilizado íntegramente con Tailwind CSS v4. Uso de lucide-react para iconografía.

Backend: Golang (Go) utilizando el framework Gin para la API REST.

Base de Datos: PostgreSQL con el ORM GORM.

Seguridad: Autenticación basada en JWT (JSON Web Tokens) y encriptación de contraseñas con bcrypt.

3. Evolución del Proyecto y Cambios de Dirección (Pivotes)

A lo largo del desarrollo, la retroalimentación continua y el análisis estricto de los datos fuente (Civilelectrica93.xlsx y el Paper de investigación) provocaron cambios vitales en el enfoque del sistema:

3.1. Abandono de la "Simulación por Certámenes"

Idea Inicial: Se pensó en simular el rendimiento de los alumnos evaluación por evaluación (Certamen 1, Certamen 2, Examen).

El Pivote: Al analizar la data histórica real (Malla.csv), se constató que la universidad solo posee la Tasa Global de Reprobación histórica por ramo. Simular por certámenes obligaría a "inventar" datos y pesos porcentuales, invalidando el rigor científico del modelo. Se optó por una evaluación estocástica por semestre usando el valor medio de aprobación (VMap) y su desviación (Delta).

3.2. Eliminación de la "Generación Manual de Alumnos"

Idea Inicial: Un paso completo en el Wizard para crear cohortes, añadir alumnos a mano o subir un CSV con notas previas.

El Pivote: El modelo de MATLAB no hace seguimiento a alumnos individuales reales, sino que genera N estudiantes virtuales (Ej. NE = 150) puramente estadísticos. Se reemplazó este engorroso paso por una simple configuración de Variables de Simulación (NE, NCSmax, TAmin, etc.), acelerando el flujo de trabajo del usuario.

3.3. Incorporación de la "Dictación" (Programación Académica)

El Problema: Faltaba modelar el archivo ProgramacionB.csv. En la realidad, si un alumno reprueba un ramo que solo se dicta en semestres impares, se atrasa un año completo, no medio año.

La Solución: Se añadió el parámetro obligatorio de Dictación (Anual o Semestral) a cada asignatura en la interfaz y en el motor de Go, reflejando fielmente las restricciones reales de la PUCV.

3.4. La Crisis del "Diseño Responsive"

El Problema: Durante la integración de resultados, un agente de IA intentó hacer la interfaz 100% adaptable a móviles, lo que rompió la jerarquía de React, destruyó la pantalla de Login y provocó "pantallazos blancos" por errores de renderizado.

La Solución: Se decidió congelar temporalmente la adaptabilidad móvil. El enfoque retornó a garantizar un Desktop-First robusto, funcional y estable antes de preocuparse por resoluciones menores.

4. Estado Actual: Funcionalidades Implementadas

🛡️ Seguridad y Autenticación

Login/Registro: Sistema funcional con base de datos.

Aprobación de Cuentas: Los usuarios nuevos quedan en estado IsApproved = false para evitar acceso no autorizado a datos sensibles de la universidad.

Recuperación: Endpoints funcionales de Forgot Password y Reset Password (simulando envío de correos en la terminal del servidor local).

🧙‍♂️ Frontend: El Flujo de Usuario (Wizard)

Paso 1 - Diseño de Malla (Kanban):

Modal inicial para cargar la Plantilla 10me, importar CSV (UI), Malla Guardada o Empezar en Blanco.

Creación inteligente de IDs: Formato XYY (ej. 100, 101, 200). Busca siempre el número más bajo disponible.

Drawer (Panel Lateral) para editar Sigla, Créditos, Tasa de Reprobación, Prerrequisitos y Dictación.

Validaciones estrictas: Impide avanzar si hay semestres vacíos, ramos sin dictación definida, o prerrequisitos inexistentes / "viajes en el tiempo" (prerrequisito en el mismo semestre o posterior).

Paso 2 - Variables de Simulación:

Formularios para configurar: NE (Nº Alumnos), NCSmax, TAmin, NapTAmin, y Opor.

Paso 3 - Modelo Estocástico:

Parámetros de media (VMap) y desviación (Delta) divididos por los 3 ciclos académicos: Básico (Sem 1-4), Profesional (Sem 5-8) y Titulación (Sem 9+).

Paso 4 - Resumen:

Revisión visual final de todos los parámetros elegidos antes de enviar la carga de trabajo al servidor.

⚙️ Backend: El Motor de Montecarlo (Golang)

Traducción 1:1 de las matemáticas de MallasV12.m.

Goroutines: Procesamiento concurrente masivo. Simula la trayectoria de miles de estudiantes en hilos paralelos, reduciendo el tiempo de cálculo drásticamente.

Evaluaciones de retención universitaria en tiempo real (eliminación por TAmin u Opor).

📊 Resultados y Base de Datos (Dashboard)

Integración con PostgreSQL (ResultadoDB, MallaDB).

Panel de resultados basado estrictamente en el Paper de investigación:

KPIs Clave: Tasa Titulación (CT), Semestres Promedio (PSC), Eficiencia Curricular y Egreso Oportuno.

Gráfico Interactivo: Distribución de tiempos de titulación dibujado dinámicamente con divs de Tailwind.

Ramos Críticos: Tabla generada en Go que rankea los ramos según su tasa de falla (intentos vs reprobaciones) durante la simulación específica.

Barras Laterales con Historial: Visualización de resultados pasados y un visor de "Logs" (JSON crudo) para auditoría de datos.

5. Decisiones de Diseño: Lo Descartado

En pro de la simplicidad ("Menos es más") y la eficiencia, se descartaron permanentemente las siguientes ideas:

Guardado de Variables y Modelos: Se eliminó la persistencia de estos pasos. Dado que son solo un puñado de campos numéricos rápidos de editar, guardarlos en la BD ensuciaba la interfaz y el backend innecesariamente. Solo se guardan Mallas y Resultados Finales.

Persistencia Local (localStorage) en Wizard: Se eliminó el guardado automático de progreso a nivel de navegador para evitar conflictos de sincronización. El progreso se mantiene en memoria RAM (estados de React) mientras no se recargue la pestaña.

6. Deuda Técnica y Próximos Pasos (Pendiente)

Diseño Responsive:

Adaptar la plataforma completa para resoluciones menores (pantallas < 1080p, tablets y móviles) usando media queries de Tailwind (md:, lg:).

Importador de CSV Real:

Actualmente el botón "Importar Archivo CSV" abre la ventana de selección, pero falta la librería en React (ej. PapaParse) para transformar el archivo de Excel en el arreglo de objetos de la Malla.

Exportador de Datos (Mantención):

Se requiere reimplementar un endpoint limpio que permita a un administrador descargar un archivo .zip o .json con todas las mallas y resultados de la BD para propósitos de respaldo (Backup).

Panel de Administrador (SuperUser):

Crear una vista en el Frontend para que el administrador principal pueda cambiar el estado IsApproved de los nuevos usuarios registrados directamente desde la web, sin usar pgAdmin.