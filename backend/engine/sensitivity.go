package engine

import (
	"math"
	"sort"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// sensitivityAnalysis genera el diagrama tornado del paper: para cada
// parámetro relevante corre la simulación con ±10% y mide el impacto en
// el PPE. Los resultados se ordenan por magnitud de impacto descendente.
//
// Cada sub-simulación corre con includeSensitivity=false para evitar
// recursión infinita.
func sensitivityAnalysis(req models.SimularRequest) []models.SensibilidadParametro {
	baseRes := runMontecarlo(req, false)
	basePPE := round2(baseRes.MetricasGlobales.TasaTitulacionPct)

	scenarios := buildSensitivityScenarios(req)

	out := make([]models.SensibilidadParametro, 0, len(scenarios))
	for _, sc := range scenarios {
		minusRes := runMontecarlo(sc.apply(0.9), false)
		plusRes := runMontecarlo(sc.apply(1.1), false)

		menos10 := minusRes.MetricasGlobales.TasaTitulacionPct
		mas10 := plusRes.MetricasGlobales.TasaTitulacionPct
		impacto := math.Max(math.Abs(menos10-basePPE), math.Abs(mas10-basePPE))

		out = append(out, models.SensibilidadParametro{
			Parametro: sc.name,
			Base:      round2(sc.base),
			Menos10:   round2(menos10),
			Mas10:     round2(mas10),
			Impacto:   round2(impacto),
		})
	}

	sort.Slice(out, func(i, j int) bool {
		return out[i].Impacto > out[j].Impacto
	})
	return out
}

type sensitivityScenario struct {
	name  string
	base  float64
	apply func(mult float64) models.SimularRequest
}

func buildSensitivityScenarios(req models.SimularRequest) []sensitivityScenario {
	clampInt := func(v int) int {
		if v < 1 {
			return 1
		}
		return v
	}

	return []sensitivityScenario{
		{
			name: "NCSmax",
			base: float64(req.Variables.NCSmax),
			apply: func(mult float64) models.SimularRequest {
				r := req
				r.Variables.NCSmax = clampInt(int(math.Round(float64(req.Variables.NCSmax) * mult)))
				return r
			},
		},
		{
			name: "TAmin",
			base: req.Variables.TAmin,
			apply: func(mult float64) models.SimularRequest {
				r := req
				r.Variables.TAmin = req.Variables.TAmin * mult
				return r
			},
		},
		{
			name: "NapTAmin",
			base: float64(req.Variables.NapTAmin),
			apply: func(mult float64) models.SimularRequest {
				r := req
				r.Variables.NapTAmin = clampInt(int(math.Round(float64(req.Variables.NapTAmin) * mult)))
				return r
			},
		},
		{
			name: "Opor",
			base: float64(req.Variables.Opor),
			apply: func(mult float64) models.SimularRequest {
				r := req
				r.Variables.Opor = clampInt(int(math.Round(float64(req.Variables.Opor) * mult)))
				return r
			},
		},
		{
			name: "VMap1234",
			base: req.Modelo.VMap1234,
			apply: func(mult float64) models.SimularRequest {
				r := req
				r.Modelo.VMap1234 = req.Modelo.VMap1234 * mult
				return r
			},
		},
		{
			name: "VMap5678",
			base: req.Modelo.VMap5678,
			apply: func(mult float64) models.SimularRequest {
				r := req
				r.Modelo.VMap5678 = req.Modelo.VMap5678 * mult
				return r
			},
		},
		{
			name: "VMapM",
			base: req.Modelo.VMapM,
			apply: func(mult float64) models.SimularRequest {
				r := req
				r.Modelo.VMapM = req.Modelo.VMapM * mult
				return r
			},
		},
	}
}
