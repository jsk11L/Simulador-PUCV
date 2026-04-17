package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/jsk11L/Simulador-PUCV/engine"
	"github.com/jsk11L/Simulador-PUCV/models"
)

type scenario struct {
	ID    string
	Label string
}

type scenarioInput struct {
	Asignaturas  []models.AsignaturaPayload  `json:"asignaturas"`
	Programacion *models.ProgramacionPayload `json:"programacion,omitempty"`
}

var criticalScenarios = []scenario{
	{ID: "caso_actual", Label: "Caso Actual"},
	{ID: "pe", Label: "PE"},
	{ID: "cas", Label: "CAS"},
	{ID: "r_10", Label: "R-10"},
	{ID: "r_mas_10", Label: "R+10"},
	{ID: "r_10_gt_40", Label: "R-10>40"},
	{ID: "pf", Label: "PF"},
}

var fourAS = map[string]struct{}{
	"252": {},
	"351": {},
	"446": {},
	"415": {},
}

func cloneBase(base []models.AsignaturaPayload) []models.AsignaturaPayload {
	out := make([]models.AsignaturaPayload, len(base))
	for i, a := range base {
		reqs := append([]string(nil), a.Reqs...)
		out[i] = a
		out[i].Reqs = reqs
	}
	return out
}

func scaleFailRate(v float64, factor float64) float64 {
	s := v * factor
	if s < 0 {
		return 0
	}
	if s > 1 {
		return 1
	}
	return s
}

func applyScenario(base []models.AsignaturaPayload, id string) ([]models.AsignaturaPayload, int, int) {
	template := cloneBase(base)
	ncsmaxOverride := 0
	oporOverride := 0

	switch id {
	case "pe":
		for i := range template {
			template[i].Dictacion = "anual"
		}
	case "cas":
		for i := range template {
			template[i].Dictacion = "semestral"
		}
	case "r_10":
		for i := range template {
			template[i].Rep = scaleFailRate(template[i].Rep, 0.9)
		}
	case "r_mas_10":
		for i := range template {
			template[i].Rep = scaleFailRate(template[i].Rep, 1.1)
		}
	case "r_10_gt_40":
		for i := range template {
			if template[i].Rep > 0.4 {
				template[i].Rep = scaleFailRate(template[i].Rep, 0.9)
			}
		}
	case "pf":
		for i := range template {
			if template[i].Rep > 0.4 {
				template[i].Rep = scaleFailRate(template[i].Rep, 0.9)
			}
			if _, ok := fourAS[template[i].ID]; ok {
				template[i].Dictacion = "semestral"
			}
		}
		ncsmaxOverride = 25
	case "caso_actual":
		_ = oporOverride
	}

	return template, ncsmaxOverride, oporOverride
}

func tryLoadExactScenario(path string) (*scenarioInput, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var in scenarioInput
	if err := json.Unmarshal(raw, &in); err != nil {
		return nil, err
	}
	if len(in.Asignaturas) == 0 {
		return nil, fmt.Errorf("scenario file has no asignaturas: %s", path)
	}
	return &in, nil
}

func main() {
	scenarioFilter := os.Getenv("SCENARIO_ID")
	strictParity := os.Getenv("STRICT_PARITY") == "1"
	iteraciones := 15000
	if raw := os.Getenv("ITERATIONS"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			iteraciones = v
		}
	}
	seed := int64(20260416)
	if raw := os.Getenv("SEED"); raw != "" {
		if v, err := strconv.ParseInt(raw, 10, 64); err == nil {
			seed = v
		}
	}

	path := filepath.Join("..", "original", "_malla_simulapucv_base.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		panic(err)
	}

	var base []models.AsignaturaPayload
	if err := json.Unmarshal(raw, &base); err != nil {
		panic(err)
	}

	fmt.Println("scenario,ppe,psce,ee,peo")
	for _, sc := range criticalScenarios {
		if scenarioFilter != "" && sc.ID != scenarioFilter {
			continue
		}

		scenarioPath := filepath.Join("..", "original", "scenarios", sc.ID+".json")
		exactIn, err := tryLoadExactScenario(scenarioPath)
		if err != nil {
			panic(err)
		}

		var programacion *models.ProgramacionPayload
		malla := base
		ncsOverride := 0
		oporOverride := 0
		if exactIn != nil {
			malla = exactIn.Asignaturas
			programacion = exactIn.Programacion
		} else if strictParity {
			panic(fmt.Sprintf("strict parity enabled but exact scenario file not found: %s", scenarioPath))
		} else {
			malla, ncsOverride, oporOverride = applyScenario(base, sc.ID)
		}

		req := models.SimularRequest{
			Asignaturas:  malla,
			Programacion: programacion,
			Variables: models.VariablesPayload{
				NE:           2,
				NCSmax:       21,
				TAmin:        12.3,
				NapTAmin:     10,
				Opor:         6,
				Iteraciones:  iteraciones,
				MaxSemestres: 0,
				Seed:         seed,
			},
			Modelo: models.ModeloPayload{
				VMap1234:  0.48,
				Delta1234: 0.2,
				VMap5678:  0.55,
				Delta5678: 0.2,
				VMapM:     0.65,
				DeltaM:    0.25,
			},
		}
		if ncsOverride != 0 {
			req.Variables.NCSmax = ncsOverride
		}
		if oporOverride != 0 {
			req.Variables.Opor = oporOverride
		}

		res := engine.EjecutarMontecarlo(req)
		fmt.Printf("%s,%.4f,%.4f,%.4f,%.4f\n",
			sc.Label,
			res.MetricasGlobales.TasaTitulacionPct,
			res.MetricasGlobales.SemestresPromedio,
			res.MetricasGlobales.EficienciaEgreso,
			res.MetricasGlobales.EgresoOportunoPct,
		)
	}
}
