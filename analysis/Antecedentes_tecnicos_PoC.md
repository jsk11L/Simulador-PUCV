# Antecedentes tecnicos para PoC (version despliegue servidor)

Estimado Javier:

Se actualiza este documento para incluir el inventario tecnico completo verificable desde el repositorio, con foco en despliegue en servidor institucional y prevencion de incidentes de compatibilidad.

## 1. Estado de residencia e infraestructura

- No hay evidencia en el repositorio de proveedor de hosting productivo (AWS, Azure, GCP, etc.).
- No hay IaC ni manifiestos de despliegue (`Dockerfile`, `docker-compose`, `k8s`).
- Arquitectura logica verificada:
	- Frontend web (React + Vite)
	- Backend API (Go + Gin)
	- Base de datos PostgreSQL

## 2. Matriz de versiones y compatibilidad (critico)

- Node.js requerido: `>=22.12.0` (definido en `frontend/package.json`, campo `engines`).
- Referencia para gestores de version Node: `.nvmrc` con `22.12.0`.
- Go requerido: `1.26.1` (definido en `backend/go.mod`).
- PostgreSQL objetivo: `14+`.

### Nota de compatibilidad importante

- Node.js `21.x` no es recomendable para esta base actual de frontend (Vite 8 + ecosistema Rolldown del lockfile).
- Para evitar fallos de instalacion/build, mantener Node `22.12+` en servidor.

## 3. Frontend: inventario completo de librerias

Origen: `frontend/package.json`.

### Dependencias runtime

- `@tailwindcss/vite` `^4.2.2`
- `html-to-image` `^1.11.13`
- `jszip` `^3.10.1`
- `lucide-react` `^1.7.0`
- `papaparse` `^5.5.3`
- `react` `^19.2.4`
- `react-dom` `^19.2.4`

### Dependencias desarrollo

- `@eslint/js` `^9.39.4`
- `@tailwindcss/postcss` `^4.2.2`
- `@types/node` `^24.12.0`
- `@types/papaparse` `^5.5.2`
- `@types/react` `^19.2.14`
- `@types/react-dom` `^19.2.3`
- `@vitejs/plugin-react` `^6.0.1`
- `autoprefixer` `^10.4.27`
- `eslint` `^9.39.4`
- `eslint-plugin-react-hooks` `^7.0.1`
- `eslint-plugin-react-refresh` `^0.5.2`
- `globals` `^17.4.0`
- `postcss` `^8.5.8`
- `tailwindcss` `^4.2.2`
- `typescript` `~5.9.3`
- `typescript-eslint` `^8.57.0`
- `vite` `^8.0.1`

### Configuracion funcional relevante

- URL base API: `VITE_API_BASE_URL`.
- Fallback actual en codigo: `http://localhost:8080` (si no existe `VITE_API_BASE_URL`).
- Plugin de build Vite: React + Tailwind Vite plugin.

## 4. Backend: inventario de librerias Go

Origen: `backend/go.mod`.

### Modulos usados en codigo principal

- `github.com/gin-gonic/gin` `v1.12.0`
- `github.com/joho/godotenv` `v1.5.1`
- `gorm.io/driver/postgres` `v1.6.0`
- `gorm.io/gorm` `v1.31.1`
- `github.com/golang-jwt/jwt/v5` `v5.3.1`
- `golang.org/x/crypto` `v0.49.0` (bcrypt)

### Modulos declarados en go.mod (indirect)

- `github.com/bytedance/gopkg` `v0.1.4`
- `github.com/bytedance/sonic` `v1.15.0`
- `github.com/bytedance/sonic/loader` `v0.5.1`
- `github.com/cloudwego/base64x` `v0.1.6`
- `github.com/gabriel-vasile/mimetype` `v1.4.13`
- `github.com/gin-contrib/sse` `v1.1.1`
- `github.com/go-playground/locales` `v0.14.1`
- `github.com/go-playground/universal-translator` `v0.18.1`
- `github.com/go-playground/validator/v10` `v10.30.1`
- `github.com/goccy/go-json` `v0.10.6`
- `github.com/goccy/go-yaml` `v1.19.2`
- `github.com/jackc/pgpassfile` `v1.0.0`
- `github.com/jackc/pgservicefile` `v0.0.0-20240606120523-5a60cdf6a761`
- `github.com/jackc/pgx/v5` `v5.9.1`
- `github.com/jackc/puddle/v2` `v2.2.2`
- `github.com/jinzhu/inflection` `v1.0.0`
- `github.com/jinzhu/now` `v1.1.5`
- `github.com/json-iterator/go` `v1.1.12`
- `github.com/klauspost/cpuid/v2` `v2.3.0`
- `github.com/leodido/go-urn` `v1.4.0`
- `github.com/mattn/go-isatty` `v0.0.20`
- `github.com/modern-go/concurrent` `v0.0.0-20180306012644-bacd9c7ef1dd`
- `github.com/modern-go/reflect2` `v1.0.2`
- `github.com/pelletier/go-toml/v2` `v2.3.0`
- `github.com/quic-go/qpack` `v0.6.0`
- `github.com/quic-go/quic-go` `v0.59.0`
- `github.com/twitchyliquid64/golang-asm` `v0.15.1`
- `github.com/ugorji/go/codec` `v1.3.1`
- `go.mongodb.org/mongo-driver/v2` `v2.5.0`
- `golang.org/x/arch` `v0.25.0`
- `golang.org/x/net` `v0.52.0`
- `golang.org/x/sync` `v0.20.0`
- `golang.org/x/sys` `v0.42.0`
- `golang.org/x/text` `v0.35.0`
- `google.golang.org/protobuf` `v1.36.11`

## 5. Variables de entorno y configuracion obligatoria

### Backend (obligatorias)

- `JWT_SECRET` (obligatoria; sin esto el backend termina en startup).
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_PORT`
- `DB_SSLMODE`
- `DB_TIMEZONE`

### Frontend

- `VITE_API_BASE_URL` (recomendada para servidor; evita fallback local).

## 6. Comportamiento tecnico relevante en servidor

- Puerto backend: `:8080`.
- Prefijo API: `/api`.
- CORS actual: `Access-Control-Allow-Origin: *` (abierto).
- Migraciones: `AutoMigrate` para `Usuario`, `MallaGuardadaDB`, `ResultadoSimulacionDB`.
- BD: uso intensivo de columnas `jsonb`.
- UUID en modelos: `default: gen_random_uuid()`.

## 7. Requisitos PostgreSQL no obvios (critico)

- Debe existir extension `pgcrypto` para `gen_random_uuid()`.
- Si no se habilita, creacion de filas con UUID por defecto puede fallar.
- Script recomendado previo al primer arranque:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

## 8. Seguridad y hardening minimo recomendado para montaje

- No exponer `backend/.env` real en repositorio ni artefactos.
- Rotar `JWT_SECRET` antes de subir a servidor.
- En produccion, no usar `DB_SSLMODE=disable`; usar `require` o superior segun politica institucional.
- Restringir CORS a dominio(s) de frontend institucional, no `*`.
- Ejecutar backend detras de reverse proxy (Nginx/Apache) con TLS.
- Aplicar permisos minimos en usuario de BD (evitar superusuario para app).

## 9. Checklist operativo previo a puesta en marcha

- Confirmar Node `22.12+` en servidor.
- Confirmar Go `1.26.1`.
- Confirmar PostgreSQL `14+` y extension `pgcrypto` activa.
- Definir variables de entorno backend y frontend de forma explicita.
- Verificar conectividad backend-BD.
- Verificar login y endpoints protegidos con token JWT.
- Verificar frontend apuntando a URL backend institucional (no localhost).

## 10. Comandos base de despliegue (sin contenedores)

### Backend

```bash
cd backend
go mod tidy
go run .
```

### Frontend (build)

```bash
cd frontend
npm install
npm run build
```

## 11. Resumen ejecutivo para PoC

- Stack confirmado:
	- Frontend: React 19.2.4 + TypeScript 5.9 + Vite 8.0.1
	- Backend: Go 1.26.1 + Gin 1.12.0 + GORM 1.31.1
	- BD: PostgreSQL 14+
- Requisito de compatibilidad clave para evitar incidentes de montaje:
	- Node.js `>=22.12.0`
- Riesgos principales a controlar antes de produccion:
	- Secretos en entorno
	- CORS abierto
	- SSL de BD
	- Extension `pgcrypto` faltante
