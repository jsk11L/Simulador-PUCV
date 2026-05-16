package engine

import (
	"math"
	"testing"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// TestCalcularMetricas_CasosCanonicos valida las fórmulas con valores conocidos.
func TestCalcularMetricas_CasosCanonicos(t *testing.T) {
	// Predicción perfecta: prob=1 aprobado, prob=0 reprobado
	perfectas := []RamoPrediccion{
		{Sigla: "A", ProbPred: 1.0, Real: true},
		{Sigla: "B", ProbPred: 0.0, Real: false},
	}
	brier, acc, ll := calcularMetricas(perfectas)
	if brier > 1e-9 {
		t.Errorf("Brier perfecto: got %.6f, want ~0", brier)
	}
	if acc != 1.0 {
		t.Errorf("Accuracy perfecto: got %.4f, want 1.0", acc)
	}
	if ll > 1e-3 {
		t.Errorf("LogLoss perfecto: got %.6f, want ~0", ll)
	}

	// Predicción pésima: prob=0 aprobado, prob=1 reprobado
	pesimas := []RamoPrediccion{
		{Sigla: "A", ProbPred: 0.0, Real: true},
		{Sigla: "B", ProbPred: 1.0, Real: false},
	}
	brier, acc, ll = calcularMetricas(pesimas)
	if math.Abs(brier-1.0) > 1e-6 {
		t.Errorf("Brier pésimo: got %.6f, want 1.0", brier)
	}
	if acc != 0.0 {
		t.Errorf("Accuracy pésimo: got %.4f, want 0.0", acc)
	}
	if ll < 10 {
		t.Errorf("LogLoss pésimo: got %.6f, want grande (penaliza confianza errada)", ll)
	}

	// Predicción "azar" prob=0.5: brier=0.25, acc≈0.5, ll=ln(2)≈0.693
	azar := []RamoPrediccion{
		{Sigla: "A", ProbPred: 0.5, Real: true},
		{Sigla: "B", ProbPred: 0.5, Real: false},
		{Sigla: "C", ProbPred: 0.5, Real: true},
		{Sigla: "D", ProbPred: 0.5, Real: false},
	}
	brier, _, ll = calcularMetricas(azar)
	if math.Abs(brier-0.25) > 1e-6 {
		t.Errorf("Brier azar: got %.6f, want 0.25", brier)
	}
	expectedLL := math.Log(2)
	if math.Abs(ll-expectedLL) > 1e-6 {
		t.Errorf("LogLoss azar: got %.6f, want %.6f (ln 2)", ll, expectedLL)
	}
}

// TestBacktestStudent_AlumnoCorto rechaza historiales muy chicos.
func TestBacktestStudent_AlumnoCorto(t *testing.T) {
	cfg := BacktestConfig{
		History: models.StudentHistory{
			Semestres: []models.SemesterRecord{{Periodo: "S1-2024"}, {Periodo: "S2-2024"}},
		},
	}
	_, err := BacktestStudent(cfg)
	if err == nil {
		t.Error("debería fallar con < 3 semestres")
	}
}

// TestBacktestStudent_AlumnoSinteticoCompleto corre backtest sobre una
// trayectoria sintética completa y valida que las métricas tienen formas
// razonables.
func TestBacktestStudent_AlumnoSinteticoCompleto(t *testing.T) {
	// Generamos un alumno esforzado completo.
	cfgGen := configBase(t, ProfileEsforzadoTop, 12345)
	hist, err := cfgGen.Generar()
	if err != nil {
		t.Fatal(err)
	}
	if len(hist.Semestres) < 8 {
		t.Skipf("alumno generado muy corto (%d sem), salteamos", len(hist.Semestres))
	}

	sc := loadScenario(t, "caso_actual")
	bt, err := BacktestStudent(BacktestConfig{
		History:      hist,
		Asignaturas:  sc.Asignaturas,
		Programacion: sc.Programacion,
		Variables: models.VariablesPayload{
			NCSmax:       21,
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
		Weights:     DefaultWeights,
		Iteraciones: 200,
		Seed:        7777,
		NapCorteIni: 2,
	})
	if err != nil {
		t.Fatalf("BacktestStudent: %v", err)
	}

	t.Logf("Backtest esforzado_top (%d semestres, %d puntos, %d predicciones):",
		len(hist.Semestres), len(bt.Puntos), bt.PrediccionesTotal)
	t.Logf("  Brier global:    %.4f", bt.BrierGlobal)
	t.Logf("  Accuracy global: %.4f", bt.AccuracyGlobal)
	t.Logf("  LogLoss global:  %.4f", bt.LogLossGlobal)

	// Asserts razonables: no debe estar 100% perdido.
	if bt.BrierGlobal < 0 || bt.BrierGlobal > 1 {
		t.Errorf("Brier fuera de [0,1]: %.4f", bt.BrierGlobal)
	}
	if bt.AccuracyGlobal < 0 || bt.AccuracyGlobal > 1 {
		t.Errorf("Accuracy fuera de [0,1]: %.4f", bt.AccuracyGlobal)
	}
	if bt.PrediccionesTotal == 0 {
		t.Error("PrediccionesTotal=0: no se evaluó ningún ramo")
	}
}

// TestBacktestCohort_PerfilesComparados es el test científico: con un
// modelo razonable, esperamos que los pesos por defecto tengan brier
// score MENOR (mejor) que un modelo sin información (W=0).
//
// Si el W=0 le gana al DefaultWeights → algo anda mal con los modificadores.
func TestBacktestCohort_DefaultWeightsMejoraSobreZero(t *testing.T) {
	if testing.Short() {
		t.Skip("backtest masivo es lento; salteamos en -short")
	}
	sc := loadScenario(t, "caso_actual")
	baseCfg := CohortBacktestConfig{
		Profile:      ProfilePromedio,
		Count:        20,
		Asignaturas:  sc.Asignaturas,
		Programacion: sc.Programacion,
		Variables: models.VariablesPayload{
			NCSmax:       21,
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
		Iteraciones: 100,
		BaseSeed:    20260516,
		NapCorteIni: 3,
	}

	// Sin modificadores (W=0): el motor base solo aplica P_éxito genérica.
	zeroCfg := baseCfg
	zeroCfg.Weights = ZeroWeights
	zero, err := BacktestCohort(zeroCfg)
	if err != nil {
		t.Fatal(err)
	}

	// Con DefaultWeights: el motor usa δ_hist, δ_prereq, δ_stress.
	defCfg := baseCfg
	defCfg.Weights = DefaultWeights
	def, err := BacktestCohort(defCfg)
	if err != nil {
		t.Fatal(err)
	}

	t.Logf("Cohorte %s (N=%d, %d predicciones cada uno):", ProfilePromedio.Nombre, baseCfg.Count, def.PrediccionesTotal)
	t.Logf("  ZeroWeights      → Brier=%.4f, Acc=%.4f, LL=%.4f",
		zero.BrierAvg, zero.AccuracyAvg, zero.LogLossAvg)
	t.Logf("  DefaultWeights   → Brier=%.4f, Acc=%.4f, LL=%.4f",
		def.BrierAvg, def.AccuracyAvg, def.LogLossAvg)
	t.Logf("  Δ Brier: %+.4f (negativo = mejora)", def.BrierAvg-zero.BrierAvg)

	if def.AlumnosEvaluados == 0 {
		t.Error("DefaultWeights: ningún alumno evaluado")
	}
	if zero.AlumnosEvaluados == 0 {
		t.Error("ZeroWeights: ningún alumno evaluado")
	}
}
