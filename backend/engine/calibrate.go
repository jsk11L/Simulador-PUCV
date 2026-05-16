package engine

import (
	"fmt"
	"math"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// ==========================================
// CALIBRADOR DE PESOS (GRID SEARCH)
// ==========================================
// Busca los Weights{W_hist, W_prereq, W_stress} que minimizan el error
// predictivo del motor individual sobre una cohorte sintética.
//
// Estrategia: barrido exhaustivo sobre una grilla 3D de pesos. Para cada
// combinación, corre BacktestCohort y registra la métrica de calidad.
// El mejor punto se devuelve junto con la grilla completa.
//
// Métrica primaria: Brier score (menor = mejor). Es robusta a class
// imbalance (común en aprobado/reprobado) y captura calibración.

// CalibrationConfig configura un grid search.
type CalibrationConfig struct {
	Profile      StudentProfile
	Count        int    // alumnos por punto de grilla; recomendado >= 20
	Asignaturas  []models.AsignaturaPayload
	Programacion *models.ProgramacionPayload
	Variables    models.VariablesPayload
	Modelo       models.ModeloPayload
	Iteraciones  int   // backtest iteraciones por punto de corte
	BaseSeed     int64
	NapCorteIni  int

	// Definición de la grilla. Cada slice define los valores a probar
	// en cada dimensión. La grilla total es Cardinal × Cardinal × Cardinal.
	WHistGrid   []float64
	WPrereqGrid []float64
	WStressGrid []float64

	// Métrica objetivo: "brier" (default), "log_loss" o "accuracy".
	// brier y log_loss → menor es mejor. accuracy → mayor es mejor.
	Metric string
}

// CalibrationPoint es un punto evaluado en la grilla.
type CalibrationPoint struct {
	Weights     Weights `json:"weights"`
	Brier       float64 `json:"brier"`
	Accuracy    float64 `json:"accuracy"`
	LogLoss     float64 `json:"log_loss"`
	NAlumnos    int     `json:"n_alumnos"`
	NPrediccion int     `json:"n_prediccion"`
}

// CalibrationResult agrega toda la grilla evaluada + el mejor punto.
type CalibrationResult struct {
	Profile  StudentProfile     `json:"profile"`
	Metric   string             `json:"metric"`
	Best     CalibrationPoint   `json:"best"`
	Worst    CalibrationPoint   `json:"worst"`
	Baseline CalibrationPoint   `json:"baseline_zero_weights"`
	AllPoints []CalibrationPoint `json:"all_points"`
}

// CalibrateGridSearch evalúa todos los puntos de la grilla y devuelve los
// pesos óptimos. Para cada (W_hist, W_prereq, W_stress) corre BacktestCohort
// y mide la métrica configurada.
func CalibrateGridSearch(cfg CalibrationConfig) (CalibrationResult, error) {
	if len(cfg.WHistGrid) == 0 {
		cfg.WHistGrid = []float64{0.0, 0.5, 1.0, 1.5, 2.0}
	}
	if len(cfg.WPrereqGrid) == 0 {
		cfg.WPrereqGrid = []float64{0.0, 0.25, 0.5, 1.0}
	}
	if len(cfg.WStressGrid) == 0 {
		cfg.WStressGrid = []float64{0.0, 0.25, 0.5, 1.0}
	}
	if cfg.Metric == "" {
		cfg.Metric = "brier"
	}

	resultado := CalibrationResult{
		Profile: cfg.Profile,
		Metric:  cfg.Metric,
	}

	puntos := make([]CalibrationPoint, 0)
	for _, wh := range cfg.WHistGrid {
		for _, wp := range cfg.WPrereqGrid {
			for _, ws := range cfg.WStressGrid {
				weights := Weights{WHist: wh, WPrereq: wp, WStress: ws}
				bt, err := BacktestCohort(CohortBacktestConfig{
					Profile:      cfg.Profile,
					Count:        cfg.Count,
					Asignaturas:  cfg.Asignaturas,
					Programacion: cfg.Programacion,
					Variables:    cfg.Variables,
					Modelo:       cfg.Modelo,
					Weights:      weights,
					Iteraciones:  cfg.Iteraciones,
					BaseSeed:     cfg.BaseSeed,
					NapCorteIni:  cfg.NapCorteIni,
				})
				if err != nil {
					return CalibrationResult{}, fmt.Errorf("grid (%.2f, %.2f, %.2f): %w", wh, wp, ws, err)
				}
				puntos = append(puntos, CalibrationPoint{
					Weights:     weights,
					Brier:       bt.BrierAvg,
					Accuracy:    bt.AccuracyAvg,
					LogLoss:     bt.LogLossAvg,
					NAlumnos:    bt.AlumnosEvaluados,
					NPrediccion: bt.PrediccionesTotal,
				})
			}
		}
	}
	resultado.AllPoints = puntos

	// Encontrar mejor/peor según métrica
	better := mejorComparador(cfg.Metric)
	bestIdx, worstIdx := 0, 0
	for i := 1; i < len(puntos); i++ {
		if better(puntos[i], puntos[bestIdx]) {
			bestIdx = i
		}
		if better(puntos[worstIdx], puntos[i]) { // peor = el que CASI gana en la dirección opuesta
			worstIdx = i
		}
	}
	resultado.Best = puntos[bestIdx]
	resultado.Worst = puntos[worstIdx]

	// Baseline = punto con ZeroWeights, si está en la grilla
	for _, p := range puntos {
		if p.Weights == ZeroWeights {
			resultado.Baseline = p
			break
		}
	}
	return resultado, nil
}

// mejorComparador devuelve una función "a es mejor que b" según métrica.
func mejorComparador(metric string) func(a, b CalibrationPoint) bool {
	switch metric {
	case "accuracy":
		return func(a, b CalibrationPoint) bool { return a.Accuracy > b.Accuracy }
	case "log_loss":
		return func(a, b CalibrationPoint) bool { return a.LogLoss < b.LogLoss }
	default: // brier
		return func(a, b CalibrationPoint) bool { return a.Brier < b.Brier }
	}
}

// MetricValue extrae el valor de la métrica configurada (útil para reporting).
func (p CalibrationPoint) MetricValue(metric string) float64 {
	switch metric {
	case "accuracy":
		return p.Accuracy
	case "log_loss":
		return p.LogLoss
	default:
		return p.Brier
	}
}

// MetricLabel devuelve el nombre humano de la métrica.
func MetricLabel(metric string) string {
	switch metric {
	case "accuracy":
		return "Accuracy ↑"
	case "log_loss":
		return "Log-loss ↓"
	default:
		return "Brier ↓"
	}
}

// FormatPoint devuelve una línea legible de un punto para reportes.
func FormatPoint(p CalibrationPoint, metric string) string {
	return fmt.Sprintf("W(%.2f, %.2f, %.2f) → Brier=%.4f Acc=%.4f LL=%.4f  [%.4f]",
		p.Weights.WHist, p.Weights.WPrereq, p.Weights.WStress,
		p.Brier, p.Accuracy, p.LogLoss, p.MetricValue(metric))
}

// roundFloat redondea un float a N decimales (utilidad).
func roundFloat(v float64, decimals int) float64 {
	pow := math.Pow(10, float64(decimals))
	return math.Round(v*pow) / pow
}
