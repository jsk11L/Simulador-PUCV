package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"

	"github.com/jsk11L/Simulador-PUCV/engine"
	"github.com/jsk11L/Simulador-PUCV/models"
)

// ==========================================
// HANDLERS DE SIMULACIÓN INDIVIDUAL
// ==========================================
// Endpoints para el feature de backtesting individual:
//   - Listar perfiles disponibles
//   - Generar alumno sintético (1 o N)
//   - Proyectar futuro de un alumno (StudentHistory + Weights)
//
// Todos estos endpoints son protegidos (requieren autenticación).

// scenarioFile coincide con la estructura de original/scenarios/*.json y
// con engine/testdata/scenarios/*.json. El motor sirve ambas mallas con la
// misma forma (sin programación específica si la programación va aparte).
type scenarioFile struct {
	Scenario     string                      `json:"scenario"`
	Asignaturas  []models.AsignaturaPayload  `json:"asignaturas"`
	Programacion *models.ProgramacionPayload `json:"programacion,omitempty"`
}

// scenarioOverrides aplica overrides de variables según el escenario.
// PF (Propuesta Final) eleva NCSmax a 25 según el paper.
var scenarioOverrides = map[string]struct{ NCSmax int }{
	"pf": {NCSmax: 25},
}

// ListarPerfiles devuelve los presets nombrados del generador. Útil para
// que la UI pueble selectores de "Perfil del alumno".
//
// GET /api/perfiles
func (a *API) ListarPerfiles(c *gin.Context) {
	presets := engine.ProfilePresets()
	c.JSON(http.StatusOK, gin.H{"perfiles": presets})
}

// ObtenerScenario devuelve la malla y programación de un escenario fijo
// del paper. Lo usa el frontend del "flujo manual" para construir el
// kanban interactivo del alumno sobre los ramos reales de la malla.
//
// GET /api/scenarios/:id
func (a *API) ObtenerScenario(c *gin.Context) {
	id := c.Param("id")
	sc, err := cargarScenarioJSON(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "escenario inválido: " + err.Error()})
		return
	}
	ncsmax := 21
	if ovr, ok := scenarioOverrides[id]; ok && ovr.NCSmax != 0 {
		ncsmax = ovr.NCSmax
	}
	c.JSON(http.StatusOK, gin.H{
		"id":           id,
		"asignaturas":  sc.Asignaturas,
		"programacion": sc.Programacion,
		"ncsmax":       ncsmax,
	})
}

// GenerarAlumnoInput es el body del endpoint de generación.
//
// Para la malla, dos modos mutuamente excluyentes:
//   - scenario: ID de un escenario del paper ("caso_actual", "pf", etc.)
//   - asignaturas + programacion: malla custom (típicamente de las
//     "Mis mallas guardadas" del usuario)
// Si vienen asignaturas no vacías, esas tienen prioridad. Si ambos vacíos,
// se usa "caso_actual" por defecto.
type GenerarAlumnoInput struct {
	Profile       string                      `json:"profile" binding:"required"`
	Scenario      string                      `json:"scenario"`
	Asignaturas   []models.AsignaturaPayload  `json:"asignaturas,omitempty"`
	Programacion  *models.ProgramacionPayload `json:"programacion,omitempty"`
	NCSmax        int                         `json:"ncsmax,omitempty"` // override opcional, 0 = usa el del scenario
	Seed          int64                       `json:"seed"`
	UntilSemestre int                         `json:"until_semestre"`
	Count         int                         `json:"count"`
	RUT           string                      `json:"rut,omitempty"`
	Nombre        string                      `json:"nombre,omitempty"`
}

// GenerarAlumno produce 1 o N alumnos sintéticos según el perfil.
//
// POST /api/generar-alumno
//
// Body: GenerarAlumnoInput. Si Count > 1, devuelve un array de
// StudentHistory; si Count == 1 (o 0), devuelve un único StudentHistory.
func (a *API) GenerarAlumno(c *gin.Context) {
	var input GenerarAlumnoInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos: " + err.Error()})
		return
	}

	profile, ok := engine.ProfileByName(input.Profile)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":             fmt.Sprintf("perfil desconocido: %q", input.Profile),
			"perfiles_validos":  perfilesValidos(),
		})
		return
	}

	asignaturas, programacion, ncsmax, err := resolverMalla(input.Scenario, input.Asignaturas, input.Programacion, input.NCSmax)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	count := input.Count
	if count <= 0 {
		count = 1
	}
	if count > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "count máximo 1000 por request"})
		return
	}

	baseSeed := input.Seed
	if baseSeed == 0 {
		baseSeed = 1
	}

	results := make([]models.StudentHistory, 0, count)
	for i := 0; i < count; i++ {
		cfg := engine.GeneratorConfig{
			Profile:      profile,
			Asignaturas:  asignaturas,
			Programacion: programacion,
			Variables: models.VariablesPayload{
				NCSmax:       ncsmax,
				TAmin:        12.3,
				NapTAmin:     10,
				Opor:         6,
				MaxSemestres: 30,
			},
			Modelo: models.ModeloPayload{
				VMap1234: 0.48, Delta1234: 0.2,
				VMap5678: 0.55, Delta5678: 0.2,
				VMapM: 0.65, DeltaM: 0.25,
			},
			Seed:          baseSeed + int64(i)*1000003,
			UntilSemestre: input.UntilSemestre,
			RUT:           rutFor(input.RUT, profile.Nombre, i),
			Nombre:        nombreFor(input.Nombre, profile.Nombre, i),
			Carrera:       "ICE (sintético)",
		}
		hist, err := cfg.Generar()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "generar alumno: " + err.Error()})
			return
		}
		results = append(results, hist)
	}

	if count == 1 {
		c.JSON(http.StatusOK, results[0])
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":     count,
		"profile":   profile,
		"scenario":  resumirOrigenMalla(input.Scenario, input.Asignaturas),
		"seed_base": baseSeed,
		"alumnos":   results,
	})
}

// SimularIndividualInput es el body del endpoint de proyección individual.
type SimularIndividualInput struct {
	History      models.StudentHistory       `json:"history" binding:"required"`
	Scenario     string                      `json:"scenario"`     // default "caso_actual"
	Asignaturas  []models.AsignaturaPayload  `json:"asignaturas,omitempty"`
	Programacion *models.ProgramacionPayload `json:"programacion,omitempty"`
	NCSmax       int                         `json:"ncsmax,omitempty"`
	Weights      *engine.Weights             `json:"weights"`
	Iteraciones  int                         `json:"iteraciones"`
	Seed         int64                       `json:"seed"`
	TAminMode    string                      `json:"tamin_mode"`
}

// SimularIndividual proyecta el futuro de un alumno aplicando modificadores δ.
//
// POST /api/simular-individual
//
// Body: SimularIndividualInput. El alumno puede venir tanto del CSV PUCV
// real (parseado por el cliente) como de una generación sintética previa.
func (a *API) SimularIndividual(c *gin.Context) {
	var input SimularIndividualInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos: " + err.Error()})
		return
	}

	asignaturas, programacion, ncsmax, err := resolverMalla(input.Scenario, input.Asignaturas, input.Programacion, input.NCSmax)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	weights := engine.DefaultWeights
	if input.Weights != nil {
		weights = *input.Weights
	}

	cfg := engine.IndividualConfig{
		History:      input.History,
		Asignaturas:  asignaturas,
		Programacion: programacion,
		Variables: models.VariablesPayload{
			NCSmax:       ncsmax,
			TAmin:        12.3,
			NapTAmin:     10,
			Opor:         6,
			MaxSemestres: 30,
		},
		Modelo: models.ModeloPayload{
			VMap1234: 0.48, Delta1234: 0.2,
			VMap5678: 0.55, Delta5678: 0.2,
			VMapM: 0.65, DeltaM: 0.25,
		},
		Weights:     weights,
		Iteraciones: input.Iteraciones,
		Seed:        input.Seed,
		TAminMode:   input.TAminMode,
	}

	pred, err := engine.SimulateIndividual(cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "simular: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, pred)
}

// BacktestCohorteInput es el body del endpoint de calibración masiva.
type BacktestCohorteInput struct {
	Profile      string                      `json:"profile" binding:"required"`
	Scenario     string                      `json:"scenario"`
	Asignaturas  []models.AsignaturaPayload  `json:"asignaturas,omitempty"`
	Programacion *models.ProgramacionPayload `json:"programacion,omitempty"`
	NCSmax       int                         `json:"ncsmax,omitempty"`
	Count        int                         `json:"count"`
	Iteraciones  int                         `json:"iteraciones"`
	Seed         int64                       `json:"seed"`
	Weights      engine.Weights              `json:"weights"`
	NapCorteIni  int                         `json:"nap_corte_ini"`
}

// BacktestCohorteResponse es lo que devolvemos: métricas agregadas + el
// punto baseline (W=0) calculado en la misma cohorte para comparación.
type BacktestCohorteResponse struct {
	Profile        engine.StudentProfile  `json:"profile"`
	Weights        engine.Weights         `json:"weights"`
	AlumnosEvaluados int                  `json:"alumnos_evaluados"`
	Predicciones   int                    `json:"predicciones_total"`
	Brier          float64                `json:"brier_avg"`
	Accuracy       float64                `json:"accuracy_avg"`
	LogLoss        float64                `json:"log_loss_avg"`
	Baseline       *BacktestCohorteResponse `json:"baseline,omitempty"`
}

// BacktestCohorte evalúa la calidad de un set de pesos sobre N alumnos
// sintéticos del perfil dado. Devuelve métricas Brier/Accuracy/LogLoss +
// baseline (W=0) calculada en la misma cohorte para comparación visual.
//
// POST /api/backtest-cohorte
func (a *API) BacktestCohorte(c *gin.Context) {
	var input BacktestCohorteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos: " + err.Error()})
		return
	}
	profile, ok := engine.ProfileByName(input.Profile)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":            fmt.Sprintf("perfil desconocido: %q", input.Profile),
			"perfiles_validos": perfilesValidos(),
		})
		return
	}
	asignaturas, programacion, ncsmax, err := resolverMalla(input.Scenario, input.Asignaturas, input.Programacion, input.NCSmax)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	count := input.Count
	if count <= 0 {
		count = 20
	}
	if count > 200 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "count máximo 200 para backtest interactivo"})
		return
	}
	iter := input.Iteraciones
	if iter <= 0 {
		iter = 100
	}

	baseCfg := engine.CohortBacktestConfig{
		Profile:      profile,
		Count:        count,
		Asignaturas:  asignaturas,
		Programacion: programacion,
		Variables: models.VariablesPayload{
			NCSmax: ncsmax, TAmin: 12.3, NapTAmin: 10, Opor: 6, MaxSemestres: 30,
		},
		Modelo: models.ModeloPayload{
			VMap1234: 0.48, Delta1234: 0.2,
			VMap5678: 0.55, Delta5678: 0.2,
			VMapM: 0.65, DeltaM: 0.25,
		},
		Iteraciones: iter,
		BaseSeed:    input.Seed,
		NapCorteIni: input.NapCorteIni,
	}

	// Backtest con los pesos del usuario.
	withWeights := baseCfg
	withWeights.Weights = input.Weights
	resWeights, err := engine.BacktestCohort(withWeights)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "backtest: " + err.Error()})
		return
	}

	// Backtest baseline (W=0) sobre la misma cohorte para comparar.
	zeroCfg := baseCfg
	zeroCfg.Weights = engine.ZeroWeights
	resZero, err := engine.BacktestCohort(zeroCfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "baseline: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, BacktestCohorteResponse{
		Profile:          profile,
		Weights:          input.Weights,
		AlumnosEvaluados: resWeights.AlumnosEvaluados,
		Predicciones:     resWeights.PrediccionesTotal,
		Brier:            resWeights.BrierAvg,
		Accuracy:         resWeights.AccuracyAvg,
		LogLoss:          resWeights.LogLossAvg,
		Baseline: &BacktestCohorteResponse{
			Profile:          profile,
			Weights:          engine.ZeroWeights,
			AlumnosEvaluados: resZero.AlumnosEvaluados,
			Predicciones:     resZero.PrediccionesTotal,
			Brier:            resZero.BrierAvg,
			Accuracy:         resZero.AccuracyAvg,
			LogLoss:          resZero.LogLossAvg,
		},
	})
}

// ==========================================
// HELPERS INTERNOS
// ==========================================

// resolverMalla determina qué malla usar dada la combinación de entradas
// del usuario. Lógica:
//   - Si vienen asignaturas no vacías → usa esas (modo "malla custom"
//     del usuario, típicamente desde "Mis mallas guardadas").
//   - Si no, carga del escenario fijo del paper (default "caso_actual").
//
// NCSmax viene del scenarioOverrides para escenarios conocidos (PF=25),
// pero el cliente puede sobrescribirlo enviando ncsmax > 0 en el body.
func resolverMalla(
	scenarioID string,
	asignaturas []models.AsignaturaPayload,
	programacion *models.ProgramacionPayload,
	ncsmaxOverride int,
) ([]models.AsignaturaPayload, *models.ProgramacionPayload, int, error) {
	// Modo malla custom: el frontend pasó asignaturas directamente.
	if len(asignaturas) > 0 {
		ncsmax := 21
		if ncsmaxOverride > 0 {
			ncsmax = ncsmaxOverride
		}
		return asignaturas, programacion, ncsmax, nil
	}

	// Modo scenario: cargar JSON del escenario fijo.
	id := scenarioID
	if id == "" {
		id = "caso_actual"
	}
	sc, err := cargarScenarioJSON(id)
	if err != nil {
		return nil, nil, 0, fmt.Errorf("escenario inválido: %w", err)
	}
	ncsmax := 21
	if ovr, ok := scenarioOverrides[id]; ok && ovr.NCSmax != 0 {
		ncsmax = ovr.NCSmax
	}
	if ncsmaxOverride > 0 {
		ncsmax = ncsmaxOverride
	}
	return sc.Asignaturas, sc.Programacion, ncsmax, nil
}

// resumirOrigenMalla devuelve un identificador legible del origen de la
// malla usada en una corrida. Útil para incluir en respuestas y logs.
func resumirOrigenMalla(scenarioID string, asignaturas []models.AsignaturaPayload) string {
	if len(asignaturas) > 0 {
		return "custom"
	}
	if scenarioID == "" {
		return "caso_actual"
	}
	return scenarioID
}


// cargarScenarioJSON busca el escenario en disco. El binary corre desde
// directorios distintos según contexto (server: backend/, test: backend/engine/),
// así que se prueban varias rutas candidatas.
func cargarScenarioJSON(scenarioID string) (*scenarioFile, error) {
	if !esIDValidoScenario(scenarioID) {
		return nil, fmt.Errorf("id inválido: %q", scenarioID)
	}
	candidates := []string{
		filepath.Join("engine", "testdata", "scenarios", scenarioID+".json"),
		filepath.Join("..", "engine", "testdata", "scenarios", scenarioID+".json"),
		filepath.Join("..", "original", "scenarios", scenarioID+".json"),
		filepath.Join("..", "..", "original", "scenarios", scenarioID+".json"),
	}
	for _, p := range candidates {
		data, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		var sc scenarioFile
		if err := json.Unmarshal(data, &sc); err != nil {
			return nil, fmt.Errorf("parse %s: %w", p, err)
		}
		if len(sc.Asignaturas) == 0 {
			return nil, fmt.Errorf("escenario %q sin asignaturas", scenarioID)
		}
		return &sc, nil
	}
	return nil, fmt.Errorf("escenario %q no encontrado en filesystem", scenarioID)
}

// esIDValidoScenario evita path traversal: solo permite IDs conocidos.
func esIDValidoScenario(id string) bool {
	switch id {
	case "caso_actual", "pe", "cas", "r_10", "r_mas_10", "r_10_gt_40", "pf":
		return true
	}
	return false
}

func perfilesValidos() []string {
	presets := engine.ProfilePresets()
	out := make([]string, 0, len(presets))
	for _, p := range presets {
		out = append(out, p.Nombre)
	}
	return out
}

func rutFor(custom, profileNombre string, i int) string {
	if custom != "" {
		if i == 0 {
			return custom
		}
		return fmt.Sprintf("%s-%d", custom, i)
	}
	return fmt.Sprintf("SYN-%s-%d", profileNombre, i)
}

func nombreFor(custom, profileNombre string, i int) string {
	if custom != "" {
		if i == 0 {
			return custom
		}
		return fmt.Sprintf("%s #%d", custom, i)
	}
	return fmt.Sprintf("Sintético %s #%d", profileNombre, i)
}
