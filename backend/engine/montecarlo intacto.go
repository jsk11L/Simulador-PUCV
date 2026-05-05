package engine

import (
	"fmt"
	"math"
	"math/rand"
	"sort"
	"strconv"
	"strings"

	"github.com/jsk11L/Simulador-PUCV/models"
)

const defaultMontecarloIterations = 15000

type montecarloAccumulator struct {
	metricas      models.MetricasGlobales
	distribucion  map[int]float64
	ramosCriticos map[string]*models.RamoCritico
	heatmap       map[int]*models.HeatmapEstadoSemestre
	transiciones  map[string]float64
}

func newMontecarloAccumulator() *montecarloAccumulator {
	return &montecarloAccumulator{
		distribucion:  make(map[int]float64),
		ramosCriticos: make(map[string]*models.RamoCritico),
		heatmap:       make(map[int]*models.HeatmapEstadoSemestre),
		transiciones:  make(map[string]float64),
	}
}

func (a *montecarloAccumulator) merge(res models.SimulacionResponse) {
	a.metricas.AlumnosSimulados += res.MetricasGlobales.AlumnosSimulados
	a.metricas.Titulados += res.MetricasGlobales.Titulados
	a.metricas.EliminadosTamin += res.MetricasGlobales.EliminadosTamin
	a.metricas.EliminadosOpor += res.MetricasGlobales.EliminadosOpor
	a.metricas.TasaTitulacionPct += res.MetricasGlobales.TasaTitulacionPct
	a.metricas.SemestresPromedio += res.MetricasGlobales.SemestresPromedio
	a.metricas.EficienciaEgreso += res.MetricasGlobales.EficienciaEgreso
	a.metricas.EgresoOportunoPct += res.MetricasGlobales.EgresoOportunoPct
	a.metricas.Retencion1erAnioPct += res.MetricasGlobales.Retencion1erAnioPct
	a.metricas.Retencion3erAnioPct += res.MetricasGlobales.Retencion3erAnioPct

	for sem, valor := range res.DistribucionSemestres {
		a.distribucion[sem] += valor
	}

	for _, ramo := range res.RamosCriticos {
		agregado, ok := a.ramosCriticos[ramo.Sigla]
		if !ok {
			agregado = &models.RamoCritico{Sigla: ramo.Sigla}
			a.ramosCriticos[ramo.Sigla] = agregado
		}
		agregado.Intentos += ramo.Intentos
		agregado.Reprobaciones += ramo.Reprobaciones
	}

	for _, fila := range res.HeatmapEstadoSemestre {
		agregado, ok := a.heatmap[fila.Semestre]
		if !ok {
			agregado = &models.HeatmapEstadoSemestre{Semestre: fila.Semestre}
			a.heatmap[fila.Semestre] = agregado
		}
		agregado.Activos += fila.Activos
		agregado.Titulados += fila.Titulados
		agregado.EliminadosTA += fila.EliminadosTA
		agregado.EliminadosOpor += fila.EliminadosOpor
	}

	for _, transicion := range res.TransicionesEstado {
		key := fmt.Sprintf("%d|%s|%s", transicion.Semestre, transicion.From, transicion.To)
		a.transiciones[key] += transicion.Value
	}
}

func (a *montecarloAccumulator) finalize(iteraciones int) models.SimulacionResponse {
	if iteraciones <= 0 {
		iteraciones = 1
	}

	divisor := float64(iteraciones)
	round2 := func(v float64) float64 {
		return math.Round(v*100) / 100
	}

	metricas := models.MetricasGlobales{
		AlumnosSimulados:    round2(a.metricas.AlumnosSimulados / divisor),
		Titulados:           round2(a.metricas.Titulados / divisor),
		EliminadosTamin:     round2(a.metricas.EliminadosTamin / divisor),
		EliminadosOpor:      round2(a.metricas.EliminadosOpor / divisor),
		TasaTitulacionPct:   round2(a.metricas.TasaTitulacionPct / divisor),
		SemestresPromedio:   round2(a.metricas.SemestresPromedio / divisor),
		EficienciaEgreso:    round2(a.metricas.EficienciaEgreso / divisor),
		EgresoOportunoPct:   round2(a.metricas.EgresoOportunoPct / divisor),
		Retencion1erAnioPct: round2(a.metricas.Retencion1erAnioPct / divisor),
		Retencion3erAnioPct: round2(a.metricas.Retencion3erAnioPct / divisor),
	}

	distribucion := make(map[int]float64, len(a.distribucion))
	for sem, valor := range a.distribucion {
		distribucion[sem] = round2(valor / divisor)
	}

	ramosCriticos := make([]models.RamoCritico, 0, len(a.ramosCriticos))
	for _, ramo := range a.ramosCriticos {
		tasa := 0.0
		if ramo.Intentos > 0 {
			tasa = (ramo.Reprobaciones / ramo.Intentos) * 100
		}
		ramosCriticos = append(ramosCriticos, models.RamoCritico{
			Sigla:         ramo.Sigla,
			Intentos:      round2(ramo.Intentos / divisor),
			Reprobaciones: round2(ramo.Reprobaciones / divisor),
			TasaFalloPct:  round2(tasa),
		})
	}

	for i := 0; i < len(ramosCriticos); i++ {
		for j := i + 1; j < len(ramosCriticos); j++ {
			if ramosCriticos[j].TasaFalloPct > ramosCriticos[i].TasaFalloPct {
				ramosCriticos[i], ramosCriticos[j] = ramosCriticos[j], ramosCriticos[i]
			}
		}
	}

	semestresHeatmap := make([]int, 0, len(a.heatmap))
	for sem := range a.heatmap {
		semestresHeatmap = append(semestresHeatmap, sem)
	}
	sort.Ints(semestresHeatmap)

	heatmapEstadoSemestre := make([]models.HeatmapEstadoSemestre, 0, len(semestresHeatmap))
	for _, sem := range semestresHeatmap {
		fila := a.heatmap[sem]
		heatmapEstadoSemestre = append(heatmapEstadoSemestre, models.HeatmapEstadoSemestre{
			Semestre:       sem,
			Activos:        round2(fila.Activos / divisor),
			Titulados:      round2(fila.Titulados / divisor),
			EliminadosTA:   round2(fila.EliminadosTA / divisor),
			EliminadosOpor: round2(fila.EliminadosOpor / divisor),
		})
	}

	transicionesEstado := make([]models.TransicionEstado, 0, len(a.transiciones))
	for key, value := range a.transiciones {
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
			Value:    round2(value / divisor),
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

	return models.SimulacionResponse{
		Mensaje:               "Simulación completada con éxito",
		MetricasGlobales:      metricas,
		DistribucionSemestres: distribucion,
		RamosCriticos:         ramosCriticos,
		HeatmapEstadoSemestre: heatmapEstadoSemestre,
		TransicionesEstado:    transicionesEstado,
	}
}

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

func programmedIDsForSemester(req models.SimularRequest, semestreActual int) []string {
	if req.Programacion == nil {
		return nil
	}
	if semestreActual%2 == 0 {
		return req.Programacion.Par
	}
	return req.Programacion.Impar
}

func normalizeCourseID(id string) string {
	return strings.TrimSpace(id)
}

func normalizeReqIDs(reqs []string) []string {
	out := make([]string, 0, len(reqs))
	for _, req := range reqs {
		n := normalizeCourseID(req)
		if n == "" {
			continue
		}
		out = append(out, n)
	}
	return out
}

func shouldOfferByParity(asig models.AsignaturaPayload, semestreActual int) bool {
	if asig.Dictacion != "semestral" {
		return true
	}
	// Semestre 0 o negativo se trata como dato inválido: no bloquear por paridad.
	if asig.Semestre <= 0 {
		return true
	}
	isImpar := asig.Semestre%2 != 0
	currentIsImpar := semestreActual%2 != 0
	return isImpar == currentIsImpar
}

// EjecutarMontecarlo ejecuta la simulación estocástica completa.
// Retorna un SimulacionResponse con todas las métricas del Paper.
func EjecutarMontecarlo(req models.SimularRequest) models.SimulacionResponse {
	return ejecutarMontecarloPromedio(req, true)
}

func ejecutarMontecarloPromedio(req models.SimularRequest, includeSensitivity bool) models.SimulacionResponse {
	iteraciones := req.Variables.Iteraciones
	if iteraciones <= 0 {
		iteraciones = defaultMontecarloIterations
	}

	if iteraciones == 1 {
		return ejecutarMontecarlo(req, includeSensitivity)
	}

	acumulado := newMontecarloAccumulator()
	for i := 0; i < iteraciones; i++ {
		runReq := req
		if req.Variables.Seed != 0 {
			runReq.Variables.Seed = req.Variables.Seed + int64(i)*1000003
		}
		acumulado.merge(ejecutarMontecarlo(runReq, false))
	}

	resultado := acumulado.finalize(iteraciones)

	if includeSensitivity {
		basePPE := resultado.MetricasGlobales.TasaTitulacionPct

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

		sensibilidadTornado := make([]models.SensibilidadParametro, 0, len(scenarios))
		for _, sc := range scenarios {
			minusRes := ejecutarMontecarloPromedio(sc.apply(0.9), false)
			plusRes := ejecutarMontecarloPromedio(sc.apply(1.1), false)

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

		resultado.SensibilidadTornado = sensibilidadTornado
	}

	return resultado
}

func ejecutarMontecarlo(req models.SimularRequest, includeSensitivity bool) models.SimulacionResponse {
	mallaMap := make(map[string]models.AsignaturaPayload)
	asignaturasNormalizadas := make([]models.AsignaturaPayload, 0, len(req.Asignaturas))
	maxSemestreMalla := 0
	for _, rawAsig := range req.Asignaturas {
		asig := rawAsig
		asig.ID = normalizeCourseID(asig.ID)
		asig.Reqs = normalizeReqIDs(asig.Reqs)
		if asig.ID == "" {
			continue
		}
		mallaMap[asig.ID] = asig
		asignaturasNormalizadas = append(asignaturasNormalizadas, asig)
		if asig.Semestre > maxSemestreMalla {
			maxSemestreMalla = asig.Semestre
		}
	}

	asignaturasFallback := append([]models.AsignaturaPayload(nil), asignaturasNormalizadas...)
	sort.SliceStable(asignaturasFallback, func(i, j int) bool {
		a := asignaturasFallback[i]
		b := asignaturasFallback[j]
		const semInv = 1 << 30
		semA := a.Semestre
		if semA <= 0 {
			semA = semInv
		}
		semB := b.Semestre
		if semB <= 0 {
			semB = semInv
		}
		if semA == semB {
			return a.ID < b.ID
		}
		return semA < semB
	})

	firstSemesterIDs := make([]string, 0)
	for _, asig := range asignaturasNormalizadas {
		if asig.Semestre == 1 {
			firstSemesterIDs = append(firstSemesterIDs, asig.ID)
		}
	}

	selectVmapDelta := func(sem int) (float64, float64) {
		if sem >= 2 && sem <= 4 {
			return req.Modelo.VMap1234, req.Modelo.Delta1234
		}
		if sem >= 5 && sem <= 8 {
			return req.Modelo.VMap5678, req.Modelo.Delta5678
		}
		if sem == 1 {
			return req.Modelo.VMap1234, req.Modelo.Delta1234
		}
		return req.Modelo.VMapM, req.Modelo.DeltaM
	}

	countAprobadas := func(historial map[string]*models.HistorialAsignatura) int {
		total := 0
		for _, h := range historial {
			if h.Aprobado {
				total++
			}
		}
		return total
	}

	var rng *rand.Rand
	if req.Variables.Seed != 0 {
		rng = rand.New(rand.NewSource(req.Variables.Seed))
	} else {
		rng = rand.New(rand.NewSource(rand.Int63()))
	}

	resultados := make([]models.ResultadoAlumno, 0, req.Variables.NE)
	for alumnoID := 0; alumnoID < req.Variables.NE; alumnoID++ {
		estado := models.Activo
		semestreActual := 1
		ultimoSemestreConActividad := 0
		maxSemestres := req.Variables.MaxSemestres
		creditosAprobadosTotales := 0
		historial := make(map[string]*models.HistorialAsignatura)
		intentosLocal := make(map[string]int)
		reprobacionesLocal := make(map[string]int)
		estadoTimeline := make([]models.EstadoAlumno, 0, 30)
		pendientesEvaluacion := make([]string, 0)

		for _, id := range firstSemesterIDs {
			asig, ok := mallaMap[id]
			if !ok {
				continue
			}

			vmap, delta := selectVmapDelta(1)
			probExitoAlumno := math.Abs(vmap + delta*rng.NormFloat64())
			aprobado := probExitoAlumno >= asig.Rep

			historial[id] = &models.HistorialAsignatura{Sigla: id, Oportunidad: 1, Aprobado: aprobado}
			intentosLocal[id]++
			if aprobado {
				creditosAprobadosTotales += asig.Cred
			} else {
				reprobacionesLocal[id]++
				if req.Variables.Opor > 0 && historial[id].Oportunidad >= req.Variables.Opor {
					estado = models.EliminadoOpor
				}
			}
			ultimoSemestreConActividad = 1
		}

		if estado == models.Activo && semestreActual >= req.Variables.NapTAmin {
			if float64(creditosAprobadosTotales)/float64(semestreActual) < req.Variables.TAmin {
				estado = models.EliminadoTAmin
			}
		}

		if estado != models.Activo {
			estadoTimeline = append(estadoTimeline, estado)
		} else {
			estadoTimeline = append(estadoTimeline, models.Activo)
		}

		for estado == models.Activo {
			if maxSemestres > 0 && semestreActual >= maxSemestres {
				estado = models.EliminadoTAmin
				estadoTimeline = append(estadoTimeline, estado)
				break
			}

			if semestreActual > 1 {
				vmap, delta := selectVmapDelta(semestreActual)
				for _, sigla := range pendientesEvaluacion {
					asig, ok := mallaMap[sigla]
					if !ok {
						continue
					}

					probExitoAlumno := math.Abs(vmap + delta*rng.NormFloat64())
					aprobado := probExitoAlumno >= asig.Rep

					h, ok := historial[sigla]
					if !ok {
						h = &models.HistorialAsignatura{Sigla: sigla}
						historial[sigla] = h
					}
					h.Oportunidad++
					intentosLocal[sigla]++

					if aprobado {
						if !h.Aprobado {
							h.Aprobado = true
							creditosAprobadosTotales += asig.Cred
						}
					} else {
						reprobacionesLocal[sigla]++
						if req.Variables.Opor > 0 && h.Oportunidad >= req.Variables.Opor {
							estado = models.EliminadoOpor
						}
					}
				}

				if estado == models.Activo && semestreActual >= req.Variables.NapTAmin {
					if float64(creditosAprobadosTotales)/float64(semestreActual) < req.Variables.TAmin {
						estado = models.EliminadoTAmin
					}
				}

				if estado != models.Activo {
					estadoTimeline = append(estadoTimeline, estado)
					break
				}
			}

			nAp := countAprobadas(historial)
			semestreActual++

			programmedIDs := programmedIDsForSemester(req, semestreActual)
			candidatos := make([]string, 0)
			if len(programmedIDs) > 0 {
				for _, rawID := range programmedIDs {
					id := normalizeCourseID(rawID)
					if id == "" || id == "0" {
						continue
					}
					candidatos = append(candidatos, id)
				}
			} else {
				for _, asig := range asignaturasFallback {
					if !shouldOfferByParity(asig, semestreActual) {
						continue
					}
					candidatos = append(candidatos, asig.ID)
				}
			}

			filtrados := make([]string, 0, len(candidatos))
			for _, id := range candidatos {
				if h, ok := historial[id]; ok && h.Aprobado {
					continue
				}
				filtrados = append(filtrados, id)
			}

			pendientesEvaluacion = pendientesEvaluacion[:0]
			creditosInscritos := 0
			for _, id := range filtrados {
				asig, ok := mallaMap[id]
				if !ok {
					continue
				}

				cumpleReqs := true
				for _, reqSigla := range asig.Reqs {
					reqSigla = normalizeCourseID(reqSigla)
					if reqSigla == "" {
						continue
					}
					reqHist, ok := historial[reqSigla]
					if !ok || !reqHist.Aprobado {
						cumpleReqs = false
						break
					}
				}
				if !cumpleReqs {
					continue
				}

				if creditosInscritos+asig.Cred > req.Variables.NCSmax {
					continue
				}

				creditosInscritos += asig.Cred
				pendientesEvaluacion = append(pendientesEvaluacion, id)
				if _, ok := historial[id]; !ok {
					historial[id] = &models.HistorialAsignatura{Sigla: id, Oportunidad: 0, Aprobado: false}
				}
			}

			if len(pendientesEvaluacion) == 0 {
				if nAp == len(asignaturasNormalizadas) {
					estado = models.Titulado
				} else {
					estado = models.EliminadoTAmin
				}
				estadoTimeline = append(estadoTimeline, estado)
				break
			}

			if req.Variables.Opor > 0 {
				for _, h := range historial {
					if !h.Aprobado && h.Oportunidad >= req.Variables.Opor {
						estado = models.EliminadoOpor
						break
					}
				}
				if estado == models.EliminadoOpor {
					estadoTimeline = append(estadoTimeline, estado)
					break
				}
			}

			ultimoSemestreConActividad = semestreActual
			estadoTimeline = append(estadoTimeline, models.Activo)
		}

		if ultimoSemestreConActividad == 0 {
			ultimoSemestreConActividad = 1
		}

		resultados = append(resultados, models.ResultadoAlumno{
			Estado:            estado,
			SemestresUsados:   ultimoSemestreConActividad,
			ReprobacionesRamo: reprobacionesLocal,
			IntentosRamo:      intentosLocal,
			EstadoTimeline:    estadoTimeline,
		})
	}

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
	if maxSemestreMalla > 0 && titulados > 0 {
		eficienciaEgreso = semestresPromedio / float64(maxSemestreMalla)
	}
	egresoOportunoPct := (float64(egresoOportuno) / ne) * 100

	retencion1er := (ne - float64(estudiantesFueraPrimerAnio)) / ne * 100
	retencion3er := (ne - float64(estudiantesFueraTercerAnio)) / ne * 100

	var ramosCriticos []models.RamoCritico
	for _, asig := range asignaturasNormalizadas {
		intentos := intentosGlobal[asig.ID]
		reprob := reprobacionesGlobal[asig.ID]
		if intentos > 0 {
			ramosCriticos = append(ramosCriticos, models.RamoCritico{
				Sigla:         asig.ID,
				Intentos:      float64(intentos),
				Reprobaciones: float64(reprob),
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
			Value:    float64(value),
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
			AlumnosSimulados:    float64(req.Variables.NE),
			Titulados:           float64(titulados),
			EliminadosTamin:     float64(elimTA),
			EliminadosOpor:      float64(elimOpor),
			TasaTitulacionPct:   math.Round(tasaTitulacion*100) / 100,
			SemestresPromedio:   math.Round(semestresPromedio*100) / 100,
			EficienciaEgreso:    math.Round(eficienciaEgreso*100) / 100,
			EgresoOportunoPct:   math.Round(egresoOportunoPct*100) / 100,
			Retencion1erAnioPct: math.Round(retencion1er*100) / 100,
			Retencion3erAnioPct: math.Round(retencion3er*100) / 100,
		},
		DistribucionSemestres: func() map[int]float64 {
			resultado := make(map[int]float64, len(distribucion))
			for sem, valor := range distribucion {
				resultado[sem] = float64(valor)
			}
			return resultado
		}(),
		RamosCriticos: ramosCriticos,
		HeatmapEstadoSemestre: func() []models.HeatmapEstadoSemestre {
			resultado := make([]models.HeatmapEstadoSemestre, 0, len(heatmapEstadoSemestre))
			for _, fila := range heatmapEstadoSemestre {
				resultado = append(resultado, models.HeatmapEstadoSemestre{
					Semestre:       fila.Semestre,
					Activos:        float64(fila.Activos),
					Titulados:      float64(fila.Titulados),
					EliminadosTA:   float64(fila.EliminadosTA),
					EliminadosOpor: float64(fila.EliminadosOpor),
				})
			}
			return resultado
		}(),
		TransicionesEstado:  transicionesEstado,
		SensibilidadTornado: sensibilidadTornado,
	}
}
