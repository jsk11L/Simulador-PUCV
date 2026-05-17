# Empaquetado como ejecutable standalone

Distribuye SimulaPUCV como un único binario (`simula.exe` en Windows,
`simula` en Linux/macOS) que tu profesor puede ejecutar haciendo doble
click sin instalar nada más. Al ejecutarlo, abre automáticamente el
navegador apuntando a la app local con base de datos personal por usuario.

> **Estado**: implementado (Opción A — doble modo). El backend ahora
> soporta `DB_TYPE=sqlite` (default, modo standalone) y `DB_TYPE=postgres`
> (modo servidor). Para producir el ejecutable, ejecutar
> `build-standalone.bat` (Windows) o `build-standalone.sh` (Linux/macOS).

## Resumen de cambios necesarios

| Cambio | Esfuerzo | Riesgo |
|--------|----------|--------|
| Migrar PostgreSQL → SQLite | Medio (2-3 horas) | Bajo si se mantiene GORM |
| Embeber el frontend en el binario | Bajo (~30 min) | Bajo |
| Apertura automática del navegador | Trivial | Cero |
| Cross-compilation a Windows | Trivial | Cero |
| Gestión del archivo `.db` por usuario | Bajo (~20 min) | Bajo |
| Build script | Bajo | Cero |

Total estimado: **medio día** de trabajo concentrado.

---

## Paso 1: Migrar a SQLite

El motivo: SQLite vive como un archivo `.db` local. No requiere servidor
ni instalación. Perfecto para distribución.

### 1.1 Cambiar el driver de GORM

En `backend/go.mod` reemplazar `gorm.io/driver/postgres` por:

```bash
cd backend
go get gorm.io/driver/sqlite
go mod tidy
```

> Usar `modernc.org/sqlite` (puro Go, sin CGO) NO `mattn/go-sqlite3`.
> CGO complica la cross-compilation a Windows desde Linux/macOS.

GORM con driver `modernc.org/sqlite`:

```go
import (
    "gorm.io/driver/sqlite"
    _ "modernc.org/sqlite"
    "gorm.io/gorm"
)

db, err := gorm.Open(sqlite.Dialector{
    DriverName: "sqlite",
    DSN:        dbPath,
}, &gorm.Config{})
```

### 1.2 Reemplazar funciones específicas de Postgres

El modelo actual usa `gen_random_uuid()` (función de Postgres con extensión
`pgcrypto`). SQLite no la tiene. Cambiar en `backend/models/models.go`:

```go
type Usuario struct {
    ID           string `gorm:"type:text;primaryKey"`  // antes: uuid;default:gen_random_uuid()
    // ...
}

// Hook GORM para generar UUID al crear:
func (u *Usuario) BeforeCreate(tx *gorm.DB) error {
    if u.ID == "" {
        u.ID = uuid.NewString()
    }
    return nil
}
```

Hacer lo mismo para `MallaGuardadaDB` y `ResultadoSimulacionDB`.

Importar `github.com/google/uuid` (ya está disponible vía dependencias
indirectas):

```bash
go get github.com/google/uuid
```

### 1.3 Tipo de columna JSONB

GORM con `type:jsonb` falla en SQLite. Cambiar a `type:text`:

```go
type MallaGuardadaDB struct {
    Asignaturas string `gorm:"type:text;not null" json:"-"`  // antes: jsonb
    // ...
}
```

El código que serializa/deserializa con `json.Marshal/Unmarshal` sigue
funcionando idéntico — la diferencia es solo el tipo de columna.

### 1.4 Path del archivo `.db`

Para que cada usuario tenga su propia base de datos, usar el directorio
de datos de la app:

```go
func resolverDBPath() string {
    homeDir, err := os.UserHomeDir()
    if err != nil {
        homeDir = "."
    }
    appDir := filepath.Join(homeDir, ".simulapucv")
    os.MkdirAll(appDir, 0o755)
    return filepath.Join(appDir, "datos.db")
}
```

Eliminar todas las variables `DB_HOST`, `DB_USER`, `DB_PASSWORD`, etc. del
`.env`. Solo queda `JWT_SECRET`.

---

## Paso 2: Embeber el frontend en el binario

Usar `//go:embed` para incluir los archivos compilados del frontend dentro
del ejecutable Go.

### 2.1 Crear `backend/embed.go`

```go
package main

import (
    "embed"
    "io/fs"
    "net/http"

    "github.com/gin-gonic/gin"
)

//go:embed all:frontend_dist
var frontendFS embed.FS

// mountFrontend monta el frontend embebido en la raíz del router.
// Sirve los assets estáticos y devuelve index.html para rutas no API
// (SPA fallback).
func mountFrontend(r *gin.Engine) {
    sub, err := fs.Sub(frontendFS, "frontend_dist")
    if err != nil {
        panic(err)
    }
    fsys := http.FS(sub)

    r.NoRoute(func(c *gin.Context) {
        // No interceptar rutas /api/*
        if len(c.Request.URL.Path) >= 4 && c.Request.URL.Path[:4] == "/api" {
            c.JSON(404, gin.H{"error": "not found"})
            return
        }
        // Servir archivo estático si existe; fallback a index.html.
        path := c.Request.URL.Path
        if path == "/" {
            path = "/index.html"
        }
        f, err := fsys.Open(path[1:])
        if err != nil {
            // Fallback SPA: devolver index.html para que React Router maneje
            f, _ = fsys.Open("index.html")
        }
        defer f.Close()
        stat, _ := f.Stat()
        http.ServeContent(c.Writer, c.Request, stat.Name(), stat.ModTime(), f.(io.ReadSeeker))
    })
}
```

### 2.2 Build script que copia el frontend al backend

`build-standalone.sh` (Linux/macOS) y `build-standalone.bat` (Windows):

```bash
#!/usr/bin/env bash
set -e

echo "[1/4] Construyendo frontend..."
cd frontend
npm install
# Importante: VITE_API_BASE_URL vacío → la app usa rutas relativas (mismo host)
VITE_API_BASE_URL="" npm run build
cd ..

echo "[2/4] Copiando dist/ al backend..."
rm -rf backend/frontend_dist
cp -r frontend/dist backend/frontend_dist

echo "[3/4] Compilando backend..."
cd backend
go mod tidy
go build -ldflags="-s -w" -o ../simula.exe .
cd ..

echo "[4/4] Listo. Ejecutable: simula.exe"
```

Para Windows nativo:

```bat
@echo off
echo [1/4] Construyendo frontend...
cd frontend
call npm install
set VITE_API_BASE_URL=
call npm run build
cd ..

echo [2/4] Copiando dist/ al backend...
if exist backend\frontend_dist rmdir /s /q backend\frontend_dist
xcopy /s /i frontend\dist backend\frontend_dist

echo [3/4] Compilando backend...
cd backend
call go mod tidy
call go build -ldflags="-s -w" -o ..\simula.exe .
cd ..

echo [4/4] Listo. Ejecutable: simula.exe
```

### 2.3 Cross-compilation (opcional)

Desde Linux/macOS, compilar para Windows:

```bash
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o simula.exe .
```

---

## Paso 3: Apertura automática del navegador

Agregar a `backend/main.go` justo antes de `r.Run`:

```go
import (
    "log"
    "os/exec"
    "runtime"
    "time"
)

func openBrowser(url string) {
    var cmd string
    var args []string
    switch runtime.GOOS {
    case "windows":
        cmd = "rundll32"
        args = []string{"url.dll,FileProtocolHandler", url}
    case "darwin":
        cmd = "open"
        args = []string{url}
    default: // linux, freebsd, etc.
        cmd = "xdg-open"
        args = []string{url}
    }
    if err := exec.Command(cmd, args...).Start(); err != nil {
        log.Printf("no se pudo abrir el navegador: %v", err)
    }
}

// En main, después de mountar las rutas:
go func() {
    time.Sleep(500 * time.Millisecond) // esperar a que el server arranque
    openBrowser("http://localhost:8080")
}()
```

---

## Paso 4: Setup inicial — primer arranque del ejecutable

Al ser standalone, no hay aprobación manual por admin. Dos opciones:

**Opción A (recomendada para uso académico individual):** auto-aprobar
al primer usuario y marcarlo como admin:

```go
// En el handler Register, después de crear el usuario:
var count int64
db.Model(&models.Usuario{}).Count(&count)
if count == 1 {
    // Primer usuario del sistema: admin auto-aprobado
    db.Model(&usuario).Updates(map[string]interface{}{
        "is_approved": true,
        "is_admin":    true,
    })
}
```

**Opción B**: incluir un usuario semilla en el código.

---

## Paso 5: Probar el ejecutable

```bash
./simula.exe
# Debería:
# 1. Imprimir "Servidor corriendo en http://localhost:8080"
# 2. Crear ~/.simulapucv/datos.db
# 3. Abrir el navegador en http://localhost:8080
# 4. Permitir registrar usuario (auto-admin si es el primero)
```

---

## Paso 6: Distribución

El ejecutable resultante (`simula.exe`) tendrá ~15-20 MB. Distribución:

- **Por email**: zip con `simula.exe` + un `LEEME.txt` con instrucciones.
- **Por USB**: copiar el ejecutable. Funciona sin instalación.

> Windows Defender puede marcar el binario como sospechoso al ser un
> ejecutable Go sin firma digital. Para uso académico no es bloqueante
> (el usuario aprueba la advertencia). Para distribución masiva sería
> mejor firmar el binario, pero eso requiere certificado de code-signing.

---

## Riesgos conocidos

1. **Performance de SQLite**: para cohortes de 15 000 alumnos no debería
   ser problema (las operaciones DB son sólo guardar resultados, no son el
   cuello de botella).
2. **Concurrencia**: SQLite permite un solo escritor a la vez. Para uso
   single-user no es problema.
3. **Auto-migrate cambia de comportamiento**: testear que las tablas
   recién creadas tienen los tipos correctos.
4. **Cross-compilation**: `modernc.org/sqlite` es puro Go, así que no hay
   problema. Si se cambia a `mattn/go-sqlite3` (con CGO), la cross-compilation
   se complica mucho.

---

## Checklist de implementación

- [x] Migrar `gorm.io/driver/postgres` → driver dual (postgres + sqlite via `DB_TYPE`)
- [x] Reemplazar `gen_random_uuid()` con hook `BeforeCreate` + `uuid.NewString()`
- [x] Cambiar columnas `type:jsonb` → `type:text` (compatible con BD legacy)
- [x] Crear helper `resolverDBPath()` en `main.go`
- [x] Generar `JWT_SECRET` aleatorio y persistirlo en primer arranque si no existe
- [x] Crear `backend/embed.go` con `//go:embed all:frontend_dist`
- [x] Crear `build-standalone.sh` y `.bat`
- [x] Agregar `openBrowser` y `go openBrowser` en `main.go`
- [x] Lógica de auto-admin para primer usuario (via `API.Standalone`)
- [x] Tests E2E de paridad motor (sqlite vs golden values) — ver `backend/standalone_e2e_test.go`
- [ ] Empaquetar `simula.exe` + `LEEME.txt` en un zip (manual, opcional)

---

## Pregunta abierta

**¿Mantenemos también el modo "servidor con Postgres"?** Hay dos caminos:

1. **Doble modo**: mismo código sirve para ambos vía `if dbType == "sqlite" { ... }`
   con build tags. Más flexibilidad, más complejidad.
2. **Solo modo ejecutable**: borramos toda referencia a Postgres. Más
   simple pero menos flexible si después se quiere subir a servidor.

Mi recomendación: mantener doble modo con env var `DB_TYPE=sqlite|postgres`.
Default sqlite. El despliegue real (servidor universidad) puede usar el
mismo binario con `DB_TYPE=postgres`.
