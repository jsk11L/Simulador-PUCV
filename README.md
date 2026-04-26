# SimulaPUCV

Plataforma de simulación curricular para Ingeniería Civil Eléctrica PUCV, basada en Montecarlo y alineada con la lógica del modelo original en MATLAB.

## Stack

- Frontend: React 19, TypeScript 5.9, Vite 8, Tailwind CSS v4
- Backend: Go 1.26.1, Gin 1.12, GORM 1.31
- BD: PostgreSQL (pgx v5)
- Auth: JWT + bcrypt
- Librerías clave: PapaParse, JSZip, lucide-react

## Ejecución local

### Requisitos
- Node.js 22.12+
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
