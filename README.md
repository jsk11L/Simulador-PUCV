# SimulaPUCV

Plataforma SaaS para simulación curricular de Ingeniería Civil Eléctrica PUCV, basada en Montecarlo y orientada a análisis de trayectoria académica.

Estado general: casi completado (cierre de fase final en curso).

## Estado actual del proyecto

### Implementado
- Autenticación con registro/login y aprobación administrativa de usuarios.
- Wizard de simulación en 5 pasos.
- Diseño de malla con tablero tipo Kanban.
- Carga de plantilla realista (8 semestres, 32 asignaturas).
- Importación de mallas vía CSV (PapaParse).
- Guardado/carga de mallas en PostgreSQL.
- Motor Montecarlo en Go con concurrencia (worker pool).
- Dashboard de resultados con KPIs, histograma y ramos críticos.
- Historial de resultados y vista de último resultado.
- Exportación de resultados en `.zip`.
- Panel de administración de usuarios.
- Tab de ayuda integrada en frontend.

### No crítico y fuera de alcance inmediato
- Recuperación de contraseña (forgot/reset): descartado temporalmente por prioridad funcional.

### Pendientes de cierre
- Pulido responsive final en pantalla de creación de mallas.
- Refactorización de `frontend/src/App.tsx` para reducir monolito.
- Ajustes finales de limpieza y documentación.

## Arquitectura

```text
Simulador-PUCV/
├── README.md
├── project_analysis.md.resolved
├── original/
│   ├── MallasV12.m
│   ├── MatLab Original Code.md
│   ├── Paper Resume.md
│   └── XLSX File Description.md
├── backend/
│   ├── main.go
│   ├── engine/montecarlo.go
│   ├── handlers/handlers.go
│   ├── middleware/auth.go
│   └── models/models.go
└── frontend/
    └── src/
        ├── App.tsx
        └── types.ts
```

## Stack

- Frontend: React 19, TypeScript 5.9, Vite 8, Tailwind v4
- Backend: Go 1.26.1, Gin 1.12, GORM 1.31
- Base de datos: PostgreSQL (pgx v5)
- Seguridad: JWT + bcrypt
- Librerías clave: lucide-react, PapaParse, JSZip

## Endpoints principales

- `POST /api/register`
- `POST /api/login`
- `POST /api/simular`
- `POST /api/mallas`
- `GET /api/mallas`
- `PUT /api/mallas/:id`
- `DELETE /api/mallas/:id`
- `GET /api/resultados`
- `GET /api/resultados/:id`
- `GET /api/exportar`
- `GET /api/admin/usuarios`
- `PATCH /api/admin/usuarios/:id`

## Fuente metodológica

El comportamiento objetivo del simulador se basa en los artefactos de `original/`:
- Paper resumido
- Script y lógica original en MATLAB
- Descripción de datos históricos

Estos documentos son la referencia para validar equivalencia del modelo y reglas académicas.

## Ejecutar el proyecto

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

Configura `backend/.env` con tu conexión a PostgreSQL y secreto JWT.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Por defecto el frontend consume `http://localhost:8080`.
Puedes cambiarlo con `VITE_API_BASE_URL`.

## Flujo recomendado de uso

1. Iniciar sesión.
2. Crear malla: plantilla, CSV, guardada o en blanco.
3. Ajustar variables de simulación.
4. Ajustar modelo estocástico.
5. Revisar resumen y ejecutar simulación.
6. Analizar dashboard y descargar resultados.

## Riesgos técnicos conocidos

- `App.tsx` aún concentra demasiada lógica y UI.
- Sin suite de tests automatizados.
- CORS wildcard para desarrollo (debe ajustarse en producción).

## Próximo paso de desarrollo

Refactor incremental de `App.tsx` en módulos (wizard, malla, resultados, admin, ayuda, hooks API/estado) manteniendo compatibilidad funcional total.
