package main

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// ==========================================
// 1. DEFINICIÓN DE MODELOS (TABLAS)
// ==========================================

type Escenario struct {
	ID          string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Nombre      string `gorm:"not null"`
	Descripcion string
	TAmin       float64   // Tasa de Avance Mínima
	NCSmax      int       // Créditos Máximos
	Opor        int       // Oportunidades
	Iteraciones int       // Iteraciones Montecarlo
	CreatedAt   time.Time // Fecha de creación automática
}

type Asignatura struct {
	ID                 string `gorm:"primaryKey"` // Ej: "MAT111"
	Nombre             string `gorm:"not null"`
	Creditos           int
	SemestreMalla      int
	DesviacionEstandar float64   // Para simulación de notas
	EscenarioID        string    `gorm:"type:uuid;not null"`
	Escenario          Escenario `gorm:"foreignKey:EscenarioID"`
}

type Prerrequisito struct {
	ID              uint   `gorm:"primaryKey;autoIncrement"`
	AsignaturaID    string `gorm:"not null"`
	PrerrequisitoID string `gorm:"not null"` // La sigla del ramo que debe aprobar antes
	EscenarioID     string `gorm:"type:uuid;not null"`
}

type Evaluacion struct {
	ID           string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	AsignaturaID string  `gorm:"not null"`
	Nombre       string  `gorm:"not null"` // Ej: "Certamen 1"
	Ponderacion  float64 `gorm:"not null"` // Ej: 0.30
	EscenarioID  string  `gorm:"type:uuid;not null"`
}

type AlumnoBase struct {
	ID                string `gorm:"primaryKey"` // Ej: "2026-001"
	Nombre            string
	PerfilEstocastico string // Ej: "Sobresaliente", "Promedio", "Riesgo"
	EscenarioID       string `gorm:"type:uuid;not null"`
}

type ResultadoSimulacion struct {
	ID                string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EscenarioID       string `gorm:"type:uuid;uniqueIndex"` // Un resultado global por escenario
	TasaTitulacion    float64
	SemestresPromedio float64
	TasaRetencion     float64
	DatosGraficosJSON string `gorm:"type:jsonb"` // Guardamos los arrays pesados para React aquí
	CreatedAt         time.Time
}

// ==========================================
// 2. FUNCIÓN PRINCIPAL Y CONEXIÓN A BD
// ==========================================

func main() {
	// IMPORTANTE: Cambia "tu_contraseña" por la contraseña de tu PostgreSQL local.
	// Si usas Docker o una BD por defecto, el usuario suele ser "postgres"
	dsn := "host=localhost user=postgres password=postgres dbname=simulapucv port=5432 sslmode=disable TimeZone=America/Santiago"

	fmt.Println("Conectando a la base de datos PostgreSQL...")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Error al conectar con la base de datos: ", err)
	}

	fmt.Println("Conexión exitosa. Iniciando AutoMigrate...")

	// Aquí es donde ocurre la magia. GORM lee los Structs de arriba y crea las tablas.
	err = db.AutoMigrate(
		&Escenario{},
		&Asignatura{},
		&Prerrequisito{},
		&Evaluacion{},
		&AlumnoBase{},
		&ResultadoSimulacion{},
	)

	if err != nil {
		log.Fatal("Error al migrar las tablas: ", err)
	}

	fmt.Println("¡Tablas creadas/actualizadas con éxito en PostgreSQL!")
	fmt.Println("El motor de SimulaPUCV está listo para recibir peticiones.")
}
