Contexto del Proyecto: SimulaPUCV

1. Visión General

SimulaPUCV es una Plataforma Web SaaS diseñada para jefaturas de carrera de Ingeniería Civil Eléctrica de la PUCV. Reemplaza un script estático de MATLAB por una herramienta web interactiva ("No-Code") para proyectar tasas de titulación, identificar cuellos de botella y simular escenarios mediante el método estocástico de Montecarlo.

2. Stack Tecnológico

Frontend: React.js + TypeScript + Tailwind CSS v4 (compilado con Vite). Componentes funcionales y Hooks. Íconos: lucide-react.

Backend: Golang (Go) usando el framework Gin para la API REST. Concurrencia mediante Goroutines.

Base de Datos: PostgreSQL. ORM utilizado: GORM.

Autenticación: JWT (JSON Web Tokens) vía Authorization: Bearer <token> + bcrypt para contraseñas.

3. Reglas Críticas de Negocio (¡LEER ANTES DE PROGRAMAR!)

El CSV Oficial es la Ley: El modelo algorítmico NO simula notas por "Certámenes" individuales. Se rige ESTRICTAMENTE por las columnas de la data histórica real (Civilelectrica93.xlsx): semestre, sigla, creditos, tasa_reprobacion, num_prerequisitos y sus prerrequisitos (REQ1, REQ2, etc.).

Hiperparámetros de Montecarlo: * TAmin: Tasa de Avance Mínima (créditos mín. para no ser eliminado).

NCSmax: Tope de créditos por semestre.

Opor: Oportunidades máximas para reprobar un mismo ramo.

VMap y Delta: Valor medio y desviación de aprobación global.

Carga de Trabajo: El backend procesará 30,000 alumnos x 10,000 iteraciones. NUNCA guardar todas las iteraciones en la BD, solo promedios finales y JSONs aglomerados para gráficos.

4. Diccionario de Datos e Interfaces (Typescript / Go)

Para mantener la consistencia entre el Frontend (React) y Backend (Go), utiliza ESTAS estructuras obligatoriamente.

A. Interfaces Frontend (React/TypeScript)

// Objeto exacto que maneja el Tablero Kanban y los Modales
interface Asignatura {
  id: string;          // Sigla del ramo (Ej: "115", "MAT116")
  cred: number;        // Créditos (Ej: 6)
  rep: number;         // Tasa histórica de reprobación (Decimal 0.0 a 1.0)
  reqs: string[];      // Array de siglas que son prerrequisitos (Ej: ["115", "116"])
}

interface AlumnoBase {
  id: string;          // ID real o ficticio
  perfil: string;      // "Sobresaliente", "Promedio", "Riesgo"
}

interface Hiperparametros {
  tamin: number;
  ncsmax: number;
  opor: number;
  iteraciones: number;
}


B. Modelos Backend (Golang / GORM)

// Estructura exacta en main.go
type Asignatura struct {
	ID               string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UsuarioID        string `gorm:"type:uuid;not null"`
	EscenarioID      string `gorm:"type:uuid;not null"`
	Semestre         int
	Sigla            string `gorm:"not null"`
	Creditos         int
	TasaReprobacion  float64
	NumPrerequisitos int
}

type Prerrequisito struct {
	ID           string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	AsignaturaID string `gorm:"type:uuid;not null"`
	ReqSigla     string `gorm:"not null"`
	UsuarioID    string `gorm:"type:uuid;not null"`
}


5. Próximos Pasos (El trabajo actual del Desarrollador)

FASE 2: Desarrollo del Flujo Wizard (Frontend)

Actualmente estamos programando el App.tsx en el Frontend. Tareas a realizar paso a paso:

Paso 1 del Wizard (Malla): Implementar la función recursiva en TypeScript que verifique que el arreglo reqs de una Asignatura apunte a siglas válidas que estén ubicadas en semestres estrictamente anteriores al semestre actual de dicha asignatura.

Conexión API (React -> Go): Crear las funciones fetch que guarden el array de Asignatura[] actual en el backend enviando el JWT en los headers.

Paso 2 del Wizard (Alumnos): Crear la UI (Popup y Lista) que permita subir un archivo CSV, parsearlo en React y mapearlo a un arreglo de la interfaz AlumnoBase.

FASE 3: Motor de Simulación (Backend)

Escribir la ruta POST /api/simular en Gin que reciba el JSON con Malla, Alumnos e Hiperparámetros, y ejecute la simulación de Montecarlo concurrente.