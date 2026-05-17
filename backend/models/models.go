package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

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
	NE           int     `json:"ne"`
	NCSmax       int     `json:"ncsmax"`
	TAmin        float64 `json:"tamin"`
	NapTAmin     int     `json:"naptamin"`
	Opor         int     `json:"opor"`
	MaxSemestres int     `json:"max_semestres,omitempty"`
	Seed         int64   `json:"seed,omitempty"`
}

type ProgramacionPayload struct {
	Impar []string `json:"impar"`
	Par   []string `json:"par"`
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
	Asignaturas  []AsignaturaPayload  `json:"asignaturas"`
	Programacion *ProgramacionPayload `json:"programacion,omitempty"`
	Variables    VariablesPayload     `json:"variables"`
	Modelo       ModeloPayload        `json:"modelo"`
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
	EstadoTimeline    []EstadoAlumno
}

type RamoCritico struct {
	Sigla         string  `json:"sigla"`
	Intentos      float64 `json:"intentos"`
	Reprobaciones float64 `json:"reprobaciones"`
	TasaFalloPct  float64 `json:"tasa_fallo_pct"`
}

type MetricasGlobales struct {
	AlumnosSimulados    float64 `json:"alumnos_simulados"`
	Titulados           float64 `json:"titulados"`
	EliminadosTamin     float64 `json:"eliminados_tamin"`
	EliminadosOpor      float64 `json:"eliminados_opor"`
	TasaTitulacionPct   float64 `json:"tasa_titulacion_pct"`
	SemestresPromedio   float64 `json:"semestres_promedio"`
	EficienciaEgreso    float64 `json:"eficiencia_egreso"`
	EgresoOportunoPct   float64 `json:"egreso_oportuno_pct"`
	Retencion1erAnioPct float64 `json:"retencion_1er_anio_pct"`
	Retencion3erAnioPct float64 `json:"retencion_3er_anio_pct"`
}

type HeatmapEstadoSemestre struct {
	Semestre       int     `json:"semestre"`
	Activos        float64 `json:"activos"`
	Titulados      float64 `json:"titulados"`
	EliminadosTA   float64 `json:"eliminados_ta"`
	EliminadosOpor float64 `json:"eliminados_opor"`
}

type TransicionEstado struct {
	Semestre int     `json:"semestre"`
	From     string  `json:"from"`
	To       string  `json:"to"`
	Value    float64 `json:"value"`
}

type SensibilidadParametro struct {
	Parametro string  `json:"parametro"`
	Base      float64 `json:"base"`
	Menos10   float64 `json:"menos_10"`
	Mas10     float64 `json:"mas_10"`
	Impacto   float64 `json:"impacto"`
}

type SimulacionResponse struct {
	Mensaje               string                  `json:"mensaje"`
	MetricasGlobales      MetricasGlobales        `json:"metricas_globales"`
	DistribucionSemestres map[int]float64         `json:"distribucion_semestres"`
	RamosCriticos         []RamoCritico           `json:"ramos_criticos"`
	HeatmapEstadoSemestre []HeatmapEstadoSemestre `json:"heatmap_estado_semestre"`
	TransicionesEstado    []TransicionEstado      `json:"transiciones_estado"`
	SensibilidadTornado   []SensibilidadParametro `json:"sensibilidad_tornado"`
}

// ==========================================
// MODELOS GORM (Base de Datos)
// ==========================================

// Las columnas que antes eran `type:uuid` con default `gen_random_uuid()`
// (postgres-only) pasaron a `type:text` con UUID generado en hook
// `BeforeCreate`. Lo mismo con `type:jsonb` → `type:text`: GORM serializa el
// string con json.Marshal/Unmarshal, y postgres acepta string en columnas
// jsonb existentes sin cambios, así que es compatible con BD legacy.

type Usuario struct {
	ID           string `gorm:"type:text;primaryKey"`
	Email        string `gorm:"uniqueIndex;not null"`
	PasswordHash string `gorm:"not null"`
	IsApproved   bool   `gorm:"default:false"`
	IsAdmin      bool   `gorm:"default:false"`
	CreatedAt    time.Time
}

func (u *Usuario) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	return nil
}

type MallaGuardadaDB struct {
	ID             string    `gorm:"type:text;primaryKey" json:"id"`
	UsuarioID      string    `gorm:"not null;index" json:"usuario_id"`
	Nombre         string    `gorm:"not null" json:"nombre"`
	TotalSemestres int       `json:"total_semestres"`
	Asignaturas    string    `gorm:"type:text;not null" json:"-"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (m *MallaGuardadaDB) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type ResultadoSimulacionDB struct {
	ID                string    `gorm:"type:text;primaryKey" json:"id"`
	UsuarioID         string    `gorm:"not null;index" json:"usuario_id"`
	MallaNombre       string    `json:"malla_nombre"`
	TotalAsignaturas  int       `json:"total_asignaturas"`
	TotalSemestres    int       `json:"total_semestres"`
	MetricasJSON      string    `gorm:"type:text;not null" json:"-"`
	DistribucionJSON  string    `gorm:"type:text" json:"-"`
	RamosCriticosJSON string    `gorm:"type:text" json:"-"`
	HeatmapJSON       string    `gorm:"type:text" json:"-"`
	TransicionesJSON  string    `gorm:"type:text" json:"-"`
	SensibilidadJSON  string    `gorm:"type:text" json:"-"`
	VariablesJSON     string    `gorm:"type:text" json:"-"`
	ModeloJSON        string    `gorm:"type:text" json:"-"`
	CreatedAt         time.Time `json:"created_at"`
}

func (r *ResultadoSimulacionDB) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}
