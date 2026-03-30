package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// ==========================================
// 1. DEFINICIÓN DE MODELOS (V2 - SaaS)
// ==========================================

type Usuario struct {
	ID           string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Email        string `gorm:"uniqueIndex;not null"`
	PasswordHash string `gorm:"not null"`
	IsApproved   bool   `gorm:"default:false"` // <-- NUEVO: Requiere aprobación
	CreatedAt    time.Time
}

type Escenario struct {
	ID          string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UsuarioID   string `gorm:"type:uuid;not null"`
	Nombre      string `gorm:"not null"`
	Descripcion string
	TAmin       float64
	NCSmax      int
	Opor        int
	Iteraciones int
	CreatedAt   time.Time
}

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

type AlumnoBase struct {
	ID                string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UsuarioID         string `gorm:"type:uuid;not null"`
	EscenarioID       string `gorm:"type:uuid;not null"`
	Identificador     string
	PerfilEstocastico string
}

var DB *gorm.DB
var jwtSecret = []byte("simula_pucv_super_secreta_2026")

// ==========================================
// 2. CONTROLADORES DE AUTENTICACIÓN
// ==========================================

type RegisterInput struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)

	// Por defecto IsApproved es false.
	usuario := Usuario{Email: input.Email, PasswordHash: string(hashedPassword)}

	if err := DB.Create(&usuario).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El email ya está registrado"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Registro exitoso. Esperando aprobación del administrador."})
}

func Login(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	var usuario Usuario
	if err := DB.Where("email = ?", input.Email).First(&usuario).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales inválidas"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(usuario.PasswordHash), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales inválidas"})
		return
	}

	// VERIFICACIÓN DE APROBACIÓN DE ADMINISTRADOR
	if !usuario.IsApproved {
		c.JSON(http.StatusForbidden, gin.H{"error": "Tu cuenta aún no ha sido aprobada por la administración."})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"usuario_id": usuario.ID,
		"exp":        time.Now().Add(time.Hour * 72).Unix(),
	})

	tokenString, _ := token.SignedString(jwtSecret)
	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}

// ==========================================
// 3. RECUPERACIÓN DE CONTRASEÑA
// ==========================================

type ForgotInput struct {
	Email string `json:"email" binding:"required"`
}

type ResetInput struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

func ForgotPassword(c *gin.Context) {
	var input ForgotInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Falta el correo electrónico"})
		return
	}

	var usuario Usuario
	if err := DB.Where("email = ?", input.Email).First(&usuario).Error; err != nil {
		// Por seguridad, no decimos si el correo existe o no
		c.JSON(http.StatusOK, gin.H{"message": "Si el correo existe, se enviará un enlace de recuperación."})
		return
	}

	// Generar Token especial de recuperación (Válido solo por 15 min)
	resetToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"usuario_id": usuario.ID,
		"purpose":    "reset_password",
		"exp":        time.Now().Add(time.Minute * 15).Unix(),
	})
	tokenString, _ := resetToken.SignedString(jwtSecret)

	// SIMULADOR DE ENVÍO DE CORREO (Se imprime en la consola de Go)
	fmt.Println("\n========================================================")
	fmt.Println("📧 SIMULACIÓN DE CORREO ELECTRÓNICO ENVIADO")
	fmt.Println("Para:", usuario.Email)
	fmt.Println("Asunto: Recuperación de Contraseña SimulaPUCV")
	fmt.Printf("Enlace: http://localhost:5173/?reset_token=%s\n", tokenString)
	fmt.Println("========================================================\n")

	c.JSON(http.StatusOK, gin.H{"message": "Si el correo existe, se enviará un enlace de recuperación."})
}

func ResetPassword(c *gin.Context) {
	var input ResetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	// Validar token
	token, err := jwt.Parse(input.Token, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "El enlace es inválido o ha expirado"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["purpose"] != "reset_password" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token no autorizado para esta acción"})
		return
	}

	// Cambiar contraseña
	userID := claims["usuario_id"].(string)
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)

	if err := DB.Model(&Usuario{}).Where("id = ?", userID).Update("password_hash", string(hashedPassword)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo actualizar la contraseña"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Contraseña actualizada exitosamente"})
}

func main() {
	dsn := "host=localhost user=postgres password=postgres dbname=simulapucv port=5432 sslmode=disable TimeZone=America/Santiago"

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Error al conectar con la BD: ", err)
	}

	DB.Migrator().DropTable(&Usuario{}, &Escenario{}, &Asignatura{}, &Prerrequisito{}, &AlumnoBase{})
	DB.AutoMigrate(&Usuario{}, &Escenario{}, &Asignatura{}, &Prerrequisito{}, &AlumnoBase{})

	r := gin.Default()
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api")
	{
		api.POST("/register", Register)
		api.POST("/login", Login)
		api.POST("/forgot-password", ForgotPassword) // Nueva ruta
		api.POST("/reset-password", ResetPassword)   // Nueva ruta
	}

	fmt.Println("🚀 Servidor Go corriendo en http://localhost:8080")
	r.Run(":8080")
}
