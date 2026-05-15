// Package engine implementa la simulación Montecarlo del paper
// "Simulación del desempeño de los estudiantes en el plan de estudio
// de la carrera de Ingeniería Civil Eléctrica" (Mendoza Baeza, 2023).
//
// La simulación es una única pasada sobre NE alumnos. La aleatoriedad
// agregada sale del tamaño de la cohorte, no de un wrapper externo de
// iteraciones (intencionalmente: ese wrap, que existía en versiones
// previas, sesgaba PSCE/EE al promediar sobre corridas donde a veces no
// había titulados).
//
// El código está dividido por responsabilidad:
//   - engine.go      : entry point y orquestación
//   - helpers.go     : normalización de malla y utilidades
//   - student.go     : simulación de la trayectoria de un alumno
//   - aggregator.go  : consolidación de métricas globales
//   - sensitivity.go : análisis tornado de parámetros
package engine

import (
	"math/rand"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// DefaultNE es el número de alumnos del paper para Montecarlo (Tabla 5).
const DefaultNE = 15000

// EjecutarMontecarlo ejecuta la simulación Montecarlo completa sobre NE
// alumnos en una única pasada. Si NE no se especifica, usa DefaultNE.
// El resultado incluye análisis de sensibilidad para el diagrama tornado.
func EjecutarMontecarlo(req models.SimularRequest) models.SimulacionResponse {
	if req.Variables.NE <= 0 {
		req.Variables.NE = DefaultNE
	}
	return runMontecarlo(req, true)
}

// runMontecarlo encapsula la corrida completa: setup → simulación por
// alumno → agregación → (opcional) sensibilidad. includeSensitivity=false
// en las sub-corridas del análisis tornado evita recursión infinita.
func runMontecarlo(req models.SimularRequest, includeSensitivity bool) models.SimulacionResponse {
	malla := normalizeMalla(req.Asignaturas)
	rng := newRNG(req.Variables.Seed)

	resultados := simulateStudents(req, malla, rng)
	response := aggregateResults(req, malla, resultados)

	if includeSensitivity {
		response.SensibilidadTornado = sensitivityAnalysis(req)
	} else {
		response.SensibilidadTornado = make([]models.SensibilidadParametro, 0)
	}

	return response
}

func newRNG(seed int64) *rand.Rand {
	if seed != 0 {
		return rand.New(rand.NewSource(seed))
	}
	return rand.New(rand.NewSource(rand.Int63()))
}
