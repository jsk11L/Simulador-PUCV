# 📘 SimulaPUCV: Plataforma de Simulación Académica

**SimulaPUCV** es una aplicación web SaaS (Software as a Service) diseñada para modernizar y automatizar el análisis de rendimiento estudiantil en la carrera de Ingeniería Civil Eléctrica de la Pontificia Universidad Católica de Valparaíso (PUCV). Reemplaza procesos manuales y hojas de cálculo por un entorno digital interactivo y basado en datos reales.

## 🚀 Características Principales

### 🛡️ Seguridad y Autenticación
*   **Sistema de Usuarios**: Registro y Login seguro para jefaturas de carrera.
*   **Aprobación de Cuentas**: Los nuevos usuarios quedan en estado `IsApproved = false` hasta ser validados por un administrador.
*   **Recuperación de Contraseña**: Flujo completo de `Forgot Password` y `Reset Password` con tokens temporales.

### 🧙‍♂️ Flujo de Usuario (Wizard)
El sistema guía al usuario a través de un proceso estructurado para configurar y ejecutar simulaciones:

1.  **Diseño de Malla (Kanban)**:
    *   **Importación**: Carga de mallas desde archivos CSV (Excel) o plantillas predefinidas.
    *   **Edición Visual**: Interfaz tipo Kanban para gestionar asignaturas.
    *   **Validaciones Inteligentes**:
        *   Verificación de semestres vacíos.
        *   Control de prerrequisitos (no pueden estar en el mismo semestre o en el futuro).
        *   Definición de dictación (Anual o Semestral).

2.  **Variables de Simulación**:
    *   Configuración de parámetros estocásticos:
        *   `NE`: Número de estudiantes a simular.
        *   `NCSmax`: Tope de créditos por semestre.
        *   `TAmin`: Tasa de avance mínima para evitar eliminación.
        *   `Opor`: Oportunidades máximas para reprobar.

3.  **Modelo Estocástico**:
    *   Configuración de parámetros de aprobación:
        *   `VMap`: Valor medio de aprobación por ciclo (Básico, Profesional, Titulación).
        *   `Delta`: Desviación estándar para la aleatoriedad.

4.  **Resumen y Ejecución**:
    *   Revisión final de la configuración antes de enviar la simulación al servidor.

### ⚙️ Motor de Simulación (Backend)
*   **Tecnología**: Golang (Go) con framework Gin.
*   **Algoritmo**: Implementación fiel del método estocástico de Montecarlo.
*   **Concurrencia**: Uso intensivo de **Goroutines** para procesar miles de estudiantes en paralelo, optimizando drásticamente el tiempo de cálculo.
*   **Lógica de Negocio**:
    *   Simula la trayectoria académica completa de cada estudiante virtual.
    *   Aplica reglas de retención universitaria (eliminación por bajo avance o exceso de reprobaciones).
    *   Maneja la lógica de dictación (anual/semestral) para calcular atrasos reales.

### 📊 Resultados y Dashboard
*   **Integración con PostgreSQL**: Persistencia de mallas y resultados en bases de datos (`MallaDB`, `ResultadoDB`).
*   **KPIs de Rendimiento**:
    *   **CT**: Porcentaje Promedio de Egresados.
    *   **PSC**: Promedio de Semestres Cursados para Egreso.
    *   **EE**: Eficiencia de Egreso.
    *   **PEO**: Porcentaje de Egresados Oportunamente.
*   **Visualización de Datos**:
    *   Gráficos interactivos de distribución de tiempos de titulación.
    *   Tablas de "Ramos Críticos" identificados durante la simulación.
    *   Historial de resultados anteriores y logs de auditoría.

## 🛠️ Stack Tecnológico

*   **Frontend**: React.js + TypeScript (Vite).
*   **Estilos**: Tailwind CSS v4.
*   **Iconografía**: lucide-react.
*   **Backend**: Golang (Gin).
*   **Base de Datos**: PostgreSQL.
*   **ORM**: GORM.
*   **Seguridad**: JWT, bcrypt.

## 📝 Decisiones de Diseño y Pivotes

Durante el desarrollo, se tomaron decisiones clave para optimizar la experiencia del usuario y la integridad del modelo:

*   **Abandono de Simulación por Certámenes**: Se descartó simular evaluación por evaluación debido a que la data histórica solo provee tasas de reprobación globales por ramo.
*   **Eliminación de Generación Manual de Alumnos**: Se simplificó el flujo eliminando la carga manual de alumnos, optando por generar cohortes virtuales estadísticas.
*   **Enfoque Desktop-First**: Se priorizó la estabilidad y funcionalidad en pantallas grandes (Desktop) sobre la adaptabilidad móvil inmediata, debido a problemas de renderizado en resoluciones bajas.
