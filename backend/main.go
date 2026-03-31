package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/jsk11L/Simulador-PUCV/handlers"
	"github.com/jsk11L/Simulador-PUCV/middleware"
	"github.com/jsk11L/Simulador-PUCV/models"
)

func main() {
	// Cargar variables de entorno desde .env
	if err := godotenv.Load(); err != nil {
		log.Println("Aviso: No se encontró archivo .env, usando variables del sistema")
	}

	// Configurar JWT Secret
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("JWT_SECRET no está definido en las variables de entorno")
	}
	middleware.JWTSecret = []byte(secret)

	// Configuración de BD desde variables de entorno
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		os.Getenv("DB_HOST"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"), os.Getenv("DB_PORT"), os.Getenv("DB_SSLMODE"),
		os.Getenv("DB_TIMEZONE"),
	)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Error al conectar con BD: ", err)
	}

	// Inyectar DB en handlers
	handlers.DB = db

	// Auto-migrar modelos
	db.AutoMigrate(&models.Usuario{}, &models.MallaGuardadaDB{}, &models.ResultadoSimulacionDB{})

	// Configurar router
	r := gin.Default()

	// CORS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api")
	{
		// Rutas públicas
		api.POST("/register", handlers.Register)
		api.POST("/login", handlers.Login)

		// Rutas protegidas
		protegido := api.Group("")
		protegido.Use(middleware.AuthMiddleware())
		{
			protegido.POST("/simular", handlers.SimularHandler)

			// CRUD Mallas
			protegido.POST("/mallas", handlers.CrearMallaHandler)
			protegido.GET("/mallas", handlers.ListarMallasHandler)
			protegido.GET("/mallas/:id", handlers.ObtenerMallaHandler)
			protegido.PUT("/mallas/:id", handlers.ActualizarMallaHandler)
			protegido.DELETE("/mallas/:id", handlers.EliminarMallaHandler)

			// Resultados
			protegido.GET("/resultados", handlers.ListarResultadosHandler)
			protegido.GET("/resultados/:id", handlers.ObtenerResultadoHandler)

			// Exportación
			protegido.GET("/exportar", handlers.ExportarDatosHandler)

			// Admin (verificación de rol dentro de cada handler)
			protegido.GET("/admin/usuarios", handlers.ListarUsuariosAdmin)
			protegido.PATCH("/admin/usuarios/:id", handlers.AprobarUsuarioAdmin)
		}
	}

	fmt.Println("🚀 Servidor Go (Montecarlo Engine) corriendo en http://localhost:8080")
	r.Run(":8080")
}
