package engine

import (
	"fmt"
	"math"
	"math/rand"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/jsk11L/Simulador-PUCV/models"
)

func estadoToLabel(estado models.EstadoAlumno) string {
	switch estado {
	case models.Activo:
		return "Activo"
	case models.Titulado:
		return "Titulado"
	case models.EliminadoTAmin:
		return "EliminadoTAmin"
	case models.EliminadoOpor:
		return "EliminadoOpor"
	default:
		return "Desconocido"
	}
}

// EjecutarMontecarlo ejecuta la simulación estocástica completa.
// Retorna un SimulacionResponse con todas las métricas del Paper.
func EjecutarMontecarlo(req models.SimularRequest) models.SimulacionResponse {
	return ejecutarMontecarlo(req, true)
}

func ejecutarMontecarlo(req models.SimularRequest, includeSensitivity bool) models.SimulacionResponse {
	// Preparar mapas de la malla para acceso ultra rápido O(1)
	mallaMap := make(map[string]models.AsignaturaPayload)
	maxSemestreMalla := 0
	for _, asig := range req.Asignaturas {
		mallaMap[asig.ID] = asig
		if asig.Semestre > maxSemestreMalla {
			maxSemestreMalla = asig.Semestre
		}
	}

	var wg sync.WaitGroup
	resultadosChan := make(chan models.ResultadoAlumno, req.Variables.NE)

	// Semáforo para bounded concurrency (máx 500 goroutines simultáneas)
	maxWorkers := 500
	if req.Variables.NE < maxWorkers {
		maxWorkers = req.Variables.NE
	}
	semaforo := make(chan struct{}, maxWorkers)

	// Simulación paralela de alumnos
	for i := 0; i < req.Variables.NE; i++ {
		wg.Add(1)
		semaforo <- struct{}{} // Adquirir slot en el pool

		go func(alumnoID int) {
			defer wg.Done()
			defer func() { <-semaforo }() // Liberar slot

			estado := models.Activo
			semestreActual := 1
			creditosAprobadosTotales := 0
			historial := make(map[string]*models.HistorialAsignatura)

			// Tracking local de reprobaciones por ramo (para Ramos Críticos)
			intentosLocal := make(map[string]int)
			reprobacionesLocal := make(map[string]int)
			estadoTimeline := make([]models.EstadoAlumno, 0, 30)

			for estado == models.Activo && semestreActual <= 30 {
				estadoDelSemestre := models.Activo
				creditosInscritos := 0
				var asignaturasTomadas []string

				for _, asig := range req.Asignaturas {
					if h, ok := historial[asig.ID]; ok && h.Aprobado {
						continue
					}

					// Cumple dictación?
					if asig.Dictacion == "semestral" {
						isImpar := asig.Semestre%2 != 0
						currentIsImpar := semestreActual%2 != 0
						if isImpar != currentIsImpar {
							continue
						}
					}

					// Cumple prerrequisitos?
					cumpleReqs := true
					for _, reqSigla := range asig.Reqs {
						if reqSigla == "" {
							continue
						}
						if reqHist, ok := historial[reqSigla]; !ok || !reqHist.Aprobado {
							cumpleReqs = false
							break
						}
					}
					if !cumpleReqs {
						continue
					}

					if creditosInscritos+asig.Cred <= req.Variables.NCSmax {
						asignaturasTomadas = append(asignaturasTomadas, asig.ID)
						creditosInscritos += asig.Cred
					}
				}

				// Si no tomó nada y ya aprobó todo, se titula
				if len(asignaturasTomadas) == 0 {
					todasAprobadas := true
					for _, a := range req.Asignaturas {
						if h, ok := historial[a.ID]; !ok || !h.Aprobado {
							todasAprobadas = false
							break
						}
					}
					if todasAprobadas {
						estado = models.Titulado
						estadoDelSemestre = models.Titulado
						estadoTimeline = append(estadoTimeline, estadoDelSemestre)
						break
					}
				}

				// Simular aprobación estocástica
				for _, sigla := range asignaturasTomadas {
					asig := mallaMap[sigla]

					vmap, delta := req.Modelo.VMapM, req.Modelo.DeltaM
					if asig.Semestre <= 4 {
						vmap, delta = req.Modelo.VMap1234, req.Modelo.Delta1234
					} else if asig.Semestre <= 8 {
						vmap, delta = req.Modelo.VMap5678, req.Modelo.Delta5678
					}

					// math.Abs replica fielmente el MATLAB: abs(VMap + Delta.*randn(l,1))
					probExitoAlumno := math.Abs(vmap + delta*rand.NormFloat64())
					aprobado := probExitoAlumno > asig.Rep

					if _, ok := historial[sigla]; !ok {
						historial[sigla] = &models.HistorialAsignatura{Sigla: sigla, Oportunidad: 0}
					}

					historial[sigla].Oportunidad++
					intentosLocal[sigla]++

					if aprobado {
						historial[sigla].Aprobado = true
						creditosAprobadosTotales += asig.Cred
					} else {
						reprobacionesLocal[sigla]++
						if historial[sigla].Oportunidad >= req.Variables.Opor {
							estado = models.EliminadoOpor
							estadoDelSemestre = models.EliminadoOpor
						}
					}
				}

				if estado == models.EliminadoOpor {
					estadoTimeline = append(estadoTimeline, estadoDelSemestre)
					break
				}

				// Chequear Tasa de Avance (TAmin)
				if semestreActual >= req.Variables.NapTAmin {
					if float64(creditosAprobadosTotales)/float64(semestreActual) < req.Variables.TAmin {
						estado = models.EliminadoTAmin
						estadoDelSemestre = models.EliminadoTAmin
						estadoTimeline = append(estadoTimeline, estadoDelSemestre)
						break
					}
				}

				estadoTimeline = append(estadoTimeline, estadoDelSemestre)

				semestreActual++
			}

			resultadosChan <- models.ResultadoAlumno{
				Estado:            estado,
				SemestresUsados:   semestreActual,
				ReprobacionesRamo: reprobacionesLocal,
				IntentosRamo:      intentosLocal,
				EstadoTimeline:    estadoTimeline,
			}
		}(i)
	}

	wg.Wait()
	close(resultadosChan)

	// ==========================================
	// AGREGACIÓN DE RESULTADOS
	// ==========================================
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

	umbralOportuno := maxSemestreMalla + 2

	for res := range resultadosChan {
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
	if maxSemestreMalla > 0 && titulados > 0 {
		eficienciaEgreso = semestresPromedio / float64(maxSemestreMalla)
	}
	egresoOportunoPct := (float64(egresoOportuno) / ne) * 100

	retencion1er := (ne - float64(estudiantesFueraPrimerAnio)) / ne * 100
	retencion3er := (ne - float64(estudiantesFueraTercerAnio)) / ne * 100

	var ramosCriticos []models.RamoCritico
	for _, asig := range req.Asignaturas {
		intentos := intentosGlobal[asig.ID]
		reprob := reprobacionesGlobal[asig.ID]
		if intentos > 0 {
			ramosCriticos = append(ramosCriticos, models.RamoCritico{
				Sigla:         asig.ID,
				Intentos:      intentos,
				Reprobaciones: reprob,
				TasaFalloPct:  math.Round(float64(reprob)/float64(intentos)*10000) / 100,
			})
		}
	}

	// Ordenar por tasa de fallo descendente
	for i := 0; i < len(ramosCriticos); i++ {
		for j := i + 1; j < len(ramosCriticos); j++ {
			if ramosCriticos[j].TasaFalloPct > ramosCriticos[i].TasaFalloPct {
				ramosCriticos[i], ramosCriticos[j] = ramosCriticos[j], ramosCriticos[i]
			}
		}
	}

	semestresHeatmap := make([]int, 0, len(heatmapCounts))
	for sem := range heatmapCounts {
		semestresHeatmap = append(semestresHeatmap, sem)
	}
	sort.Ints(semestresHeatmap)

	heatmapEstadoSemestre := make([]models.HeatmapEstadoSemestre, 0, len(semestresHeatmap))
	for _, sem := range semestresHeatmap {
		heatmapEstadoSemestre = append(heatmapEstadoSemestre, *heatmapCounts[sem])
	}

	transicionesEstado := make([]models.TransicionEstado, 0, len(transicionesCounts))
	for key, value := range transicionesCounts {
		parts := strings.SplitN(key, "|", 3)
		if len(parts) != 3 {
			continue
		}
		sem, err := strconv.Atoi(parts[0])
		if err != nil {
			continue
		}
		transicionesEstado = append(transicionesEstado, models.TransicionEstado{
			Semestre: sem,
			From:     parts[1],
			To:       parts[2],
			Value:    value,
		})
	}

	sort.Slice(transicionesEstado, func(i, j int) bool {
		if transicionesEstado[i].Semestre == transicionesEstado[j].Semestre {
			if transicionesEstado[i].From == transicionesEstado[j].From {
				return transicionesEstado[i].To < transicionesEstado[j].To
			}
			return transicionesEstado[i].From < transicionesEstado[j].From
		}
		return transicionesEstado[i].Semestre < transicionesEstado[j].Semestre
	})

	sensibilidadTornado := make([]models.SensibilidadParametro, 0)
	if includeSensitivity {
		basePPE := math.Round(tasaTitulacion*100) / 100

		clampInt := func(v int) int {
			if v < 1 {
				return 1
			}
			return v
		}

		round2 := func(v float64) float64 {
			return math.Round(v*100) / 100
		}

		type scenario struct {
			name  string
			base  float64
			apply func(mult float64) models.SimularRequest
		}

		scenarios := []scenario{
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

		for _, sc := range scenarios {
			minusReq := sc.apply(0.9)
			plusReq := sc.apply(1.1)

			minusRes := ejecutarMontecarlo(minusReq, false)
			plusRes := ejecutarMontecarlo(plusReq, false)

			menos10 := minusRes.MetricasGlobales.TasaTitulacionPct
			mas10 := plusRes.MetricasGlobales.TasaTitulacionPct
			impacto := math.Max(math.Abs(menos10-basePPE), math.Abs(mas10-basePPE))

			sensibilidadTornado = append(sensibilidadTornado, models.SensibilidadParametro{
				Parametro: sc.name,
				Base:      round2(sc.base),
				Menos10:   round2(menos10),
				Mas10:     round2(mas10),
				Impacto:   round2(impacto),
			})
		}

		sort.Slice(sensibilidadTornado, func(i, j int) bool {
			return sensibilidadTornado[i].Impacto > sensibilidadTornado[j].Impacto
		})
	}

	return models.SimulacionResponse{
		Mensaje: "Simulación completada con éxito",
		MetricasGlobales: models.MetricasGlobales{
			AlumnosSimulados:    req.Variables.NE,
			Titulados:           titulados,
			EliminadosTamin:     elimTA,
			EliminadosOpor:      elimOpor,
			TasaTitulacionPct:   math.Round(tasaTitulacion*100) / 100,
			SemestresPromedio:   math.Round(semestresPromedio*100) / 100,
			EficienciaEgreso:    math.Round(eficienciaEgreso*100) / 100,
			EgresoOportunoPct:   math.Round(egresoOportunoPct*100) / 100,
			Retencion1erAnioPct: math.Round(retencion1er*100) / 100,
			Retencion3erAnioPct: math.Round(retencion3er*100) / 100,
		},
		DistribucionSemestres: distribucion,
		RamosCriticos:         ramosCriticos,
		HeatmapEstadoSemestre: heatmapEstadoSemestre,
		TransicionesEstado:    transicionesEstado,
		SensibilidadTornado:   sensibilidadTornado,
	}
}
