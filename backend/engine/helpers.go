package engine

import (
	"sort"
	"strings"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// mallaContext encapsula la malla preparada para simular: lookup O(1) por
// sigla, orden determinista de fallback cuando no hay programación, IDs
// del primer semestre, y semestre máximo (usado para egreso oportuno y
// eficiencia de egreso).
type mallaContext struct {
	Mapa          map[string]models.AsignaturaPayload
	Normalizadas  []models.AsignaturaPayload
	Fallback      []models.AsignaturaPayload
	FirstSemester []string
	MaxSemestre   int
}

func normalizeMalla(asignaturas []models.AsignaturaPayload) mallaContext {
	mapa := make(map[string]models.AsignaturaPayload)
	normalizadas := make([]models.AsignaturaPayload, 0, len(asignaturas))
	maxSem := 0
	for _, rawAsig := range asignaturas {
		asig := rawAsig
		asig.ID = normalizeCourseID(asig.ID)
		asig.Reqs = normalizeReqIDs(asig.Reqs)
		if asig.ID == "" {
			continue
		}
		mapa[asig.ID] = asig
		normalizadas = append(normalizadas, asig)
		if asig.Semestre > maxSem {
			maxSem = asig.Semestre
		}
	}

	fallback := append([]models.AsignaturaPayload(nil), normalizadas...)
	sort.SliceStable(fallback, func(i, j int) bool {
		a := fallback[i]
		b := fallback[j]
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

	firstSem := make([]string, 0)
	for _, asig := range normalizadas {
		if asig.Semestre == 1 {
			firstSem = append(firstSem, asig.ID)
		}
	}

	return mallaContext{
		Mapa:          mapa,
		Normalizadas:  normalizadas,
		Fallback:      fallback,
		FirstSemester: firstSem,
		MaxSemestre:   maxSem,
	}
}

// selectVmapDelta devuelve los parámetros del modelo de calificaciones para
// el tramo del semestre dado: ciclo básico (1-4), profesional (5-8) o
// titulación (≥9).
func selectVmapDelta(modelo models.ModeloPayload, sem int) (float64, float64) {
	if sem >= 2 && sem <= 4 {
		return modelo.VMap1234, modelo.Delta1234
	}
	if sem >= 5 && sem <= 8 {
		return modelo.VMap5678, modelo.Delta5678
	}
	if sem == 1 {
		return modelo.VMap1234, modelo.Delta1234
	}
	return modelo.VMapM, modelo.DeltaM
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
