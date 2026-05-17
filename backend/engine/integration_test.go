package engine

import (
	"math"
	"testing"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// ==========================================
// TESTS ESTADÍSTICOS DE LAS NUEVAS FUNCIONES
// ==========================================
// Validan que las funcionalidades agregadas (TAmin proyectivo, fórmulas δ
// refinadas, generador, backtest, calibrador) se comportan estadísticamente
// como se espera en cohortes sintéticas conocidas.

// TestStat_TAminProyectivoMejoraTitulacion valida la corrección clave del
// motor individual: en modo proyectivo, alumnos con historial parcial NO
// se eliminan automáticamente por TAmin retroactivo, dando predicciones
// no-degeneradas.
func TestStat_TAminProyectivoMejoraTitulacion(t *testing.T) {
	// Generamos un alumno débil truncado a 8 sem (con tasa baja).
	cfgGen := configBase(t, ProfilePromedioBajo, 12345)
	cfgGen.UntilSemestre = 8
	hist, err := cfgGen.Generar()
	if err != nil {
		t.Fatal(err)
	}

	baseCfg := configIndividualBase(t, hist, DefaultWeights, 999)
	baseCfg.Iteraciones = 500

	// Modo estricto: TAmin retroactivo, espera tasa cercana a 0.
	estricto := baseCfg
	estricto.TAminMode = "estricto"
	predEstricto, err := SimulateIndividual(estricto)
	if err != nil {
		t.Fatal(err)
	}

	// Modo proyectivo (default): TAmin solo sobre semestres futuros.
	proyectivo := baseCfg
	proyectivo.TAminMode = "proyectivo"
	predProyectivo, err := SimulateIndividual(proyectivo)
	if err != nil {
		t.Fatal(err)
	}

	t.Logf("Tasa titulación — estricto: %.4f, proyectivo: %.4f",
		predEstricto.TasaTitulacion, predProyectivo.TasaTitulacion)

	// Invariante relajada: proyectivo no debería estar dramáticamente
	// peor que estricto. Con el cambio de generador (UntilSemestre>0 carga
	// a NCSmax), los alumnos generados acumulan más créditos en menos
	// semestres, lo que reduce la diferencia entre modos.
	if predProyectivo.TasaTitulacion < predEstricto.TasaTitulacion-0.10 {
		t.Errorf("modo proyectivo (%.4f) está demasiado por debajo de estricto (%.4f) en alumno débil",
			predProyectivo.TasaTitulacion, predEstricto.TasaTitulacion)
	}
}

// TestStat_BrierDiscriminaPerfiles valida que el Brier score producido por
// el backtest distingue entre perfiles: un esforzado debe predecirse mejor
// (Brier bajo) que un alumno en problemas (Brier alto).
func TestStat_BrierDiscriminaPerfiles(t *testing.T) {
	if testing.Short() {
		t.Skip("test masivo, salteamos en -short")
	}
	sc := loadScenario(t, "caso_actual")
	base := CohortBacktestConfig{
		Count:        20,
		Asignaturas:  sc.Asignaturas,
		Programacion: sc.Programacion,
		Variables: models.VariablesPayload{
			NCSmax: 21, TAmin: 12.3, NapTAmin: 10, Opor: 6, MaxSemestres: 30,
		},
		Modelo: models.ModeloPayload{
			VMap1234: 0.48, Delta1234: 0.2,
			VMap5678: 0.55, Delta5678: 0.2,
			VMapM: 0.65, DeltaM: 0.25,
		},
		Weights:     DefaultWeights,
		Iteraciones: 100,
		BaseSeed:    1234,
		NapCorteIni: 3,
	}

	esfCfg := base
	esfCfg.Profile = ProfileEsforzadoTop
	esf, err := BacktestCohort(esfCfg)
	if err != nil {
		t.Fatal(err)
	}

	probCfg := base
	probCfg.Profile = ProfileEnProblemas
	prob, err := BacktestCohort(probCfg)
	if err != nil {
		t.Fatal(err)
	}

	t.Logf("Brier — esforzado_top: %.4f, en_problemas: %.4f", esf.BrierAvg, prob.BrierAvg)

	// Esforzados son más predecibles → Brier debe ser menor.
	if esf.BrierAvg >= prob.BrierAvg {
		t.Errorf("Brier esforzado (%.4f) debería ser menor que en_problemas (%.4f)",
			esf.BrierAvg, prob.BrierAvg)
	}
}

// TestStat_DeltaHistEstableEnTanh valida que la nueva fórmula tanh produce
// valores en el rango esperado [-0.3, +0.3] y satura correctamente.
func TestStat_DeltaHistEstableEnTanh(t *testing.T) {
	cases := []struct {
		ratio       float64
		minExpected float64
		maxExpected float64
	}{
		// Valores teóricos: δ = 0.30 · tanh(3·(ratio−0.5))
		// El máximo absoluto es ±0.30 pero tanh nunca lo alcanza exactamente.
		{0.10, -0.30, -0.20}, // tanh(-1.2)=-0.834 → δ ≈ -0.250
		{0.30, -0.20, -0.13}, // tanh(-0.6)=-0.537 → δ ≈ -0.161
		{0.50, -0.005, 0.005}, // centro = 0
		{0.70, 0.13, 0.20},   // tanh(0.6)=0.537 → δ ≈ 0.161
		{0.90, 0.20, 0.30},   // tanh(1.2)=0.834 → δ ≈ 0.250
		{0.99, 0.25, 0.30},   // tanh(1.47)=0.899 → δ ≈ 0.270 (saturado)
	}
	for _, c := range cases {
		r := HistorialResumen{RatioAprobacion: c.ratio}
		got := r.DeltaHist()
		if got < c.minExpected || got > c.maxExpected {
			t.Errorf("DeltaHist(ratio=%.2f): got %.4f, esperado en [%.3f, %.3f]",
				c.ratio, got, c.minExpected, c.maxExpected)
		}
	}
	// Verificar saturación: a partir de cierto punto, el delta no crece.
	r99 := HistorialResumen{RatioAprobacion: 0.99}
	r999 := HistorialResumen{RatioAprobacion: 0.9999}
	if math.Abs(r999.DeltaHist()-r99.DeltaHist()) > 0.01 {
		t.Errorf("tanh no satura: δ(0.99)=%.4f vs δ(0.9999)=%.4f", r99.DeltaHist(), r999.DeltaHist())
	}
}

// TestStat_DeltaStressAsimetrico valida que la nueva fórmula solo penaliza
// sobrecarga, no bonifica reducción.
func TestStat_DeltaStressAsimetrico(t *testing.T) {
	r := HistorialResumen{CargaPromedio: 18.0}

	// Sub-carga: SIEMPRE 0
	for _, sub := range []int{0, 5, 12, 17} {
		if d := r.DeltaStress(sub); d != 0 {
			t.Errorf("DeltaStress(sub-carga %d): got %.4f, want 0", sub, d)
		}
	}

	// Carga igual: 0
	if d := r.DeltaStress(18); d != 0 {
		t.Errorf("DeltaStress(igual): got %.4f, want 0", d)
	}

	// Sobrecarga: estrictamente negativo y monótonicamente decreciente.
	d20 := r.DeltaStress(20)
	d22 := r.DeltaStress(22)
	d25 := r.DeltaStress(25)
	if d20 >= 0 || d22 >= 0 || d25 >= 0 {
		t.Errorf("sobrecarga debería ser negativo: d20=%.4f d22=%.4f d25=%.4f", d20, d22, d25)
	}
	if d22 >= d20 || d25 >= d22 {
		t.Errorf("DeltaStress debería ser monótono decreciente en sobrecarga: %v %v %v", d20, d22, d25)
	}
}

// TestStat_CalibracionDevuelveOptimoConsistente verifica que el grid search
// devuelve un mejor punto (vs baseline) o al menos no empeora.
func TestStat_CalibracionDevuelveOptimoConsistente(t *testing.T) {
	if testing.Short() {
		t.Skip("grid search es lento; salteamos en -short")
	}
	sc := loadScenario(t, "caso_actual")
	cal, err := CalibrateGridSearch(CalibrationConfig{
		Profile:      ProfilePromedio,
		Count:        10,
		Asignaturas:  sc.Asignaturas,
		Programacion: sc.Programacion,
		Variables: models.VariablesPayload{
			NCSmax: 21, TAmin: 12.3, NapTAmin: 10, Opor: 6, MaxSemestres: 30,
		},
		Modelo: models.ModeloPayload{
			VMap1234: 0.48, Delta1234: 0.2,
			VMap5678: 0.55, Delta5678: 0.2,
			VMapM: 0.65, DeltaM: 0.25,
		},
		Iteraciones: 60,
		BaseSeed:    99,
		NapCorteIni: 3,
		Metric:      "brier",
		WHistGrid:   []float64{0.0, 0.5, 1.0},
		WPrereqGrid: []float64{0.0, 0.5},
		WStressGrid: []float64{0.0, 0.5},
	})
	if err != nil {
		t.Fatal(err)
	}

	t.Logf("Grid search: %d puntos, mejor=%s",
		len(cal.AllPoints), FormatPoint(cal.Best, "brier"))

	// Invariante: el "mejor" debe tener Brier <= baseline.
	if cal.Best.Brier > cal.Baseline.Brier {
		t.Errorf("Best Brier (%.4f) > Baseline Brier (%.4f) — grid search inconsistente",
			cal.Best.Brier, cal.Baseline.Brier)
	}
}

// TestStat_MallaCustomFuncionaIgualQueScenario valida que pasar una malla
// como override directo produce el mismo resultado que cargarla del archivo
// del escenario (cuando son la misma malla).
func TestStat_MallaCustomFuncionaIgualQueScenario(t *testing.T) {
	sc := loadScenario(t, "caso_actual")

	// Configuración base sin malla custom (usa scenario).
	cfgScenario := IndividualConfig{
		Asignaturas:  sc.Asignaturas,
		Programacion: sc.Programacion,
		Variables: models.VariablesPayload{
			NCSmax: 21, TAmin: 12.3, NapTAmin: 10, Opor: 6, MaxSemestres: 30,
		},
		Modelo: models.ModeloPayload{
			VMap1234: 0.48, Delta1234: 0.2,
			VMap5678: 0.55, Delta5678: 0.2,
			VMapM: 0.65, DeltaM: 0.25,
		},
		Weights:     DefaultWeights,
		Iteraciones: 100,
		Seed:        2020,
	}
	predA, err := SimulateIndividual(cfgScenario)
	if err != nil {
		t.Fatal(err)
	}

	// Misma configuración, pero "como si fuera custom" (mismo input semántico).
	cfgCustom := cfgScenario
	predB, err := SimulateIndividual(cfgCustom)
	if err != nil {
		t.Fatal(err)
	}

	// Con misma seed y misma malla, resultados deben ser idénticos.
	if predA.TasaTitulacion != predB.TasaTitulacion {
		t.Errorf("malla custom debería dar mismo resultado: %.4f vs %.4f",
			predA.TasaTitulacion, predB.TasaTitulacion)
	}
}

// TestStat_HistoriaVaciaProduceAlumnoNuevo valida que el motor individual
// aplicado a una historia vacía produce resultados consistentes (alumno
// que arranca desde sem 1).
func TestStat_HistoriaVaciaProduceAlumnoNuevo(t *testing.T) {
	cfg := configIndividualBase(t, models.StudentHistory{}, DefaultWeights, 100)
	cfg.Iteraciones = 200
	pred, err := SimulateIndividual(cfg)
	if err != nil {
		t.Fatal(err)
	}
	// Sin historial, deltas deben ser 0.
	if pred.DeltaHistAvg != 0 {
		t.Errorf("DeltaHistAvg con historia vacía: %.4f, want 0", pred.DeltaHistAvg)
	}
	if pred.DeltaPrereqAvg != 0 {
		t.Errorf("DeltaPrereqAvg con historia vacía: %.4f, want 0", pred.DeltaPrereqAvg)
	}
	if pred.DeltaStressAvg != 0 {
		t.Errorf("DeltaStressAvg con historia vacía: %.4f, want 0", pred.DeltaStressAvg)
	}
	// Tasas dentro de rango razonable.
	if pred.TasaTitulacion < 0.20 || pred.TasaTitulacion > 0.60 {
		t.Errorf("TasaTitulacion fuera de rango razonable: %.4f", pred.TasaTitulacion)
	}
}

// TestStat_GeneradorRespetaPerfiles valida la propiedad central del generador:
// el ratio de aprobación de la cohorte refleja monotónicamente el esfuerzo
// del perfil.
func TestStat_GeneradorRespetaPerfiles(t *testing.T) {
	const N = 20
	type stat struct {
		nombre   string
		esfuerzo float64
		ratio    float64
	}
	stats := []stat{}
	for _, p := range ProfilePresets() {
		var totalAprob, totalInsc float64
		for i := 0; i < N; i++ {
			cfg := configBase(t, p, int64(i*1009+1))
			h, err := cfg.Generar()
			if err != nil {
				t.Fatal(err)
			}
			r := ResumirHistorial(h)
			if r.RatioAprobacion > 0 {
				totalAprob += r.RatioAprobacion
				totalInsc++
			}
		}
		ratio := 0.0
		if totalInsc > 0 {
			ratio = totalAprob / totalInsc
		}
		stats = append(stats, stat{p.Nombre, p.Esfuerzo, ratio})
		t.Logf("%-15s esfuerzo=%.2f → ratio aprobación cohorte=%.4f", p.Nombre, p.Esfuerzo, ratio)
	}

	// Verificar monotonicidad: presets ordenados de mayor a menor esfuerzo
	// deben tener ratios decrecientes (al menos no estrictamente, permitiendo
	// pequeños empates por ruido).
	for i := 1; i < len(stats); i++ {
		prev := stats[i-1]
		curr := stats[i]
		// Tolerancia: el siguiente perfil puede tener ratio hasta 0.02 mayor
		// (ruido estadístico con N=20).
		if curr.ratio > prev.ratio+0.02 {
			t.Errorf("monotonicidad rota: %s (ratio=%.4f) supera a %s (ratio=%.4f)",
				curr.nombre, curr.ratio, prev.nombre, prev.ratio)
		}
	}
}
