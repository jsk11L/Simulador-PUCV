package models

import "time"

// ==========================================
// PAYLOADS (lo que envía React)
// ==========================================

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

// ==========================================
// ESTRUCTURAS INTERNAS DE SIMULACIÓN
// ==========================================

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

// ==========================================
// RESULTADOS DE SIMULACIÓN (structs tipados)
// ==========================================

type ResultadoAlumno struct {
	Estado            EstadoAlumno
	SemestresUsados   int
	ReprobacionesRamo map[string]int
	IntentosRamo      map[string]int
}

type RamoCritico struct {
	Sigla         string  `json:"sigla"`
	Intentos      int     `json:"intentos"`
	Reprobaciones int     `json:"reprobaciones"`
	TasaFalloPct  float64 `json:"tasa_fallo_pct"`
}

type MetricasGlobales struct {
	AlumnosSimulados    int     `json:"alumnos_simulados"`
	Titulados           int     `json:"titulados"`
	EliminadosTamin     int     `json:"eliminados_tamin"`
	EliminadosOpor      int     `json:"eliminados_opor"`
	TasaTitulacionPct   float64 `json:"tasa_titulacion_pct"`
	SemestresPromedio   float64 `json:"semestres_promedio"`
	EficienciaEgreso    float64 `json:"eficiencia_egreso"`
	EgresoOportunoPct   float64 `json:"egreso_oportuno_pct"`
	Retencion1erAnioPct float64 `json:"retencion_1er_anio_pct"`
	Retencion3erAnioPct float64 `json:"retencion_3er_anio_pct"`
}

type SimulacionResponse struct {
	Mensaje               string       `json:"mensaje"`
	MetricasGlobales      MetricasGlobales `json:"metricas_globales"`
	DistribucionSemestres map[int]int  `json:"distribucion_semestres"`
	RamosCriticos         []RamoCritico `json:"ramos_criticos"`
}

// ==========================================
// MODELOS GORM (Base de Datos)
// ==========================================

type Usuario struct {
	ID           string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Email        string    `gorm:"uniqueIndex;not null"`
	PasswordHash string    `gorm:"not null"`
	IsApproved   bool      `gorm:"default:false"`
	IsAdmin      bool      `gorm:"default:false"`
	CreatedAt    time.Time
}

type MallaGuardadaDB struct {
	ID             string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UsuarioID      string    `gorm:"not null;index" json:"usuario_id"`
	Nombre         string    `gorm:"not null" json:"nombre"`
	TotalSemestres int       `json:"total_semestres"`
	Asignaturas    string    `gorm:"type:jsonb;not null" json:"-"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ResultadoSimulacionDB struct {
	ID                string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UsuarioID         string    `gorm:"not null;index" json:"usuario_id"`
	MallaNombre       string    `json:"malla_nombre"`
	TotalAsignaturas  int       `json:"total_asignaturas"`
	TotalSemestres    int       `json:"total_semestres"`
	MetricasJSON      string    `gorm:"type:jsonb;not null" json:"-"`
	DistribucionJSON  string    `gorm:"type:jsonb" json:"-"`
	RamosCriticosJSON string    `gorm:"type:jsonb" json:"-"`
	VariablesJSON     string    `gorm:"type:jsonb" json:"-"`
	ModeloJSON        string    `gorm:"type:jsonb" json:"-"`
	CreatedAt         time.Time `json:"created_at"`
}
