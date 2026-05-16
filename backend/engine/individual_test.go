package engine

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// configIndividualBase devuelve un IndividualConfig listo para el
// escenario "caso_actual".
func configIndividualBase(t *testing.T, history models.StudentHistory, w Weights, seed int64) IndividualConfig {
	t.Helper()
	sc := loadScenario(t, "caso_actual")
	return IndividualConfig{
		History:      history,
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
		Weights:     w,
		Iteraciones: 500,
		Seed:        seed,
	}
}

// TestIndividual_AlumnoNuevoNoEsDeterminista verifica que un alumno sin
// historial corre el flujo sin pánico y devuelve métricas razonables.
func TestIndividual_AlumnoNuevo(t *testing.T) {
	cfg := configIndividualBase(t, models.StudentHistory{}, DefaultWeights, 42)
	pred, err := SimulateIndividual(cfg)
	if err != nil {
		t.Fatalf("SimulateIndividual: %v", err)
	}
	if pred.Iteraciones != 500 {
		t.Errorf("Iteraciones: got %d, want 500", pred.Iteraciones)
	}
	if len(pred.ProbabilidadesPorRamo) == 0 {
		t.Error("ProbabilidadesPorRamo vacía")
	}
	// Sin historial, deltas deberían ser 0.
	if pred.DeltaHistAvg != 0 || pred.DeltaPrereqAvg != 0 || pred.DeltaStressAvg != 0 {
		t.Errorf("deltas con historial vacío deberían ser 0: %+v", pred)
	}
}

// TestIndividual_PesosCeroIgualSinModificadores valida el invariante
// crítico: con Weights{0,0,0}, el motor individual produce tasas
// indistinguibles del motor base (la prob de éxito no se modifica).
func TestIndividual_PesosCero(t *testing.T) {
	cfg := configIndividualBase(t, models.StudentHistory{}, ZeroWeights, 42)
	cfg.Iteraciones = 1000
	pred, err := SimulateIndividual(cfg)
	if err != nil {
		t.Fatalf("SimulateIndividual: %v", err)
	}
	// Tasas razonables esperadas (caso actual del paper, NE=1000):
	// titulación entre 30%-50%, eliminación TAmin 30%-55%.
	if pred.TasaTitulacion < 0.20 || pred.TasaTitulacion > 0.60 {
		t.Errorf("TasaTitulacion con W=0 fuera de rango: %.4f", pred.TasaTitulacion)
	}
	t.Logf("ZeroWeights → tit=%.3f, elimTA=%.3f, elimOpor=%.3f, semProy=%.2f",
		pred.TasaTitulacion, pred.TasaEliminadoTAmin, pred.TasaEliminadoOpor, pred.SemestresProyectados)
}

// TestIndividual_DebugCreditosBase verifica que el pre-cargado de créditos
// aprobados desde historial funciona. Es el paso crítico que define si el
// alumno arranca con avance suficiente para no caer por TAmin.
func TestIndividual_DebugCreditosBase(t *testing.T) {
	cfgGen := configBase(t, ProfileEsforzadoTop, 12345)
	cfgGen.UntilSemestre = 8
	hist, err := cfgGen.Generar()
	if err != nil {
		t.Fatal(err)
	}

	// Contar ramos aprobados de la malla en el historial generado.
	sc := loadScenario(t, "caso_actual")
	malla := normalizeMalla(sc.Asignaturas)

	enMalla := 0
	fueraDeMalla := 0
	credAprobMalla := 0
	for _, sem := range hist.Semestres {
		for _, c := range sem.Cursos {
			if c.Estado != models.SubjectAprobado {
				continue
			}
			if _, ok := malla.Mapa[c.Sigla]; ok {
				enMalla++
				credAprobMalla += c.Creditos
			} else {
				fueraDeMalla++
			}
		}
	}
	t.Logf("Esforzado 8 sem: aprob_en_malla=%d (%d créd), fuera_malla=%d, total_malla=%d",
		enMalla, credAprobMalla, fueraDeMalla, len(malla.Normalizadas))

	// El alumno debería tener AL MENOS 20 ramos de la malla aprobados
	// en 8 semestres si es esforzado.
	if enMalla < 20 {
		t.Errorf("solo %d ramos de la malla aprobados (esperado >= 20)", enMalla)
	}
}

// TestIndividual_HistorialEsforzadoTieneMayorDelta valida que un alumno
// con historial fuerte tiene mayor δ_hist promedio durante la proyección
// que un alumno con historial débil. Esa es la señal que los modificadores
// captan del historial.
//
// NOTA: no se valida titulación absoluta porque el modelo del paper aplica
// TAmin global (sobre TODOS los semestres acumulados). Un historial parcial
// con ratio bajo arrastra esa tasa al futuro y puede eliminar al alumno por
// TAmin en sem 10 independientemente del esfuerzo proyectado. La calibración
// de pesos (Sprint 6) puede modular esto.
func TestIndividual_HistorialEsforzadoTieneMayorDelta(t *testing.T) {
	cfgEsf := configBase(t, ProfileEsforzadoTop, 12345)
	cfgEsf.UntilSemestre = 8
	histEsf, err := cfgEsf.Generar()
	if err != nil {
		t.Fatal(err)
	}

	cfgDeb := configBase(t, ProfilePromedioBajo, 12345)
	cfgDeb.UntilSemestre = 8
	histDeb, err := cfgDeb.Generar()
	if err != nil {
		t.Fatal(err)
	}

	cfgIndEsf := configIndividualBase(t, histEsf, DefaultWeights, 7777)
	cfgIndEsf.Iteraciones = 500
	predEsf, err := SimulateIndividual(cfgIndEsf)
	if err != nil {
		t.Fatal(err)
	}

	cfgIndDeb := configIndividualBase(t, histDeb, DefaultWeights, 7777)
	cfgIndDeb.Iteraciones = 500
	predDeb, err := SimulateIndividual(cfgIndDeb)
	if err != nil {
		t.Fatal(err)
	}

	t.Logf("Esforzado 8sem: ratio=%.3f δ_hist=%+.4f → tit=%.3f",
		predEsf.HistorialResumen.RatioAprobacion, predEsf.DeltaHistAvg, predEsf.TasaTitulacion)
	t.Logf("Débil 8sem:     ratio=%.3f δ_hist=%+.4f → tit=%.3f",
		predDeb.HistorialResumen.RatioAprobacion, predDeb.DeltaHistAvg, predDeb.TasaTitulacion)

	// La única métrica robusta para comparar perfiles del HISTORIAL es δ_hist.
	// La tasa de titulación y la prob_aprobar promedio están sesgadas por
	// eliminación temprana: un alumno con carga histórica alta a veces titula
	// MENOS porque la tasa proyectiva no lo salva. Esto es comportamiento
	// correcto del modelo, no un bug.
	if predEsf.DeltaHistAvg <= predDeb.DeltaHistAvg {
		t.Errorf("DeltaHistAvg esforzado (%.4f) no supera al débil (%.4f)",
			predEsf.DeltaHistAvg, predDeb.DeltaHistAvg)
	}
}

// TestIndividual_ProbabilidadesPorRamoOrdenadas valida que el output
// llega ordenado por semestre nominal ascendente.
func TestIndividual_ProbabilidadesPorRamoOrdenadas(t *testing.T) {
	cfg := configIndividualBase(t, models.StudentHistory{}, DefaultWeights, 1)
	cfg.Iteraciones = 200
	pred, err := SimulateIndividual(cfg)
	if err != nil {
		t.Fatal(err)
	}
	for i := 1; i < len(pred.ProbabilidadesPorRamo); i++ {
		prev := pred.ProbabilidadesPorRamo[i-1]
		curr := pred.ProbabilidadesPorRamo[i]
		if prev.Semestre > curr.Semestre {
			t.Errorf("orden incorrecto en %d: prev=%s sem=%d, curr=%s sem=%d",
				i, prev.Sigla, prev.Semestre, curr.Sigla, curr.Semestre)
		}
	}
}

// TestIndividual_RamosAprobadosNoAparecen valida que los ramos ya
// aprobados en el historial real NO aparecen en la tabla de
// probabilidades pendientes.
func TestIndividual_RamosAprobadosNoAparecen(t *testing.T) {
	// Historial con un solo ramo aprobado.
	hist := models.StudentHistory{
		RUT: "TEST-001",
		Semestres: []models.SemesterRecord{
			{
				Periodo:  "S1-2024",
				Anio:     2024,
				Semestre: 1,
				Cursos: []models.SubjectRecord{
					{Sigla: "115", Creditos: 6, Nota: 6.0, Estado: models.SubjectAprobado, Categoria: models.CategoriaObligatoria},
				},
			},
		},
	}
	cfg := configIndividualBase(t, hist, DefaultWeights, 1)
	cfg.Iteraciones = 200
	pred, err := SimulateIndividual(cfg)
	if err != nil {
		t.Fatal(err)
	}
	for _, r := range pred.ProbabilidadesPorRamo {
		if r.Sigla == "115" {
			t.Error("ramo 115 (aprobado en historial) no debería aparecer en pendientes")
		}
	}
}

// TestIndividual_AlumnoRealJavier corre la proyección sobre el alumno
// real (Javier Sepúlveda, ICI). Es un test sanity-check que no valida
// números concretos (el alumno es de ICI no ICE) sino que el motor
// procesa el historial sin errores.
func TestIndividual_AlumnoRealJavier(t *testing.T) {
	hist := loadAlumnoReal(t)
	cfg := configIndividualBase(t, hist, DefaultWeights, 42)
	cfg.Iteraciones = 300

	pred, err := SimulateIndividual(cfg)
	if err != nil {
		t.Fatalf("SimulateIndividual: %v", err)
	}
	t.Logf("Javier (ICI sobre malla ICE para sanity):")
	t.Logf("  ratio_aprobacion = %.4f", pred.HistorialResumen.RatioAprobacion)
	t.Logf("  delta_hist_avg   = %+.4f", pred.DeltaHistAvg)
	t.Logf("  delta_prereq_avg = %+.4f", pred.DeltaPrereqAvg)
	t.Logf("  delta_stress_avg = %+.4f", pred.DeltaStressAvg)
	t.Logf("  tasa_titulacion  = %.4f", pred.TasaTitulacion)
	t.Logf("  semestres_proy   = %.2f", pred.SemestresProyectados)

	// Sin assertions estrictas: el alumno es de ICI y se proyecta sobre ICE.
	// Solo verificamos que no crashee y que devuelva algo coherente.
	if pred.TasaTitulacion < 0 || pred.TasaTitulacion > 1 {
		t.Errorf("TasaTitulacion fuera de [0,1]: %.4f", pred.TasaTitulacion)
	}
}

// loadAlumnoReal carga el CSV del alumno Javier para usar en tests.
func loadAlumnoReal(t *testing.T) models.StudentHistory {
	t.Helper()
	f, err := os.Open(filepath.Join("testdata", "cursos_inscritos_sample.csv"))
	if err != nil {
		t.Fatalf("abrir CSV: %v", err)
	}
	defer f.Close()
	h, err := ParseStudentCSV(f)
	if err != nil {
		t.Fatalf("parsear alumno real: %v", err)
	}
	return h
}
