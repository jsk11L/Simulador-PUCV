# SimulaPUCV

Plataforma de simulación curricular para Ingeniería Civil Eléctrica PUCV, basada en Montecarlo y alineada con la lógica del modelo original en MATLAB.

Estado general: casi completado, con foco actual en validación metodológica fina, mejoras de visualización y hardening de producto.

## Estado actual

### Funcionalidades implementadas
- Registro/login con JWT.
- Aprobación de cuentas por panel administrador.
- Wizard completo de simulación (5 fases).
- Diseño de malla con tablero Kanban, edición por drawer, importación CSV y persistencia en BD.
- Límite de semestres de malla configurado en 20.
- Motor Montecarlo en Go con ejecución concurrente (worker pool).
- Dashboard de resultados con KPIs, distribución de egreso y ramos críticos.
- Historial de resultados, último resultado y log técnico.
- Exportación ZIP de resultados y parámetros.
- Vista de ayuda integrada.

### Fuera de alcance inmediato (decisión actual)
- Recuperación de contraseña por email (se posterga por prioridad funcional).

## Arquitectura actual

```text
Simulador-PUCV/
├── backend/
│   ├── main.go
│   ├── engine/montecarlo.go
│   ├── handlers/handlers.go
│   ├── middleware/auth.go
│   └── models/models.go
├── frontend/src/
│   ├── App.tsx
│   ├── types.ts
│   ├── constants/wizard.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAppNavigation.ts
│   │   ├── useWizardState.ts
│   │   ├── useMallaEditorActions.ts
│   │   ├── useMallaPersistence.ts
│   │   ├── useSimulationActions.ts
│   │   └── useSimulaApi.ts
│   └── components/
│       ├── AppSidebar.tsx
│       ├── AppMainContent.tsx
│       ├── MallaStep.tsx
│       ├── VariablesStep.tsx
│       ├── ModeloCalificacionesStep.tsx
│       ├── ResumenStep.tsx
│       ├── ResultadosStep.tsx
│       └── ...
├── original/
│   ├── MallasV12.m
│   ├── MatLab Original Code.md
│   ├── Paper Resume.md
│   └── XLSX File Description.md
└── project_analysis.md.resolved
```

## Stack

- Frontend: React 19, TypeScript 5.9, Vite 8, Tailwind CSS v4
- Backend: Go 1.26.1, Gin 1.12, GORM 1.31
- BD: PostgreSQL (pgx v5)
- Auth: JWT + bcrypt
- Librerías clave: PapaParse, JSZip, lucide-react

## Endpoints activos

- POST /api/register
- POST /api/login
- POST /api/simular
- POST /api/mallas
- GET /api/mallas
- GET /api/mallas/:id
- PUT /api/mallas/:id
- DELETE /api/mallas/:id
- GET /api/resultados
- GET /api/resultados/:id
- GET /api/exportar
- GET /api/admin/usuarios
- PATCH /api/admin/usuarios/:id

## Referencia metodológica

La referencia de comportamiento del simulador es el material de [original/MallasV12.m](original/MallasV12.m), [original/MatLab Original Code.md](original/MatLab Original Code.md) y [original/Paper Resume.md](original/Paper Resume.md).

## Ejecución local

### Requisitos
- Node.js 20+
- Go 1.26+
- PostgreSQL 14+

### Backend

```bash
cd backend
go mod tidy
go run .
```

Configurar variables en backend/.env (DSN y JWT_SECRET).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend usa VITE_API_BASE_URL; por defecto apunta a http://localhost:8080.

## Flujo recomendado

1. Iniciar sesión.
2. Crear o cargar malla (plantilla, CSV, guardada o en blanco).
3. Definir variables de simulación.
4. Ajustar modelo de calificaciones.
5. Revisar resumen y ejecutar.
6. Analizar resultados y exportar ZIP.

## Riesgos y mejoras prioritarias

- Validación fina de equivalencia MATLAB vs Go en reglas de programación/dictación.
- Inclusión opcional de recuperación de cuenta por email.
- Inclusión opcional de exportación de gráficos como imágenes dentro del ZIP.
- Suite de pruebas automatizadas (backend motor + frontend flujos críticos).
- Hardening de seguridad para producción (CORS y manejo de secretos).
