package engine

import (
	"math"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// ==========================================
// MODIFICADORES δ — PROBABILIDAD INDIVIDUALIZADA
// ==========================================
// La probabilidad de éxito que entrega el motor base es genérica (igual para
// cualquier alumno). Los modificadores transforman esa probabilidad en una
// probabilidad individualizada (P_din) usando tres señales extraídas del
// historial real del alumno:
//
//   δ_hist  : proxy de "esfuerzo/capacidad" — ratio histórico de aprobación.
//   δ_prereq: proxy de "base de conocimiento" — notas de los prereqs aprobados.
//   δ_stress: proxy de "estrés" — sobrecarga respecto a su carga habitual.
//
// Fórmula:
//
//   P_din = clamp(P_éxito_motor + W_hist·δ_hist + W_prereq·δ_prereq + W_stress·δ_stress, 0, 1)
//
// Los pesos W son CONFIGURABLES — esa es la variable que el framework de
// backtesting (Sprint 6) va a calibrar empíricamente.

// Weights agrupa los pesos por delta. Son calibrables y deben mantenerse
// en rangos moderados (típicamente [0, 2]) para que ningún modificador
// domine las probabilidades base.
type Weights struct {
	WHist   float64 `json:"w_hist"`
	WPrereq float64 `json:"w_prereq"`
	WStress float64 `json:"w_stress"`
}

// DefaultWeights es un compromiso robusto basado en grid search con las
// fórmulas refinadas (tanh saturado para δ_hist, asimétrico para δ_stress).
//
// Hallazgos de calibración (caso_actual, N=20-30 alumnos por perfil):
//   - promedio:     mejor W(0.0, 0.5, 1.00) Brier 0.1954 (baseline 0.1962)
//   - esforzado:    mejor W(0.0, 0.0, 1.00) Brier 0.1273 (= baseline)
//   - en_problemas: mejor W(0.0, 0.5, 0.25) Brier 0.3341 (baseline 0.3401)
//
// El compromiso W(0.0, 0.5, 0.5) cubre razonablemente los tres perfiles
// sin ser óptimo para ninguno, dando mejora consistente sobre baseline.
//
// W_hist sigue en 0 porque el generador sintético no produce trayectorias
// donde el ratio histórico discrimine fuertemente más allá de lo que ya
// captura P_motor. Con datos reales este peso DEBE recalibrarse: el motor
// expone CalibrateGridSearch para ese fin.
var DefaultWeights = Weights{
	WHist:   0.0,
	WPrereq: 0.5,
	WStress: 0.5,
}

// ZeroWeights anula los modificadores (P_din = P_base). Útil para tests
// que validan que el motor individual con W=0 produce mismos resultados
// que el motor base.
var ZeroWeights = Weights{}

// HistorialResumen es un agregado del historial del alumno calculado UNA
// vez al inicio de la simulación. Se reutiliza por cada ramo evaluado.
type HistorialResumen struct {
	RatioAprobacion float64            // créd. aprobados / créd. inscritos
	CargaPromedio   float64            // créd. inscritos / cant. semestres cursados
	NotasAprobado   map[string]float64 // sigla → nota más reciente del ramo aprobado
}

// ResumirHistorial extrae los agregados estadísticos del historial del
// alumno. Cursos en estado "en_curso" o "abandonado" se ignoran (sin nota
// final relevante para el modelo).
func ResumirHistorial(h models.StudentHistory) HistorialResumen {
	resumen := HistorialResumen{
		NotasAprobado: make(map[string]float64),
	}
	if len(h.Semestres) == 0 {
		return resumen
	}

	totalInscritos := 0
	totalAprobados := 0
	semestresCursados := 0

	for _, sem := range h.Semestres {
		if len(sem.Cursos) == 0 {
			continue
		}
		semestresCursados++
		for _, c := range sem.Cursos {
			// Solo cursos con desenlace contable (aprobado o reprobado).
			if c.Estado != models.SubjectAprobado && c.Estado != models.SubjectReprobado {
				continue
			}
			totalInscritos += c.Creditos
			if c.Estado == models.SubjectAprobado {
				totalAprobados += c.Creditos
				resumen.NotasAprobado[c.Sigla] = c.Nota
			}
		}
	}

	if totalInscritos > 0 {
		resumen.RatioAprobacion = float64(totalAprobados) / float64(totalInscritos)
	}
	if semestresCursados > 0 {
		resumen.CargaPromedio = float64(totalInscritos) / float64(semestresCursados)
	}
	return resumen
}

// DeltaHist devuelve el modificador por esfuerzo histórico, con saturación
// suave vía tanh.
//
//	δ_hist = 0.30 · tanh(3 · (ratio − 0.5))
//
// Rango: [−0.30, +0.30]. Pasos típicos:
//   - ratio = 0.95 → +0.286
//   - ratio = 0.80 → +0.245
//   - ratio = 0.65 → +0.135
//   - ratio = 0.50 → 0.000
//   - ratio = 0.35 → −0.135
//   - ratio = 0.20 → −0.245
//
// La saturación evita que un alumno con ratio 0.9 dé un bonus enorme y
// otro con 0.7 uno mediocre: ambos son "buenos alumnos" y el modelo no
// debería sesgarse demasiado hacia uno u otro.
//
// Si no hay historial (alumno nuevo), devuelve 0.
func (r HistorialResumen) DeltaHist() float64 {
	if r.RatioAprobacion == 0 {
		return 0
	}
	return 0.30 * math.Tanh(3.0*(r.RatioAprobacion-0.5))
}

// DeltaPrereq devuelve el modificador por base de conocimiento, basado en
// las notas con las que el alumno aprobó los prerrequisitos del ramo que
// se intenta cursar.
//
//	(promedio_nota_prereqs − 5.0) / 2.0
//
// Rango aproximado: [−1.5, +1.0].
//   - Aprobó prereqs con 6.5 promedio → +0.75 (favorece)
//   - Aprobó prereqs con 5.0 promedio → 0
//   - Aprobó prereqs con 4.0 a duras penas → −0.50 (penaliza)
//
// Si el ramo no tiene prereqs o el alumno no los aprobó (no debería
// inscribirse, pero blindamos), devuelve 0.
func (r HistorialResumen) DeltaPrereq(reqs []string) float64 {
	if len(reqs) == 0 {
		return 0
	}
	suma := 0.0
	n := 0
	for _, sigla := range reqs {
		if sigla == "" {
			continue
		}
		nota, ok := r.NotasAprobado[sigla]
		if !ok {
			continue
		}
		suma += nota
		n++
	}
	if n == 0 {
		return 0
	}
	prom := suma / float64(n)
	return (prom - 5.0) / 2.0
}

// DeltaStress devuelve el modificador por sobrecarga académica.
// Asimétrico: solo penaliza, no bonifica.
//
//	diff = carga_histórica − carga_actual
//	δ_stress = min(0, diff / 6.0)
//
// Si la carga actual SUPERA la histórica → delta negativo proporcional al
// exceso (penaliza fuera de zona de confort).
// Si la carga actual es IGUAL o MENOR → delta = 0 (no premia al alumno
// conservador, porque reducir carga no implica más probabilidad de aprobar).
//
// Rango efectivo: [−2.0, 0]. El divisor 6 hace que un exceso de 6 créditos
// (por ejemplo cargar 24 cuando históricamente cargaba 18) dé δ=−1.0.
//
// El cambio de fórmula vs versión anterior: la versión previa era simétrica
// y bonificaba reducir carga, lo que sesgaba las predicciones a "más probable
// aprobar cuando cargas poco" — pero un alumno que carga poco no
// necesariamente aprueba sus pocos ramos con mayor probabilidad.
func (r HistorialResumen) DeltaStress(cargaActual int) float64 {
	if r.CargaPromedio == 0 {
		return 0
	}
	diff := r.CargaPromedio - float64(cargaActual)
	if diff >= 0 {
		return 0
	}
	return diff / 6.0
}

// ApplyWeights combina P_éxito con los deltas según los pesos configurados
// y mantiene el resultado dentro de [0, 1].
func ApplyWeights(pExito float64, w Weights, dHist, dPrereq, dStress float64) float64 {
	pDin := pExito + w.WHist*dHist + w.WPrereq*dPrereq + w.WStress*dStress
	return math.Max(0, math.Min(1, pDin))
}
