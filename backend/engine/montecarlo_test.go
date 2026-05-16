package engine

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/jsk11L/Simulador-PUCV/models"
)

type scenarioFile struct {
	Scenario     string                      `json:"scenario"`
	Asignaturas  []models.AsignaturaPayload  `json:"asignaturas"`
	Programacion *models.ProgramacionPayload `json:"programacion,omitempty"`
}

type criticalMetrics struct {
	PPE  float64 `json:"ppe"`
	PSCE float64 `json:"psce"`
	EE   float64 `json:"ee"`
	PEO  float64 `json:"peo"`
}

type goldenBaseline struct {
	NE        int                        `json:"ne"`
	Seed      int64                      `json:"seed"`
	Scenarios map[string]criticalMetrics `json:"scenarios"`
}

type scenarioDef struct {
	ID          string
	Label       string
	Descripcion string // Texto legible para reportes (qué cambia este escenario respecto a la base)
	NCSmax      int
}

// criticalScenarios son los 7 escenarios del paper portados a JSON exacto
// desde Civilelectrica93.xlsx. Permanecen como golden inputs del motor.
// Descripciones tomadas de la Tabla 5 del paper Mendoza Baeza (2023).
var criticalScenarios = []scenarioDef{
	{
		ID:          "caso_actual",
		Label:       "Caso Actual",
		Descripcion: "Situación base de la carrera: malla y programación de docencia tal como se dictan hoy.",
	},
	{
		ID:          "pe",
		Label:       "Plan de Estudios estricto",
		Descripcion: "Cada asignatura se dicta solamente en el semestre teórico que indica la malla (rigidez máxima).",
	},
	{
		ID:          "cas",
		Label:       "Asignaturas semestralizadas",
		Descripcion: "Todas las asignaturas se ofrecen ambos semestres del año (flexibilidad máxima).",
	},
	{
		ID:          "r_10",
		Label:       "Reprobación global −10%",
		Descripcion: "Se reduce un 10% la tasa de reprobación de TODAS las asignaturas (mejora docente generalizada).",
	},
	{
		ID:          "r_mas_10",
		Label:       "Reprobación global +10%",
		Descripcion: "Se incrementa un 10% la tasa de reprobación de todas las asignaturas (escenario adverso).",
	},
	{
		ID:          "r_10_gt_40",
		Label:       "Mejora en ramos críticos",
		Descripcion: "Reducción 10% de reprobación SOLO en las 11 asignaturas con tasa de fracaso superior al 40%.",
	},
	{
		ID:          "pf",
		Label:       "Propuesta Final",
		Descripcion: "Combinación óptima: ramos críticos mejorados, 4 asignaturas anuales pasan a semestrales y se eleva el tope de créditos a 25.",
		NCSmax:      25,
	},
}

const (
	defaultNE       = 2000
	defaultSeed     = int64(20260416)
	defaultNCSmax   = 21
	defaultTAmin    = 12.3
	defaultNapTAmin = 10
	defaultOpor     = 6
)

func loadScenario(t *testing.T, id string) scenarioFile {
	t.Helper()
	path := filepath.Join("testdata", "scenarios", id+".json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read scenario %s: %v", id, err)
	}
	var sc scenarioFile
	if err := json.Unmarshal(raw, &sc); err != nil {
		t.Fatalf("parse scenario %s: %v", id, err)
	}
	if len(sc.Asignaturas) == 0 {
		t.Fatalf("scenario %s has no asignaturas", id)
	}
	return sc
}

func runScenario(t *testing.T, sc scenarioFile, def scenarioDef, ne int, seed int64) criticalMetrics {
	t.Helper()
	ncsmax := defaultNCSmax
	if def.NCSmax != 0 {
		ncsmax = def.NCSmax
	}
	req := models.SimularRequest{
		Asignaturas:  sc.Asignaturas,
		Programacion: sc.Programacion,
		Variables: models.VariablesPayload{
			NE:       ne,
			NCSmax:   ncsmax,
			TAmin:    defaultTAmin,
			NapTAmin: defaultNapTAmin,
			Opor:     defaultOpor,
			Seed:     seed,
		},
		Modelo: models.ModeloPayload{
			VMap1234: 0.48, Delta1234: 0.2,
			VMap5678: 0.55, Delta5678: 0.2,
			VMapM: 0.65, DeltaM: 0.25,
		},
	}
	res := EjecutarMontecarlo(req)
	return criticalMetrics{
		PPE:  res.MetricasGlobales.TasaTitulacionPct,
		PSCE: res.MetricasGlobales.SemestresPromedio,
		EE:   res.MetricasGlobales.EficienciaEgreso,
		PEO:  res.MetricasGlobales.EgresoOportunoPct,
	}
}

// TestCriticalParity_Golden corre los 7 escenarios críticos del paper
// con seed fija y compara contra un snapshot de salida conocido. Cualquier
// cambio en el motor que altere los números rompe este test.
//
// Para regenerar el snapshot (ej: tras cambio intencional):
//
//	UPDATE_GOLDEN=1 go test ./engine -run TestCriticalParity_Golden
func TestCriticalParity_Golden(t *testing.T) {
	const (
		tolPP  = 0.5  // tolerancia para PPE/PEO en puntos porcentuales
		tolSem = 0.1  // tolerancia para PSCE en semestres
		tolEE  = 0.02 // tolerancia para EE
	)

	goldenPath := filepath.Join("testdata", "golden_critical.json")
	update := os.Getenv("UPDATE_GOLDEN") == "1"

	actual := goldenBaseline{
		NE:        defaultNE,
		Seed:      defaultSeed,
		Scenarios: make(map[string]criticalMetrics, len(criticalScenarios)),
	}
	for _, def := range criticalScenarios {
		sc := loadScenario(t, def.ID)
		actual.Scenarios[def.ID] = runScenario(t, sc, def, defaultNE, defaultSeed)
	}

	if update {
		data, err := json.MarshalIndent(actual, "", "  ")
		if err != nil {
			t.Fatalf("marshal golden: %v", err)
		}
		if err := os.WriteFile(goldenPath, append(data, '\n'), 0o644); err != nil {
			t.Fatalf("write golden: %v", err)
		}
		t.Logf("golden baseline regenerated at %s", goldenPath)
		return
	}

	raw, err := os.ReadFile(goldenPath)
	if err != nil {
		t.Fatalf("read golden (run with UPDATE_GOLDEN=1 to create it): %v", err)
	}
	var golden goldenBaseline
	if err := json.Unmarshal(raw, &golden); err != nil {
		t.Fatalf("parse golden: %v", err)
	}

	if golden.NE != defaultNE || golden.Seed != defaultSeed {
		t.Fatalf("golden parameters drift: golden=(ne=%d seed=%d) actual=(ne=%d seed=%d)",
			golden.NE, golden.Seed,
			defaultNE, defaultSeed)
	}

	for _, def := range criticalScenarios {
		gm, ok := golden.Scenarios[def.ID]
		if !ok {
			t.Errorf("scenario %s missing in golden baseline", def.ID)
			continue
		}
		am := actual.Scenarios[def.ID]

		if d := math.Abs(am.PPE - gm.PPE); d > tolPP {
			t.Errorf("%s PPE drift: got %.4f, want %.4f (Δ=%.4f, tol ±%.2f pp)",
				def.Label, am.PPE, gm.PPE, am.PPE-gm.PPE, tolPP)
		}
		if d := math.Abs(am.PSCE - gm.PSCE); d > tolSem {
			t.Errorf("%s PSCE drift: got %.4f, want %.4f (Δ=%.4f, tol ±%.2f sem)",
				def.Label, am.PSCE, gm.PSCE, am.PSCE-gm.PSCE, tolSem)
		}
		if d := math.Abs(am.EE - gm.EE); d > tolEE {
			t.Errorf("%s EE drift: got %.4f, want %.4f (Δ=%.4f, tol ±%.3f)",
				def.Label, am.EE, gm.EE, am.EE-gm.EE, tolEE)
		}
		if d := math.Abs(am.PEO - gm.PEO); d > tolPP {
			t.Errorf("%s PEO drift: got %.4f, want %.4f (Δ=%.4f, tol ±%.2f pp)",
				def.Label, am.PEO, gm.PEO, am.PEO-gm.PEO, tolPP)
		}
	}
}

// TestCriticalParity_PaperRange valida que el motor Go reproduzca los
// resultados de la Tabla 5 del paper (Mendoza Baeza, 2023) dentro de
// tolerancia estadística. NE=2000 produce ~20% de la varianza del paper
// (que usa NE=15000), por eso las tolerancias son moderadamente amplias.
//
// Histórico: el wrap de iteraciones que existía antes (NE=2 × iter=1000)
// introducía un sesgo grande en PSCE/EE porque promediaba sobre corridas
// donde a veces no había titulados (guarda titulados>0 → contribución 0).
// Al eliminarlo, el motor se alineó con el paper.
func TestCriticalParity_PaperRange(t *testing.T) {
	paper := map[string]criticalMetrics{
		"caso_actual": {PPE: 37.13, PSCE: 15.96, EE: 1.33, PEO: 4.04},
		"pe":          {PPE: 11.19, PSCE: 16.51, EE: 1.38, PEO: 1.09},
		"cas":         {PPE: 47.46, PSCE: 15.32, EE: 1.28, PEO: 7.95},
		"r_10":        {PPE: 62.21, PSCE: 15.65, EE: 1.30, PEO: 12.14},
		"r_mas_10":    {PPE: 16.56, PSCE: 16.25, EE: 1.35, PEO: 0.89},
		"r_10_gt_40":  {PPE: 58.30, PSCE: 15.73, EE: 1.31, PEO: 10.06},
		"pf":          {PPE: 75.11, PSCE: 14.57, EE: 1.21, PEO: 24.70},
	}
	const (
		tolPP  = 15.0 // PF es el caso más sensible, requiere tolerancia amplia
		tolSem = 0.5
		tolEE  = 0.05
	)

	for _, def := range criticalScenarios {
		sc := loadScenario(t, def.ID)
		m := runScenario(t, sc, def, defaultNE, defaultSeed)
		ref, ok := paper[def.ID]
		if !ok {
			continue
		}
		if d := math.Abs(m.PPE - ref.PPE); d > tolPP {
			t.Errorf("%s PPE vs paper: got %.2f, paper %.2f (Δ=%.2f, tol ±%.1f pp)",
				def.Label, m.PPE, ref.PPE, m.PPE-ref.PPE, tolPP)
		}
		if d := math.Abs(m.PSCE - ref.PSCE); d > tolSem {
			t.Errorf("%s PSCE vs paper: got %.2f, paper %.2f (Δ=%.2f, tol ±%.2f sem)",
				def.Label, m.PSCE, ref.PSCE, m.PSCE-ref.PSCE, tolSem)
		}
		if d := math.Abs(m.EE - ref.EE); d > tolEE {
			t.Errorf("%s EE vs paper: got %.2f, paper %.2f (Δ=%.2f, tol ±%.2f)",
				def.Label, m.EE, ref.EE, m.EE-ref.EE, tolEE)
		}
		if d := math.Abs(m.PEO - ref.PEO); d > tolPP {
			t.Errorf("%s PEO vs paper: got %.2f, paper %.2f (Δ=%.2f, tol ±%.1f pp)",
				def.Label, m.PEO, ref.PEO, m.PEO-ref.PEO, tolPP)
		}
	}
}

// TestSmoke_MallaMinima ejecuta el motor con una malla de un solo ramo.
// Sirve para detectar panics o divisiones por cero en bordes.
func TestSmoke_MallaMinima(t *testing.T) {
	req := models.SimularRequest{
		Asignaturas: []models.AsignaturaPayload{
			{ID: "X1", Cred: 4, Rep: 0.3, Reqs: []string{}, Semestre: 1, Dictacion: "semestral"},
		},
		Variables: models.VariablesPayload{
			NE: 50, NCSmax: 10, TAmin: 4, NapTAmin: 5, Opor: 3,
			Seed: 42,
		},
		Modelo: models.ModeloPayload{
			VMap1234: 0.5, Delta1234: 0.2,
			VMap5678: 0.6, Delta5678: 0.2,
			VMapM: 0.7, DeltaM: 0.2,
		},
	}
	res := EjecutarMontecarlo(req)
	if res.MetricasGlobales.AlumnosSimulados <= 0 {
		t.Errorf("AlumnosSimulados <= 0: %f", res.MetricasGlobales.AlumnosSimulados)
	}
}

// TestSmoke_SinTitulables verifica que una malla con rep=1 (nadie aprueba nada)
// produce 0 titulados sin entrar en bucle infinito.
func TestSmoke_SinTitulables(t *testing.T) {
	req := models.SimularRequest{
		Asignaturas: []models.AsignaturaPayload{
			{ID: "X1", Cred: 4, Rep: 2.0, Reqs: []string{}, Semestre: 1, Dictacion: "semestral"},
		},
		Variables: models.VariablesPayload{
			NE: 50, NCSmax: 10, TAmin: 4, NapTAmin: 5, Opor: 3,
			Seed: 42, MaxSemestres: 30,
		},
		Modelo: models.ModeloPayload{
			VMap1234: 0.5, Delta1234: 0.2,
		},
	}
	res := EjecutarMontecarlo(req)
	if res.MetricasGlobales.Titulados != 0 {
		t.Errorf("Titulados con rep>1 debería ser 0, fue %.2f", res.MetricasGlobales.Titulados)
	}
}

// TestSmoke_SeedDeterminista verifica que dos corridas con misma seed
// producen idéntica salida.
func TestSmoke_SeedDeterminista(t *testing.T) {
	sc := loadScenario(t, "caso_actual")
	def := scenarioDef{ID: "caso_actual", Label: "Caso Actual"}

	a := runScenario(t, sc, def, 100, 12345)
	b := runScenario(t, sc, def, 100, 12345)

	if a != b {
		t.Errorf("salida no determinística con misma seed: a=%+v b=%+v", a, b)
	}
}

// TestSmoke_DefaultNE verifica que NE<=0 cae al default del paper.
func TestSmoke_DefaultNE(t *testing.T) {
	sc := loadScenario(t, "caso_actual")
	req := models.SimularRequest{
		Asignaturas:  sc.Asignaturas,
		Programacion: sc.Programacion,
		Variables: models.VariablesPayload{
			NE: 0, NCSmax: 21, TAmin: 12.3, NapTAmin: 10, Opor: 6, Seed: 1,
		},
		Modelo: models.ModeloPayload{
			VMap1234: 0.48, Delta1234: 0.2,
			VMap5678: 0.55, Delta5678: 0.2,
			VMapM: 0.65, DeltaM: 0.25,
		},
	}
	res := EjecutarMontecarlo(req)
	if int(res.MetricasGlobales.AlumnosSimulados) != DefaultNE {
		t.Errorf("DefaultNE no aplicado: AlumnosSimulados=%v, want %d",
			res.MetricasGlobales.AlumnosSimulados, DefaultNE)
	}
}

// paperBaselines son los valores de la Tabla 5 del paper Mendoza Baeza (2023).
// Compartido entre TestCriticalParity_PaperRange y TestGenerateReport_PaperVsGo.
var paperBaselines = map[string]criticalMetrics{
	"caso_actual": {PPE: 37.13, PSCE: 15.96, EE: 1.33, PEO: 4.04},
	"pe":          {PPE: 11.19, PSCE: 16.51, EE: 1.38, PEO: 1.09},
	"cas":         {PPE: 47.46, PSCE: 15.32, EE: 1.28, PEO: 7.95},
	"r_10":        {PPE: 62.21, PSCE: 15.65, EE: 1.30, PEO: 12.14},
	"r_mas_10":    {PPE: 16.56, PSCE: 16.25, EE: 1.35, PEO: 0.89},
	"r_10_gt_40":  {PPE: 58.30, PSCE: 15.73, EE: 1.31, PEO: 10.06},
	"pf":          {PPE: 75.11, PSCE: 14.57, EE: 1.21, PEO: 24.70},
}

// TestGenerateReport_PaperVsGo no valida tolerancias (ese rol lo cumple
// TestCriticalParity_PaperRange). Su único propósito es producir los
// artefactos visuales del contraste motor Go vs paper:
//
//	testdata/report.html — visual con colores
//	testdata/report.csv  — datos planos para procesamiento
//
// Se ejecuta siempre que se corra `go test ./engine`. Los archivos quedan
// en testdata/ y se sobreescriben cada vez.
func TestGenerateReport_PaperVsGo(t *testing.T) {
	tol := defaultReportTolerances
	rows := make([]reportRow, 0, len(criticalScenarios))

	for _, def := range criticalScenarios {
		sc := loadScenario(t, def.ID)
		motor := runScenario(t, sc, def, defaultNE, defaultSeed)

		paper, ok := paperBaselines[def.ID]
		if !ok {
			t.Errorf("escenario %s sin baseline en paperBaselines", def.ID)
			continue
		}
		rows = append(rows, buildReportRow(def.ID, def.Label, def.Descripcion, paper, motor, tol))
	}
	sortReportRows(rows)

	htmlPath := filepath.Join("testdata", "report.html")
	csvPath := filepath.Join("testdata", "report.csv")

	htmlContent := renderReportHTML(rows, tol, time.Now())
	csvContent := renderReportCSV(rows)

	if err := os.WriteFile(htmlPath, []byte(htmlContent), 0o644); err != nil {
		t.Fatalf("escribir %s: %v", htmlPath, err)
	}
	if err := os.WriteFile(csvPath, []byte(csvContent), 0o644); err != nil {
		t.Fatalf("escribir %s: %v", csvPath, err)
	}
	t.Logf("reporte regenerado: %s + %s", htmlPath, csvPath)
}
