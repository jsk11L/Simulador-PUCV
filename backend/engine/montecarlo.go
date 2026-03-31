package engine

import (
	"math"
	"math/rand"
	"sync"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// EjecutarMontecarlo ejecuta la simulación estocástica completa.
// Retorna un SimulacionResponse con todas las métricas del Paper.
func EjecutarMontecarlo(req models.SimularRequest) models.SimulacionResponse {
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

			for estado == models.Activo && semestreActual <= 30 {
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
						}
					}
				}

				if estado == models.EliminadoOpor {
					break
				}

				// Chequear Tasa de Avance (TAmin)
				if semestreActual >= req.Variables.NapTAmin {
					if float64(creditosAprobadosTotales)/float64(semestreActual) < req.Variables.TAmin {
						estado = models.EliminadoTAmin
						break
					}
				}

				semestreActual++
			}

			resultadosChan <- models.ResultadoAlumno{
				Estado:            estado,
				SemestresUsados:   semestreActual,
				ReprobacionesRamo: reprobacionesLocal,
				IntentosRamo:      intentosLocal,
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
	}
}
