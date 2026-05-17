package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/jsk11L/Simulador-PUCV/handlers"
	"github.com/jsk11L/Simulador-PUCV/models"

	_ "modernc.org/sqlite" // driver puro-Go, sin CGO
)

// dbType lee DB_TYPE del entorno y devuelve "sqlite" por default. Esto hace
// que el binario standalone "simplemente funcione" haciendo doble click: si
// no hay .env ni variables, usa SQLite local. El despliegue contra servidor
// con Postgres setea DB_TYPE=postgres.
func dbType() string {
	t := strings.ToLower(strings.TrimSpace(os.Getenv("DB_TYPE")))
	if t == "" {
		return "sqlite"
	}
	return t
}

// openDB abre la conexión según DB_TYPE. Devuelve también si está corriendo
// en modo standalone (sqlite) — usado por API.Standalone para auto-aprobar
// al primer usuario.
func openDB() (*gorm.DB, bool, error) {
	switch dbType() {
	case "postgres":
		dsn := fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
			os.Getenv("DB_HOST"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_NAME"), os.Getenv("DB_PORT"), os.Getenv("DB_SSLMODE"),
			os.Getenv("DB_TIMEZONE"),
		)
		db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
		return db, false, err
	case "sqlite":
		dbPath := resolverDBPath()
		// driverName: usamos modernc.org/sqlite (puro Go, registrado como
		// "sqlite") para evitar CGO y permitir cross-compilation a Windows.
		db, err := gorm.Open(sqlite.Dialector{
			DriverName: "sqlite",
			DSN:        dbPath,
		}, &gorm.Config{
			// En standalone silenciamos los logs SQL para no spamear el
			// archivo de log del usuario final (GORM emite WARN cuando un
			// First() no encuentra registros, etc).
			Logger: logger.Default.LogMode(logger.Silent),
		})
		return db, true, err
	default:
		return nil, false, fmt.Errorf("DB_TYPE inválido: %q (esperado 'postgres' o 'sqlite')", dbType())
	}
}

// appDir devuelve el directorio donde el binario standalone guarda su
// estado (BD, secret, log). Crea el directorio si no existe.
func appDir() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}
	dir := filepath.Join(homeDir, ".simulapucv")
	_ = os.MkdirAll(dir, 0o755)
	return dir
}

// resolverDBPath devuelve la ruta del archivo .db para SQLite. Vive en
// ~/.simulapucv/datos.db para que cada usuario del sistema tenga su propia
// base.
func resolverDBPath() string {
	if p := os.Getenv("SQLITE_PATH"); p != "" {
		return p
	}
	return filepath.Join(appDir(), "datos.db")
}

// resolveJWTSecret lee JWT_SECRET del entorno. Si no existe (típico en
// modo standalone), genera uno aleatorio y lo persiste junto al .db para
// que las sesiones sobrevivan al reinicio del binario.
func resolveJWTSecret(standalone bool) (string, error) {
	if s := os.Getenv("JWT_SECRET"); s != "" {
		return s, nil
	}
	if !standalone {
		return "", fmt.Errorf("JWT_SECRET no está definido en las variables de entorno")
	}
	secretPath := filepath.Join(appDir(), "secret")
	if data, err := os.ReadFile(secretPath); err == nil && len(data) >= 32 {
		return strings.TrimSpace(string(data)), nil
	}
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("no se pudo generar JWT_SECRET: %w", err)
	}
	secret := hex.EncodeToString(buf)
	if err := os.WriteFile(secretPath, []byte(secret), 0o600); err != nil {
		return "", fmt.Errorf("no se pudo persistir JWT_SECRET: %w", err)
	}
	return secret, nil
}

// ensureLocalUser garantiza que en modo standalone exista un usuario
// "local" pre-creado, aprobado y admin. Su ID se usa para todas las
// requests (el middleware standalone bypassea token y opera con ese ID).
// Devuelve el ID del usuario.
func ensureLocalUser(db *gorm.DB) (string, error) {
	const localEmail = "local@simulapucv"
	var u models.Usuario
	err := db.Where("email = ?", localEmail).First(&u).Error
	if err == nil {
		return u.ID, nil
	}
	// No existe: crearlo.
	u = models.Usuario{
		Email:        localEmail,
		PasswordHash: "standalone-no-password",
		IsApproved:   true,
		IsAdmin:      true,
	}
	if err := db.Create(&u).Error; err != nil {
		return "", err
	}
	return u.ID, nil
}

// openBrowser abre la URL en el navegador por default del SO. Best-effort:
// si falla, el usuario abre la URL manualmente. No bloquea el arranque.
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
	default: // linux, bsd, etc
		cmd = "xdg-open"
		args = []string{url}
	}
	if err := exec.Command(cmd, args...).Start(); err != nil {
		log.Printf("no se pudo abrir el navegador: %v", err)
	}
}

// setupStandaloneLogging redirige stdout/stderr/log al archivo
// ~/.simulapucv/log.txt. El binario compilado con `-H=windowsgui` no tiene
// consola, así que los mensajes irían a /dev/null. Esta redirección
// permite inspeccionar problemas post-mortem sin obligar al usuario a
// abrir una terminal.
func setupStandaloneLogging() {
	logPath := filepath.Join(appDir(), "log.txt")
	f, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return
	}
	// Escribimos el log nuestro al archivo, gin queda enmudecido aparte.
	log.SetOutput(f)
	log.SetFlags(log.LstdFlags)
	// Apuntar stdout/stderr al archivo también, por si algo escribe directo.
	os.Stdout = f
	os.Stderr = f
}

func main() {
	// Carga .env si existe. En modo standalone es opcional — el binario
	// funciona sin .env tomando defaults (DB_TYPE=sqlite + secret autogen).
	_ = godotenv.Load()

	db, standalone, err := openDB()
	if err != nil {
		log.Fatal("Error al conectar con BD: ", err)
	}

	secret, err := resolveJWTSecret(standalone)
	if err != nil {
		log.Fatal(err)
	}

	if standalone {
		// Sin consola en Windows (-H=windowsgui) → todos los mensajes a
		// archivo de log para diagnóstico.
		setupStandaloneLogging()
		gin.SetMode(gin.ReleaseMode)
		gin.DisableConsoleColor()
		gin.DefaultWriter = io.Discard
		gin.DefaultErrorWriter = io.Discard
	}

	if err := db.AutoMigrate(&models.Usuario{}, &models.MallaGuardadaDB{}, &models.ResultadoSimulacionDB{}); err != nil {
		log.Fatal("Error en AutoMigrate: ", err)
	}

	api := handlers.NewAPI(db, []byte(secret))
	api.Standalone = standalone

	if standalone {
		uid, err := ensureLocalUser(db)
		if err != nil {
			log.Fatal("No se pudo preparar el usuario local: ", err)
		}
		api.LocalUserID = uid
	}

	r := gin.New()
	if !standalone {
		r.Use(gin.Logger())
	}
	r.Use(gin.Recovery())
	r.Use(corsMiddleware())
	api.Mount(r)
	mountFrontend(r)

	addr := ":8080"
	if p := os.Getenv("PORT"); p != "" {
		addr = ":" + p
	}
	url := "http://localhost" + addr

	if standalone {
		log.Println("SimulaPUCV (portable) escuchando en", url)
		log.Println("Base de datos local:", resolverDBPath())
		go func() {
			time.Sleep(500 * time.Millisecond)
			openBrowser(url)
		}()
	} else {
		fmt.Println("🚀 Servidor Go (Montecarlo Engine) corriendo en " + url)
	}

	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
