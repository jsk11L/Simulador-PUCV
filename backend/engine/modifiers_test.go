package engine

import (
	"math"
	"os"
	"path/filepath"
	"testing"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// TestResumirHistorial_AlumnoReal valida que el resumen del historial del
// alumno real (Javier Sepúlveda, ICI) refleja sus datos correctamente.
func TestResumirHistorial_AlumnoReal(t *testing.T) {
	f, err := os.Open(filepath.Join("testdata", "cursos_inscritos_sample.csv"))
	if err != nil {
		t.Fatalf("abrir CSV: %v", err)
	}
	defer f.Close()
	h, err := ParseStudentCSV(f)
	if err != nil {
		t.Fatalf("parsear: %v", err)
	}
	r := ResumirHistorial(h)

	// ResumirHistorial excluye cursos en_curso (sin nota final aún).
	// El alumno real tiene 3 ramos S1-2026 en_curso que no entran al denominador.
	// Ratio efectivo (sobre lo terminado): 157/164 ≈ 0.957.
	if r.RatioAprobacion < 0.93 || r.RatioAprobacion > 0.98 {
		t.Errorf("RatioAprobacion fuera de rango: %.4f (esperado 0.93-0.98)", r.RatioAprobacion)
	}
	// Carga promedio del alumno real ~19 créditos (alta).
	if r.CargaPromedio < 17 || r.CargaPromedio > 22 {
		t.Errorf("CargaPromedio fuera de rango: %.2f (esperado 17-22)", r.CargaPromedio)
	}
	// Debe tener notas registradas para los ramos aprobados.
	if len(r.NotasAprobado) < 30 {
		t.Errorf("NotasAprobado tiene solo %d entradas (esperado al menos 30)", len(r.NotasAprobado))
	}
	if nota, ok := r.NotasAprobado["ICI2240"]; !ok || nota != 7.0 {
		t.Errorf("ICI2240 (Estructura de Datos): esperado nota 7.0, got %.1f (ok=%v)", nota, ok)
	}
}

// TestDeltaHist_DiscriminaPerfiles compara cohortes sintéticas: el δ_hist
// de un esforzado debe ser claramente mayor al de uno en problemas.
//
// La trayectoria corre completa (sin UntilSemestre); cortar antes sesga la
// señal porque en los primeros semestres todos los perfiles muestran ratios
// altos — la diferencia se acumula en las trayectorias largas, donde los
// débiles enfrentan ramos avanzados.
func TestDeltaHist_DiscriminaPerfiles(t *testing.T) {
	const N = 30
	var sumEsforzado, sumProblemas float64
	for i := 0; i < N; i++ {
		cfg := configBase(t, ProfileEsforzadoTop, int64(i*7919+1))
		h, err := cfg.Generar()
		if err != nil {
			t.Fatal(err)
		}
		sumEsforzado += ResumirHistorial(h).DeltaHist()

		cfg2 := configBase(t, ProfileEnProblemas, int64(i*7919+1))
		h2, err := cfg2.Generar()
		if err != nil {
			t.Fatal(err)
		}
		sumProblemas += ResumirHistorial(h2).DeltaHist()
	}
	avgEsf := sumEsforzado / float64(N)
	avgProb := sumProblemas / float64(N)
	t.Logf("δ_hist promedio esforzado_top: %+.4f", avgEsf)
	t.Logf("δ_hist promedio en_problemas:  %+.4f", avgProb)

	// Discriminación mínima: 0.05 puntos de diferencia.
	// Threshold relajado vs versión anterior porque la fórmula nueva
	// satura con tanh — la diferencia entre ratios altos se comprime.
	if avgEsf-avgProb < 0.05 {
		t.Errorf("δ_hist no discrimina: esforzado=%.4f, problemas=%.4f, Δ=%.4f (min 0.05)",
			avgEsf, avgProb, avgEsf-avgProb)
	}
	if avgEsf < 0.15 {
		t.Errorf("δ_hist esforzado debería ser >= 0.15, fue %.4f", avgEsf)
	}
}

// TestDeltaPrereq verifica los tres casos: sin reqs, con reqs aprobados
// con nota alta, con reqs aprobados con nota baja.
func TestDeltaPrereq(t *testing.T) {
	r := HistorialResumen{
		NotasAprobado: map[string]float64{
			"MAT1001": 6.5,
			"MAT1002": 4.1,
			"FIS1002": 5.0,
		},
	}

	// Sin reqs → 0
	if d := r.DeltaPrereq(nil); d != 0 {
		t.Errorf("DeltaPrereq nil reqs: got %.2f, want 0", d)
	}
	if d := r.DeltaPrereq([]string{}); d != 0 {
		t.Errorf("DeltaPrereq vacío: got %.2f, want 0", d)
	}

	// Reqs con nota alta → delta positivo
	d := r.DeltaPrereq([]string{"MAT1001"})
	expected := (6.5 - 5.0) / 2.0
	if math.Abs(d-expected) > 0.001 {
		t.Errorf("DeltaPrereq MAT1001=6.5: got %.4f, want %.4f", d, expected)
	}

	// Reqs con nota baja → delta negativo
	d = r.DeltaPrereq([]string{"MAT1002"})
	expected = (4.1 - 5.0) / 2.0
	if math.Abs(d-expected) > 0.001 {
		t.Errorf("DeltaPrereq MAT1002=4.1: got %.4f, want %.4f", d, expected)
	}

	// Promedio de dos
	d = r.DeltaPrereq([]string{"MAT1001", "MAT1002"})
	expected = ((6.5+4.1)/2 - 5.0) / 2.0
	if math.Abs(d-expected) > 0.001 {
		t.Errorf("DeltaPrereq promedio: got %.4f, want %.4f", d, expected)
	}

	// Req inexistente en historial → se ignora
	d = r.DeltaPrereq([]string{"MAT1001", "INEXISTENTE"})
	expected = (6.5 - 5.0) / 2.0
	if math.Abs(d-expected) > 0.001 {
		t.Errorf("DeltaPrereq con inexistente: got %.4f, want %.4f (solo MAT1001 cuenta)", d, expected)
	}
}

// TestDeltaStress verifica el comportamiento ASIMÉTRICO: la fórmula nueva
// solo penaliza sobrecarga, no bonifica reducir carga.
func TestDeltaStress(t *testing.T) {
	r := HistorialResumen{CargaPromedio: 18.0}

	// Carga actual igual a histórica → 0
	if d := r.DeltaStress(18); math.Abs(d) > 0.001 {
		t.Errorf("DeltaStress carga igual: got %.4f, want 0", d)
	}

	// Carga actual mayor → penalización proporcional a (hist - actual)/6
	d := r.DeltaStress(24)
	expected := (18.0 - 24.0) / 6.0 // = -1.0
	if math.Abs(d-expected) > 0.001 {
		t.Errorf("DeltaStress sobrecarga (24 vs 18): got %.4f, want %.4f", d, expected)
	}

	// Carga actual MENOR → ahora SIEMPRE 0 (no bonus por reducir).
	d = r.DeltaStress(12)
	if d != 0 {
		t.Errorf("DeltaStress submarga (12 vs 18): got %.4f, want 0 (asimétrico)", d)
	}

	// Sobrecarga moderada (3 créditos): -0.5
	d = r.DeltaStress(21)
	expected = (18.0 - 21.0) / 6.0 // = -0.5
	if math.Abs(d-expected) > 0.001 {
		t.Errorf("DeltaStress sobrecarga (21 vs 18): got %.4f, want %.4f", d, expected)
	}

	// Sin historial → 0
	r2 := HistorialResumen{}
	if d := r2.DeltaStress(20); d != 0 {
		t.Errorf("DeltaStress sin historial: got %.4f, want 0", d)
	}
}

// TestApplyWeights_Clamp valida que el resultado queda en [0, 1] aunque
// la combinación lineal lo saque del rango.
func TestApplyWeights_Clamp(t *testing.T) {
	w := Weights{WHist: 10, WPrereq: 10, WStress: 10}

	// Pesos altos con deltas positivos → saturaría arriba sin clamp.
	d := ApplyWeights(0.5, w, 0.5, 0.5, 0.5)
	if d != 1.0 {
		t.Errorf("clamp superior: got %.4f, want 1.0", d)
	}

	// Pesos altos con deltas negativos → saturaría abajo sin clamp.
	d = ApplyWeights(0.5, w, -0.5, -0.5, -0.5)
	if d != 0.0 {
		t.Errorf("clamp inferior: got %.4f, want 0.0", d)
	}
}

// TestApplyWeights_PesosCero verifica el invariante crítico para Sprint 4:
// con todos los pesos en 0, P_din = P_éxito exactamente.
func TestApplyWeights_PesosCero(t *testing.T) {
	for _, p := range []float64{0.0, 0.3, 0.5, 0.7, 1.0} {
		got := ApplyWeights(p, ZeroWeights, 0.5, 0.5, 0.5)
		if math.Abs(got-p) > 1e-9 {
			t.Errorf("ApplyWeights(%v, zero, ...): got %v, want %v", p, got, p)
		}
	}
}

// TestApplyWeights_DeltasCero también: deltas en 0 → no aporta nada.
func TestApplyWeights_DeltasCero(t *testing.T) {
	w := DefaultWeights
	for _, p := range []float64{0.0, 0.4, 0.6, 1.0} {
		got := ApplyWeights(p, w, 0, 0, 0)
		if math.Abs(got-p) > 1e-9 {
			t.Errorf("ApplyWeights(%v, default, 0,0,0): got %v, want %v", p, got, p)
		}
	}
}

// TestResumirHistorial_HistorialVacio asegura que no entra en pánico
// con historial vacío.
func TestResumirHistorial_HistorialVacio(t *testing.T) {
	h := models.StudentHistory{}
	r := ResumirHistorial(h)
	if r.RatioAprobacion != 0 || r.CargaPromedio != 0 {
		t.Errorf("ResumirHistorial vacío: %+v", r)
	}
	if r.DeltaHist() != 0 {
		t.Error("DeltaHist debe ser 0 con historial vacío")
	}
	if r.DeltaPrereq([]string{"X"}) != 0 {
		t.Error("DeltaPrereq debe ser 0 con historial vacío")
	}
	if r.DeltaStress(15) != 0 {
		t.Error("DeltaStress debe ser 0 con historial vacío")
	}
}
