# SimulaPUCV

**Simulador curricular para Ingeniería Civil Eléctrica PUCV.** Modela trayectorias académicas con Montecarlo (alineado al modelo MATLAB original) para estimar titulación, deserción, tiempo de egreso y el efecto de cambios en la malla.

<p align="center">
  <a href="https://github.com/jsk11L/Simulador-PUCV/releases/latest">
    <img src="https://img.shields.io/github/v/release/jsk11L/Simulador-PUCV?label=descargar%20.exe&style=for-the-badge&logo=windows&color=2563eb" alt="Descargar SimulaPUCV.exe">
  </a>
  &nbsp;
  <a href="https://github.com/jsk11L/Simulador-PUCV/releases/latest">
    <img src="https://img.shields.io/github/downloads/jsk11L/Simulador-PUCV/total?style=for-the-badge&color=059669" alt="Descargas">
  </a>
</p>

---

## ⬇️ Descargar (Windows)

> **[Descargar la última versión → SimulaPUCV.exe](https://github.com/jsk11L/Simulador-PUCV/releases/latest)**

1. Descargue **`SimulaPUCV.exe`** desde la página de releases (botón de arriba).
2. **Doble clic.** No requiere instalación ni dependencias.
3. Se abre solo en su navegador: `http://localhost:8080`.
4. Sus datos quedan locales en `%USERPROFILE%\.simulapucv\` (base de datos SQLite).

> La primera vez, Windows SmartScreen puede advertir que es un binario sin firmar:
> **Más información → Ejecutar de todas formas**.

### ¿Qué puede hacer?

- **Nueva Simulación** — corre una cohorte completa sobre una malla y entrega KPIs (titulación, egreso oportuno, retención), ramos críticos y heatmaps.
- **Simular Alumno** — proyecta la trayectoria futura de un alumno (sintético o cargado) con probabilidad por ramo.
- **Generar Cohorte** — N alumnos con 1–4 semestres reales y el resto proyectado; resultados agregados y por alumno.
- **Editor de Malla** — kanban con orden por sigla y flechas de prerrequisitos/repeticiones.
- **Calibración** — ajusta los pesos del motor de predicción y mide su calidad.

---

## Desarrollo

Stack: React 19 · TypeScript 5.9 · Vite · Tailwind v4 (frontend) — Go 1.26 · Gin · GORM (backend) — SQLite/PostgreSQL.

### Requisitos
- Node.js 22.12+
- Go 1.26+
- (Opcional) PostgreSQL 14+ para modo servidor; el modo portable usa SQLite.

### Backend
```bash
cd backend
go mod tidy
go run .
```
Configurar `backend/.env` (DSN y `JWT_SECRET`) para modo servidor.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
El frontend usa `VITE_API_BASE_URL` (por defecto `http://localhost:8080`).

### Compilar el .exe portable

En Windows, basta con:
```bat
build-standalone.bat
```
Esto compila el frontend, lo embebe en el binario Go (`//go:embed`) y produce `SimulaPUCV.exe` en la raíz.

### Publicar una release

El binario se publica automáticamente al empujar un tag de versión:
```bash
git tag v1.0.0
git push origin v1.0.0
```
El workflow [`.github/workflows/release.yml`](.github/workflows/release.yml) compila el `.exe` y lo adjunta a una GitHub Release.

---

## Flujo recomendado

1. Iniciar sesión.
2. Crear o cargar una malla (plantilla, CSV, guardada o en blanco).
3. Definir variables de simulación y modelo de calificaciones.
4. Revisar el resumen y ejecutar.
5. Analizar resultados y exportar ZIP.
