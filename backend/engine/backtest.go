package engine

import (
	"fmt"
	"math"
	"sort"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// ==========================================
// FRAMEWORK DE BACKTESTING WALK-FORWARD
// ==========================================
// Valida la calidad predictiva del motor individual contra historiales
// REALES (o sintéticos con perfil conocido). Estrategia:
//
//  1. Toma el historial completo del alumno.
//  2. Por cada punto de corte N (de NapCorteIni hasta len(semestres)−1):
//     a. Trunca el historial a los primeros N semestres.
//     b. Toma el semestre N+1 como "ground truth" oculto.
//     c. Llama al motor individual con el historial truncado y los pesos
//        a probar; obtiene P(aprobar) para cada ramo pendiente.
//     d. Para cada ramo del semestre N+1 real:
//          - Si fue aprobado → realidad = 1
//          - Si fue reprobado → realidad = 0
//          - Si está en_curso/abandonado → se ignora
//          - Compara P_predicha vs realidad.
//  3. Agrega las comparaciones en tres métricas:
//     - Brier score: (P − y)². Menor = mejor calibración probabilística.
//     - Accuracy: % aciertos cuando umbral = 0.5.
//     - Log-loss: −[y·log(p) + (1−y)·log(1−p)]. Penaliza confianza errada.
//
// Las métricas globales agregan TODAS las predicciones de todos los puntos.

// BacktestConfig configura una corrida de backtesting walk-forward para
// UN alumno. Reutiliza los mismos parámetros que `IndividualConfig` con
// agregados específicos de backtesting.
type BacktestConfig struct {
	History      models.StudentHistory
	Asignaturas  []models.AsignaturaPayload
	Programacion *models.ProgramacionPayload
	Variables    models.VariablesPayload
	Modelo       models.ModeloPayload
	Weights      Weights

	// Iteraciones por punto de corte. Default 500.
	Iteraciones int

	// Seed determinística (afecta cada predicción).
	Seed int64

	// NapCorteIni: primer punto de corte. Si <2, default 2.
	// Cortar muy temprano da resúmenes históricos poco informativos.
	NapCorteIni int
}

// RamoPrediccion empareja una probabilidad predicha con su resultado real.
type RamoPrediccion struct {
	Sigla    string  `json:"sigla"`
	ProbPred float64 `json:"prob_pred"`
	Real     bool    `json:"real_aprobado"`
}

// BacktestPunto agrega los resultados de UN punto de corte: el motor
// predijo, y la realidad oculta confirmó o no.
type BacktestPunto struct {
	SemestreCortado int              `json:"semestre_cortado"`
	SemestreReal    string           `json:"semestre_real"`
	Predicciones    []RamoPrediccion `json:"predicciones"`
	BrierScore      float64          `json:"brier_score"`
	Accuracy        float64          `json:"accuracy"`
	LogLoss         float64          `json:"log_loss"`
	NoEvaluados     int              `json:"no_evaluados"` // ramos del sem N+1 sin predicción (no eran candidatos)
}

// BacktestResult es el output completo del backtest sobre un alumno.
type BacktestResult struct {
	AlumnoRUT         string         `json:"alumno_rut,omitempty"`
	Pesos             Weights        `json:"pesos"`
	Puntos            []BacktestPunto `json:"puntos"`
	BrierGlobal       float64        `json:"brier_global"`
	AccuracyGlobal    float64        `json:"accuracy_global"`
	LogLossGlobal     float64        `json:"log_loss_global"`
	PrediccionesTotal int            `json:"predicciones_total"`
}

// BacktestStudent ejecuta el backtest walk-forward sobre el historial de UN alumno.
func BacktestStudent(cfg BacktestConfig) (BacktestResult, error) {
	if len(cfg.History.Semestres) < 3 {
		return BacktestResult{}, fmt.Errorf("backtest requiere historial >= 3 semestres, tiene %d", len(cfg.History.Semestres))
	}
	if cfg.Iteraciones <= 0 {
		cfg.Iteraciones = 500
	}
	napCorte := cfg.NapCorteIni
	if napCorte < 2 {
		napCorte = 2
	}

	resultado := BacktestResult{
		AlumnoRUT: cfg.History.RUT,
		Pesos:     cfg.Weights,
	}

	for n := napCorte; n < len(cfg.History.Semestres); n++ {
		histTruncado := truncarHistorial(cfg.History, n)
		semestreReal := cfg.History.Semestres[n]

		// Llamar al motor individual para obtener predicciones por ramo.
		indCfg := IndividualConfig{
			History:      histTruncado,
			Asignaturas:  cfg.Asignaturas,
			Programacion: cfg.Programacion,
			Variables:    cfg.Variables,
			Modelo:       cfg.Modelo,
			Weights:      cfg.Weights,
			Iteraciones:  cfg.Iteraciones,
			Seed:         cfg.Seed + int64(n)*1009,
		}
		pred, err := SimulateIndividual(indCfg)
		if err != nil {
			return BacktestResult{}, fmt.Errorf("backtest sem %d: %w", n+1, err)
		}

		// Index las predicciones por sigla.
		probPorSigla := make(map[string]float64, len(pred.ProbabilidadesPorRamo))
		for _, r := range pred.ProbabilidadesPorRamo {
			probPorSigla[r.Sigla] = r.ProbAprobar
		}

		punto := BacktestPunto{
			SemestreCortado: n,
			SemestreReal:    semestreReal.Periodo,
		}

		// Para cada ramo del semestre N+1 real, comparar contra predicción.
		for _, c := range semestreReal.Cursos {
			// Solo ramos con desenlace contable.
			if c.Estado != models.SubjectAprobado && c.Estado != models.SubjectReprobado {
				continue
			}
			// Solo ramos que están en la malla (ignora FOFU/optativos sintéticos
			// que no son parte de la malla de predicción).
			if !isInMalla(cfg.Asignaturas, c.Sigla) {
				continue
			}
			probPred, ok := probPorSigla[c.Sigla]
			if !ok {
				// No estaba en la predicción (prereqs no cumplidos por el motor
				// con el historial truncado). Lo registramos pero no contribuye
				// a las métricas.
				punto.NoEvaluados++
				continue
			}
			punto.Predicciones = append(punto.Predicciones, RamoPrediccion{
				Sigla:    c.Sigla,
				ProbPred: probPred,
				Real:     c.Estado == models.SubjectAprobado,
			})
		}

		// Calcular métricas del punto.
		punto.BrierScore, punto.Accuracy, punto.LogLoss = calcularMetricas(punto.Predicciones)
		resultado.Puntos = append(resultado.Puntos, punto)
	}

	// Métricas globales: agregar todas las predicciones de todos los puntos.
	todas := make([]RamoPrediccion, 0)
	for _, p := range resultado.Puntos {
		todas = append(todas, p.Predicciones...)
	}
	resultado.PrediccionesTotal = len(todas)
	resultado.BrierGlobal, resultado.AccuracyGlobal, resultado.LogLossGlobal = calcularMetricas(todas)
	return resultado, nil
}

// truncarHistorial devuelve copia del historial con solo los primeros N semestres.
func truncarHistorial(h models.StudentHistory, n int) models.StudentHistory {
	out := models.StudentHistory{
		RUT:     h.RUT,
		Nombre:  h.Nombre,
		Carrera: h.Carrera,
		Estado:  models.TrayectoriaActiva, // truncar implica que el alumno sigue
	}
	if n > len(h.Semestres) {
		n = len(h.Semestres)
	}
	out.Semestres = append([]models.SemesterRecord(nil), h.Semestres[:n]...)
	return out
}

// isInMalla verifica que una sigla aparezca en la malla del escenario.
func isInMalla(malla []models.AsignaturaPayload, sigla string) bool {
	for _, a := range malla {
		if a.ID == sigla {
			return true
		}
	}
	return false
}

// calcularMetricas computa Brier score, accuracy y log-loss sobre una lista
// de predicciones. Retorna (0, 0, 0) si la lista está vacía.
//
// Brier score (BS):
//
//	BS = (1/N) Σ (p_i − y_i)²
//	Rango [0, 1], menor es mejor.
//
// Accuracy:
//
//	hits = Σ (p_i ≥ 0.5 == y_i)
//	Rango [0, 1], mayor es mejor.
//
// Log-loss:
//
//	LL = -(1/N) Σ [y·log(max(p, eps)) + (1−y)·log(max(1−p, eps))]
//	Rango [0, ∞], menor es mejor. Penaliza confianza extrema errada.
func calcularMetricas(preds []RamoPrediccion) (brier, accuracy, logLoss float64) {
	n := len(preds)
	if n == 0 {
		return 0, 0, 0
	}
	const eps = 1e-9 // evita log(0)
	hits := 0
	sumBrier := 0.0
	sumLogLoss := 0.0
	for _, p := range preds {
		y := 0.0
		if p.Real {
			y = 1.0
		}
		diff := p.ProbPred - y
		sumBrier += diff * diff

		predicho := p.ProbPred >= 0.5
		if predicho == p.Real {
			hits++
		}

		pSafe := math.Max(eps, math.Min(1-eps, p.ProbPred))
		sumLogLoss += -(y*math.Log(pSafe) + (1-y)*math.Log(1-pSafe))
	}
	return sumBrier / float64(n), float64(hits) / float64(n), sumLogLoss / float64(n)
}

// ==========================================
// EVALUADOR MASIVO DE COHORTES
// ==========================================
// Corre backtest sobre N alumnos sintéticos (todos con el mismo perfil) y
// agrega métricas. Útil para comparar pesos: ¿con Weights{1.0, 0.5, 0.5}
// vs Weights{2.0, 0.3, 0.7}, cuál predice mejor?

// CohortBacktestConfig configura un backtest masivo sobre alumnos sintéticos.
type CohortBacktestConfig struct {
	Profile      StudentProfile
	Count        int
	Asignaturas  []models.AsignaturaPayload
	Programacion *models.ProgramacionPayload
	Variables    models.VariablesPayload
	Modelo       models.ModeloPayload
	Weights      Weights
	Iteraciones  int   // iteraciones por punto de corte
	BaseSeed     int64 // seed base; cada alumno usa baseSeed + i*1000003
	NapCorteIni  int
}

// CohortBacktestResult agrega métricas sobre los N alumnos.
type CohortBacktestResult struct {
	Profile           StudentProfile
	Pesos             Weights
	AlumnosEvaluados  int
	PrediccionesTotal int
	BrierAvg          float64
	AccuracyAvg       float64
	LogLossAvg        float64
	// Métricas por alumno individuales (útil para análisis fino).
	PorAlumno []BacktestResult
}

// BacktestCohort corre backtest sobre N alumnos sintéticos del perfil dado
// y agrega métricas. Cada alumno se genera con seed determinístico, su
// trayectoria completa se calcula, y luego se hace walk-forward.
func BacktestCohort(cfg CohortBacktestConfig) (CohortBacktestResult, error) {
	if cfg.Count <= 0 {
		cfg.Count = 30
	}
	if cfg.Iteraciones <= 0 {
		cfg.Iteraciones = 200 // un poco más rápido para masivo
	}
	baseSeed := cfg.BaseSeed
	if baseSeed == 0 {
		baseSeed = 1
	}

	resultado := CohortBacktestResult{
		Profile: cfg.Profile,
		Pesos:   cfg.Weights,
	}

	sumBrier, sumAcc, sumLL := 0.0, 0.0, 0.0
	totalPred := 0
	contribuyentes := 0

	for i := 0; i < cfg.Count; i++ {
		seedAlumno := baseSeed + int64(i)*1000003

		// Generar trayectoria completa del alumno (sin UntilSemestre).
		genCfg := GeneratorConfig{
			Profile:      cfg.Profile,
			Asignaturas:  cfg.Asignaturas,
			Programacion: cfg.Programacion,
			Variables:    cfg.Variables,
			Modelo:       cfg.Modelo,
			Seed:         seedAlumno,
			RUT:          fmt.Sprintf("BT-%s-%d", cfg.Profile.Nombre, i),
		}
		hist, err := genCfg.Generar()
		if err != nil {
			return CohortBacktestResult{}, fmt.Errorf("generar alumno %d: %w", i, err)
		}

		// Solo backtest si el alumno tiene historial suficiente.
		if len(hist.Semestres) < 3 {
			continue
		}

		bt, err := BacktestStudent(BacktestConfig{
			History:      hist,
			Asignaturas:  cfg.Asignaturas,
			Programacion: cfg.Programacion,
			Variables:    cfg.Variables,
			Modelo:       cfg.Modelo,
			Weights:      cfg.Weights,
			Iteraciones:  cfg.Iteraciones,
			Seed:         seedAlumno + 7,
			NapCorteIni:  cfg.NapCorteIni,
		})
		if err != nil {
			return CohortBacktestResult{}, fmt.Errorf("backtest alumno %d: %w", i, err)
		}

		resultado.PorAlumno = append(resultado.PorAlumno, bt)
		if bt.PrediccionesTotal == 0 {
			continue
		}
		sumBrier += bt.BrierGlobal
		sumAcc += bt.AccuracyGlobal
		sumLL += bt.LogLossGlobal
		totalPred += bt.PrediccionesTotal
		contribuyentes++
	}

	resultado.AlumnosEvaluados = contribuyentes
	resultado.PrediccionesTotal = totalPred
	if contribuyentes > 0 {
		resultado.BrierAvg = sumBrier / float64(contribuyentes)
		resultado.AccuracyAvg = sumAcc / float64(contribuyentes)
		resultado.LogLossAvg = sumLL / float64(contribuyentes)
	}
	// Ordenar PorAlumno por RUT para determinismo del output.
	sort.SliceStable(resultado.PorAlumno, func(i, j int) bool {
		return resultado.PorAlumno[i].AlumnoRUT < resultado.PorAlumno[j].AlumnoRUT
	})
	return resultado, nil
}
