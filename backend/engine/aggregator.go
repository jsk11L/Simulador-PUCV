package engine

import (
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// aggregateResults consolida los resultados individuales de NE alumnos en
// las métricas globales del paper, distribución de semestres de egreso,
// ramos críticos, heatmap por semestre y matriz de transiciones de estado.
func aggregateResults(req models.SimularRequest, m mallaContext, resultados []models.ResultadoAlumno) models.SimulacionResponse {
	titulados := 0
	sumaSemestres := 0
	elimTA := 0
	elimOpor := 0
	egresoOportuno := 0
	estudiantesFueraPrimerAnio := 0
	estudiantesFueraTercerAnio := 0
	distribucion := make(map[int]int)
	intentosGlobal := make(map[string]int)
	reprobacionesGlobal := make(map[string]int)
	heatmapCounts := make(map[int]*models.HeatmapEstadoSemestre)
	transicionesCounts := make(map[string]int)

	umbralOportuno := m.MaxSemestre + 2

	for _, res := range resultados {
		switch res.Estado {
		case models.Titulado:
			titulados++
			sumaSemestres += res.SemestresUsados
			distribucion[res.SemestresUsados]++
			if res.SemestresUsados <= umbralOportuno {
				egresoOportuno++
			}
		case models.EliminadoTAmin:
			elimTA++
		case models.EliminadoOpor:
			elimOpor++
		}

		if res.SemestresUsados < 3 {
			estudiantesFueraPrimerAnio++
		}
		if res.SemestresUsados < 7 {
			estudiantesFueraTercerAnio++
		}

		for sigla, intentos := range res.IntentosRamo {
			intentosGlobal[sigla] += intentos
		}
		for sigla, reprob := range res.ReprobacionesRamo {
			reprobacionesGlobal[sigla] += reprob
		}

		for i, estadoSem := range res.EstadoTimeline {
			sem := i + 1
			bucket, ok := heatmapCounts[sem]
			if !ok {
				bucket = &models.HeatmapEstadoSemestre{Semestre: sem}
				heatmapCounts[sem] = bucket
			}

			switch estadoSem {
			case models.Activo:
				bucket.Activos++
			case models.Titulado:
				bucket.Titulados++
			case models.EliminadoTAmin:
				bucket.EliminadosTA++
			case models.EliminadoOpor:
				bucket.EliminadosOpor++
			}

			if i > 0 {
				from := estadoToLabel(res.EstadoTimeline[i-1])
				to := estadoToLabel(estadoSem)
				key := fmt.Sprintf("%d|%s|%s", sem, from, to)
				transicionesCounts[key]++
			}
		}
	}

	ne := float64(req.Variables.NE)
	semestresPromedio := 0.0
	if titulados > 0 {
		semestresPromedio = float64(sumaSemestres) / float64(titulados)
	}

	tasaTitulacion := (float64(titulados) / ne) * 100
	eficienciaEgreso := 0.0
	if m.MaxSemestre > 0 && titulados > 0 {
		eficienciaEgreso = semestresPromedio / float64(m.MaxSemestre)
	}
	egresoOportunoPct := (float64(egresoOportuno) / ne) * 100

	retencion1er := (ne - float64(estudiantesFueraPrimerAnio)) / ne * 100
	retencion3er := (ne - float64(estudiantesFueraTercerAnio)) / ne * 100

	ramosCriticos := buildRamosCriticos(m.Normalizadas, intentosGlobal, reprobacionesGlobal)
	heatmapEstadoSemestre := buildHeatmap(heatmapCounts)
	transicionesEstado := buildTransiciones(transicionesCounts)

	return models.SimulacionResponse{
		Mensaje: "Simulación completada con éxito",
		MetricasGlobales: models.MetricasGlobales{
			AlumnosSimulados:    float64(req.Variables.NE),
			Titulados:           float64(titulados),
			EliminadosTamin:     float64(elimTA),
			EliminadosOpor:      float64(elimOpor),
			TasaTitulacionPct:   round2(tasaTitulacion),
			SemestresPromedio:   round2(semestresPromedio),
			EficienciaEgreso:    round2(eficienciaEgreso),
			EgresoOportunoPct:   round2(egresoOportunoPct),
			Retencion1erAnioPct: round2(retencion1er),
			Retencion3erAnioPct: round2(retencion3er),
		},
		DistribucionSemestres: toDistribucion(distribucion),
		RamosCriticos:         ramosCriticos,
		HeatmapEstadoSemestre: heatmapEstadoSemestre,
		TransicionesEstado:    transicionesEstado,
	}
}

func buildRamosCriticos(malla []models.AsignaturaPayload, intentos, reprob map[string]int) []models.RamoCritico {
	var ramos []models.RamoCritico
	for _, asig := range malla {
		nIntentos := intentos[asig.ID]
		nReprob := reprob[asig.ID]
		if nIntentos == 0 {
			continue
		}
		ramos = append(ramos, models.RamoCritico{
			Sigla:         asig.ID,
			Intentos:      float64(nIntentos),
			Reprobaciones: float64(nReprob),
			TasaFalloPct:  math.Round(float64(nReprob)/float64(nIntentos)*10000) / 100,
		})
	}

	sort.SliceStable(ramos, func(i, j int) bool {
		return ramos[i].TasaFalloPct > ramos[j].TasaFalloPct
	})
	return ramos
}

func buildHeatmap(counts map[int]*models.HeatmapEstadoSemestre) []models.HeatmapEstadoSemestre {
	semestres := make([]int, 0, len(counts))
	for sem := range counts {
		semestres = append(semestres, sem)
	}
	sort.Ints(semestres)

	out := make([]models.HeatmapEstadoSemestre, 0, len(semestres))
	for _, sem := range semestres {
		fila := counts[sem]
		out = append(out, models.HeatmapEstadoSemestre{
			Semestre:       fila.Semestre,
			Activos:        float64(fila.Activos),
			Titulados:      float64(fila.Titulados),
			EliminadosTA:   float64(fila.EliminadosTA),
			EliminadosOpor: float64(fila.EliminadosOpor),
		})
	}
	return out
}

func buildTransiciones(counts map[string]int) []models.TransicionEstado {
	out := make([]models.TransicionEstado, 0, len(counts))
	for key, value := range counts {
		parts := strings.SplitN(key, "|", 3)
		if len(parts) != 3 {
			continue
		}
		sem, err := strconv.Atoi(parts[0])
		if err != nil {
			continue
		}
		out = append(out, models.TransicionEstado{
			Semestre: sem,
			From:     parts[1],
			To:       parts[2],
			Value:    float64(value),
		})
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].Semestre == out[j].Semestre {
			if out[i].From == out[j].From {
				return out[i].To < out[j].To
			}
			return out[i].From < out[j].From
		}
		return out[i].Semestre < out[j].Semestre
	})
	return out
}

func toDistribucion(distribucion map[int]int) map[int]float64 {
	out := make(map[int]float64, len(distribucion))
	for sem, valor := range distribucion {
		out[sem] = float64(valor)
	}
	return out
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
