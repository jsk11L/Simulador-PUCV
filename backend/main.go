package main

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// ==========================================
// 1. MODELOS DE BASE DE DATOS Y PAYLOADS
// ==========================================

// Payloads que envía React
type AsignaturaPayload struct {
	ID        string   `json:"id"`
	Cred      int      `json:"cred"`
	Rep       float64  `json:"rep"`
	Reqs      []string `json:"reqs"`
	Semestre  int      `json:"semestre"`
	Dictacion string   `json:"dictacion"` // "anual" o "semestral"
}

type VariablesPayload struct {
	NE       int     `json:"ne"`
	NCSmax   int     `json:"ncsmax"`
	TAmin    float64 `json:"tamin"`
	NapTAmin int     `json:"naptamin"`
	Opor     int     `json:"opor"`
}

type ModeloPayload struct {
	VMap1234  float64 `json:"vmap1234"`
	Delta1234 float64 `json:"delta1234"`
	VMap5678  float64 `json:"vmap5678"`
	Delta5678 float64 `json:"delta5678"`
	VMapM     float64 `json:"vmapm"`
	DeltaM    float64 `json:"deltam"`
}

type SimularRequest struct {
	Asignaturas []AsignaturaPayload `json:"asignaturas"`
	Variables   VariablesPayload    `json:"variables"`
	Modelo      ModeloPayload       `json:"modelo"`
}

// Estructuras internas para la simulación
type EstadoAlumno int

const (
	Activo EstadoAlumno = iota
	EliminadoTAmin
	EliminadoOpor
	Titulado
)

type HistorialAsignatura struct {
	Sigla       string
	Aprobado    bool
	Oportunidad int
}

// Modelos GORM (BD)
type Usuario struct {
	ID           string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Email        string `gorm:"uniqueIndex;not null"`
	PasswordHash string `gorm:"not null"`
	IsApproved   bool   `gorm:"default:false"`
	CreatedAt    time.Time
}

var DB *gorm.DB
var jwtSecret []byte

// ==========================================
// 2. MOTOR DE MONTECARLO (GOLANG CONCURRENTE)
// ==========================================

func ejecutarMontecarlo(req SimularRequest) map[string]interface{} {
	// Preparar mapas de la malla para acceso ultra rápido O(1)
	mallaMap := make(map[string]AsignaturaPayload)
	for _, asig := range req.Asignaturas {
		mallaMap[asig.ID] = asig
	}

	var wg sync.WaitGroup
	resultadosChan := make(chan int, req.Variables.NE) // Canal para recolectar semestres que tomó egresar
	eliminadosTAChan := make(chan int, req.Variables.NE)
	eliminadosOporChan := make(chan int, req.Variables.NE)

	// Simulación paralela de alumnos
	for i := 0; i < req.Variables.NE; i++ {
		wg.Add(1)
		go func(alumnoID int) {
			defer wg.Done()

			estado := Activo
			semestreActual := 1
			creditosAprobadosTotales := 0
			historial := make(map[string]*HistorialAsignatura)

			for estado == Activo && semestreActual <= 30 { // Límite de seguridad: 30 semestres
				creditosInscritos := 0

				// 1. Buscar qué asignaturas puede tomar este semestre
				var asignaturasTomadas []string

				for _, asig := range req.Asignaturas {
					// Ya la aprobó?
					if h, ok := historial[asig.ID]; ok && h.Aprobado {
						continue
					}

					// Cumple dictación? (MatLab ProgramacionB)
					if asig.Dictacion == "semestral" {
						isImpar := asig.Semestre%2 != 0
						currentIsImpar := semestreActual%2 != 0
						if isImpar != currentIsImpar {
							continue // No se dicta este semestre
						}
					}

					// Cumple prerrequisitos?
					cumpleReqs := true
					for _, reqSigla := range asig.Reqs {
						if reqSigla == "" {
							continue
						}
						if reqHist, ok := historial[reqSigla]; !ok || !reqHist.Aprobado {
							cumpleReqs = false
							break
						}
					}

					if !cumpleReqs {
						continue
					}

					// Cumple tope de créditos NCSmax?
					if creditosInscritos+asig.Cred <= req.Variables.NCSmax {
						asignaturasTomadas = append(asignaturasTomadas, asig.ID)
						creditosInscritos += asig.Cred
					}
				}

				// Si no tomó nada y ya aprobó todo, se titula
				if len(asignaturasTomadas) == 0 {
					todasAprobadas := true
					for _, a := range req.Asignaturas {
						if h, ok := historial[a.ID]; !ok || !h.Aprobado {
							todasAprobadas = false
							break
						}
					}
					if todasAprobadas {
						estado = Titulado
						resultadosChan <- semestreActual - 1
						break
					}
				}

				// 2. Simular aprobación estocástica
				for _, sigla := range asignaturasTomadas {
					asig := mallaMap[sigla]

					// Determinar VMap y Delta según el semestre oficial del ramo
					vmap, delta := req.Modelo.VMapM, req.Modelo.DeltaM
					if asig.Semestre <= 4 {
						vmap, delta = req.Modelo.VMap1234, req.Modelo.Delta1234
					} else if asig.Semestre <= 8 {
						vmap, delta = req.Modelo.VMap5678, req.Modelo.Delta5678
					}

					// Modelo Normal: Genera un valor alrededor del Valor Medio
					// Si es superior a la Tasa Histórica de Reprobación, aprueba.
					// NOTA: Esta fórmula se puede ajustar a la exacta de MatLab.
					// math.Abs replica fielmente el MATLAB: abs(VMap + Delta.*randn(l,1))
					probExitoAlumno := math.Abs(vmap + delta*rand.NormFloat64())
					aprobado := probExitoAlumno > asig.Rep

					if _, ok := historial[sigla]; !ok {
						historial[sigla] = &HistorialAsignatura{Sigla: sigla, Oportunidad: 0}
					}

					historial[sigla].Oportunidad++

					if aprobado {
						historial[sigla].Aprobado = true
						creditosAprobadosTotales += asig.Cred
					} else {
						// Chequear si lo echan por Opor
						if historial[sigla].Oportunidad >= req.Variables.Opor {
							estado = EliminadoOpor
						}
					}
				}

				if estado == EliminadoOpor {
					eliminadosOporChan <- 1
					break
				}

				// 3. Chequear Tasa de Avance (TAmin)
				if semestreActual >= req.Variables.NapTAmin {
					// MATLAB check: (CreditosTotales / Semestre) < TAmin
					if float64(creditosAprobadosTotales)/float64(semestreActual) < req.Variables.TAmin {
						estado = EliminadoTAmin
						eliminadosTAChan <- 1
						break
					}
				}

				semestreActual++
			}

		}(i)
	}

	wg.Wait()
	close(resultadosChan)
	close(eliminadosTAChan)
	close(eliminadosOporChan)

	// Agregar resultados
	titulados := 0
	sumaSemestres := 0
	for sem := range resultadosChan {
		titulados++
		sumaSemestres += sem
	}

	elimTA := 0
	for _ = range eliminadosTAChan {
		elimTA++
	}

	elimOpor := 0
	for _ = range eliminadosOporChan {
		elimOpor++
	}

	semestresPromedio := 0.0
	if titulados > 0 {
		semestresPromedio = float64(sumaSemestres) / float64(titulados)
	}

	tasaTitulacion := (float64(titulados) / float64(req.Variables.NE)) * 100

	return map[string]interface{}{
		"mensaje": "Simulación completada con éxito",
		"metricas_globales": map[string]interface{}{
			"alumnos_simulados":  req.Variables.NE,
			"titulados":          titulados,
			"eliminados_tamin":   elimTA,
			"eliminados_opor":    elimOpor,
			"tasa_titulacion":    fmt.Sprintf("%.2f%%", tasaTitulacion),
			"semestres_promedio": fmt.Sprintf("%.1f", semestresPromedio),
		},
	}
}

// ==========================================
// 3. CONTROLADORES
// ==========================================

func SimularHandler(c *gin.Context) {
	var req SimularRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido: " + err.Error()})
		return
	}

	// Ejecutar Montecarlo
	resultados := ejecutarMontecarlo(req)

	c.JSON(http.StatusOK, resultados)
}

// (El resto de controladores de Login/Register se omiten por brevedad en la visualización,
// pero en tu entorno deben estar presentes como los configuramos anteriormente)
func Register(c *gin.Context) {
	type RegisterInput struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	usuario := Usuario{Email: input.Email, PasswordHash: string(hashedPassword)}
	if err := DB.Create(&usuario).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El email ya está registrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Registro exitoso. Esperando aprobación."})
}

func Login(c *gin.Context) {
	type RegisterInput struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
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
	if !usuario.IsApproved {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cuenta no aprobada."})
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
// 4. MAIN
// ==========================================
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
	jwtSecret = []byte(secret)

	// Configuración de BD desde variables de entorno
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		os.Getenv("DB_HOST"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"), os.Getenv("DB_PORT"), os.Getenv("DB_SSLMODE"),
		os.Getenv("DB_TIMEZONE"),
	)
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Error al conectar con BD: ", err)
	}

	DB.AutoMigrate(&Usuario{})

	r := gin.Default()

	// CORS Básico
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

		// OJO: En producción esta ruta debe usar el AuthMiddleware
		api.POST("/simular", SimularHandler)
	}

	fmt.Println("🚀 Servidor Go (Montecarlo Engine) corriendo en http://localhost:8080")
	r.Run(":8080")
}
