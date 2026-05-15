package engine

import (
	"math"
	"math/rand"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// simulateStudents corre la trayectoria académica de NE alumnos sobre la
// misma malla y modelo. Todos los alumnos comparten el mismo RNG, así que
// el orden de ejecución importa para reproducibilidad con seed fija.
func simulateStudents(req models.SimularRequest, m mallaContext, rng *rand.Rand) []models.ResultadoAlumno {
	resultados := make([]models.ResultadoAlumno, 0, req.Variables.NE)
	for i := 0; i < req.Variables.NE; i++ {
		resultados = append(resultados, simulateStudent(req, m, rng))
	}
	return resultados
}

// simulateStudent simula la trayectoria académica de un único alumno.
// Replica el algoritmo del MATLAB original (MallasV12.m):
//  1. Primer semestre: evalúa ramos del semestre 1.
//  2. Chequeo TAmin si aplica.
//  3. Bucle semestral: evaluar pendientes → TAmin → avanzar → programar →
//     filtrar aprobados → validar prerrequisitos y NCSmax → chequear Opor.
//  4. Cierre por titulación, eliminación o tope MaxSemestres.
func simulateStudent(req models.SimularRequest, m mallaContext, rng *rand.Rand) models.ResultadoAlumno {
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

	// Primer semestre: ramos del semestre 1 se inscriben automáticamente.
	for _, id := range m.FirstSemester {
		asig, ok := m.Mapa[id]
		if !ok {
			continue
		}

		vmap, delta := selectVmapDelta(req.Modelo, 1)
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
			vmap, delta := selectVmapDelta(req.Modelo, semestreActual)
			for _, sigla := range pendientesEvaluacion {
				asig, ok := m.Mapa[sigla]
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
			for _, asig := range m.Fallback {
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
			asig, ok := m.Mapa[id]
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
			if nAp == len(m.Normalizadas) {
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

	return models.ResultadoAlumno{
		Estado:            estado,
		SemestresUsados:   ultimoSemestreConActividad,
		ReprobacionesRamo: reprobacionesLocal,
		IntentosRamo:      intentosLocal,
		EstadoTimeline:    estadoTimeline,
	}
}

func countAprobadas(historial map[string]*models.HistorialAsignatura) int {
	total := 0
	for _, h := range historial {
		if h.Aprobado {
			total++
		}
	}
	return total
}
