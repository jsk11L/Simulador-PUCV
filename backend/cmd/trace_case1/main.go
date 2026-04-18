package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/jsk11L/Simulador-PUCV/models"
)

type scenarioInput struct {
	Scenario     string                      `json:"scenario"`
	Asignaturas  []models.AsignaturaPayload  `json:"asignaturas"`
	Programacion *models.ProgramacionPayload `json:"programacion,omitempty"`
}

type traceEvent struct {
	Event     string      `json:"event"`
	Scenario  string      `json:"scenario,omitempty"`
	Iteration int         `json:"iteration,omitempty"`
	Student   int         `json:"student,omitempty"`
	Semester  int         `json:"semester,omitempty"`
	State     string      `json:"state,omitempty"`
	Data      interface{} `json:"data,omitempty"`
}

type histSnapshot struct {
	Sigla       string `json:"sigla"`
	Aprobado    bool   `json:"aprobado"`
	Oportunidad int    `json:"oportunidad"`
}

type semesterTrace struct {
	ProgrammedIDs           []string            `json:"programmed_ids,omitempty"`
	OfferOrder              []string            `json:"offer_order,omitempty"`
	CandidateChecks         []candidateTrace    `json:"candidate_checks,omitempty"`
	Enrollments             []approvalTrace     `json:"enrollments,omitempty"`
	HistoryBefore           []histSnapshot      `json:"history_before,omitempty"`
	HistoryAfter            []histSnapshot      `json:"history_after,omitempty"`
	StateBefore             string              `json:"state_before,omitempty"`
	StateAfter              string              `json:"state_after,omitempty"`
	CreditsInscritos        int                 `json:"credits_inscritos,omitempty"`
	CreditsAprobadosTotales int                 `json:"credits_aprobados_totales,omitempty"`
	ReprobacionesPorRamo    map[string]int      `json:"reprobaciones_por_ramo,omitempty"`
	IntentosPorRamo         map[string]int      `json:"intentos_por_ramo,omitempty"`
	RawTurnos               []semesterTurnTrace `json:"raw_turnos,omitempty"`
}

type semesterTurnTrace struct {
	AsigID          string   `json:"asig_id"`
	AlreadyApproved bool     `json:"already_approved"`
	Prereqs         []string `json:"prereqs,omitempty"`
	PrereqsOK       bool     `json:"prereqs_ok"`
	CreditsBefore   int      `json:"credits_before"`
	CreditsAfter    int      `json:"credits_after"`
	Chosen          bool     `json:"chosen"`
	SkippedReason   string   `json:"skipped_reason,omitempty"`
}

type candidateTrace struct {
	AsigID          string   `json:"asig_id"`
	AlreadyApproved bool     `json:"already_approved"`
	Prereqs         []string `json:"prereqs,omitempty"`
	PrereqsOK       bool     `json:"prereqs_ok"`
	CreditsBefore   int      `json:"credits_before"`
	CreditsAfter    int      `json:"credits_after"`
	Eligible        bool     `json:"eligible"`
	Reason          string   `json:"reason,omitempty"`
}

type approvalTrace struct {
	AsigID      string  `json:"asig_id"`
	Semestre    int     `json:"semestre"`
	VMap        float64 `json:"vmap"`
	Delta       float64 `json:"delta"`
	RandNorm    float64 `json:"rand_norm"`
	AbsValue    float64 `json:"abs_value"`
	Threshold   float64 `json:"threshold"`
	Approved    bool    `json:"approved"`
	Oportunidad int     `json:"oportunidad"`
}

type studentTrace struct {
	StudentIndex int           `json:"student_index"`
	FinalState   string        `json:"final_state"`
	Semestres    int           `json:"semestres_usados"`
	Metrics      studentMetric `json:"metrics"`
	Timeline     []string      `json:"timeline"`
}

type studentMetric struct {
	Aprobadas  int `json:"aprobadas"`
	Reprobadas int `json:"reprobadas"`
}

func main() {
	scenarioID := getenvDefault("SCENARIO_ID", "caso_actual")
	iterations := getenvIntDefault("ITERATIONS", 1)
	seed := int64(getenvIntDefault("SEED", 20260416))
	traceOut := getenvDefault("TRACE_OUT", filepath.Join("..", "..", "analysis", "traces", "case1_go.jsonl"))

	if scenarioID != "caso_actual" {
		panic("trace_case1 is intentionally restricted to caso_actual")
	}

	scenarioPath := filepath.Join("..", "original", "scenarios", scenarioID+".json")
	raw, err := os.ReadFile(scenarioPath)
	if err != nil {
		panic(err)
	}

	var in scenarioInput
	if err := json.Unmarshal(raw, &in); err != nil {
		panic(err)
	}
	if len(in.Asignaturas) == 0 {
		panic("scenario has no asignaturas")
	}

	if err := os.MkdirAll(filepath.Dir(traceOut), 0o755); err != nil {
		panic(err)
	}
	file, err := os.Create(traceOut)
	if err != nil {
		panic(err)
	}
	defer file.Close()

	writer := bufio.NewWriter(file)
	defer writer.Flush()
	enc := json.NewEncoder(writer)

	mustWrite := func(event traceEvent) {
		if err := enc.Encode(event); err != nil {
			panic(err)
		}
	}

	mustWrite(traceEvent{
		Event:    "scenario_loaded",
		Scenario: in.Scenario,
		Data: map[string]any{
			"scenario_id":  scenarioID,
			"seed":         seed,
			"iterations":   iterations,
			"asignaturas":  in.Asignaturas,
			"programacion": in.Programacion,
		},
	})

	for iter := 1; iter <= iterations; iter++ {
		mustWrite(traceEvent{Event: "iteration_start", Scenario: in.Scenario, Iteration: iter, Data: map[string]any{"seed": seed + int64(iter-1)}})

		runSeed := seed + int64(iter-1)*1000003
		result := runTraceOnce(in, iter, runSeed, mustWrite)

		mustWrite(traceEvent{
			Event:     "iteration_end",
			Scenario:  in.Scenario,
			Iteration: iter,
			Data:      result,
		})
	}

	mustWrite(traceEvent{Event: "trace_completed", Scenario: in.Scenario, Data: map[string]any{"trace_out": traceOut}})
	fmt.Println(traceOut)
}

func runTraceOnce(in scenarioInput, iteration int, seed int64, emit func(traceEvent)) map[string]any {
	const NE = 2
	const NCSmax = 21
	const TAmin = 12.3
	const NapTAmin = 10
	const Opor = 6

	const VMap1234 = 0.48
	const Delta1234 = 0.2
	const VMap5678 = 0.55
	const Delta5678 = 0.2
	const VMapM = 0.65
	const DeltaM = 0.25

	mallaMap := make(map[string]models.AsignaturaPayload, len(in.Asignaturas))
	asignaturasOrdenadas := make([]models.AsignaturaPayload, 0, len(in.Asignaturas))
	maxSemestreMalla := 0
	for _, rawAsig := range in.Asignaturas {
		asig := rawAsig
		asig.ID = normalizeCourseID(asig.ID)
		asig.Reqs = normalizeReqIDs(asig.Reqs)
		if asig.ID == "" {
			continue
		}
		mallaMap[asig.ID] = asig
		asignaturasOrdenadas = append(asignaturasOrdenadas, asig)
		if asig.Semestre > maxSemestreMalla {
			maxSemestreMalla = asig.Semestre
		}
	}

	sort.SliceStable(asignaturasOrdenadas, func(i, j int) bool {
		a := asignaturasOrdenadas[i]
		b := asignaturasOrdenadas[j]
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

	type resultAlumno struct {
		Estado          models.EstadoAlumno
		SemestresUsados int
		Aprobadas       int
		Reprobadas      int
		Timeline        []string
	}

	resultados := make([]resultAlumno, 0, NE)
	metricas := map[string]float64{}

	for student := 0; student < NE; student++ {
		studentSeed := seed + int64(student) + 1
		rng := randSource(studentSeed)
		estado := models.Activo
		semestreActual := 1
		semestresCursados := 0
		creditosAprobadosTotales := 0
		historial := make(map[string]*models.HistorialAsignatura)
		intentosLocal := make(map[string]int)
		reprobacionesLocal := make(map[string]int)
		estadoTimeline := make([]models.EstadoAlumno, 0, 30)

		emit(traceEvent{
			Event:     "student_start",
			Iteration: iteration,
			Student:   student + 1,
			State:     estadoToLabel(estado),
			Data: map[string]any{
				"seed":                     studentSeed,
				"max_semestres":            0,
				"creditos_aprobados_total": creditosAprobadosTotales,
				"historial":                snapshotHistorial(historial),
				"state_timeline":           []string{},
			},
		})

		for estado == models.Activo {
			if semestreActual > maxSemestreMalla+10 {
				break
			}

			semesterPayload := semesterTrace{
				StateBefore:             estadoToLabel(estado),
				CreditsAprobadosTotales: creditosAprobadosTotales,
				HistoryBefore:           snapshotHistorial(historial),
				ReprobacionesPorRamo:    copyIntMap(reprobacionesLocal),
				IntentosPorRamo:         copyIntMap(intentosLocal),
			}

			programmedIDs := programmedIDsForSemesterLocal(in, semestreActual)
			semesterPayload.ProgrammedIDs = append([]string(nil), programmedIDs...)
			semesterPayload.OfferOrder = append([]string(nil), programmedIDs...)
			emit(traceEvent{
				Event:     "semester_start",
				Iteration: iteration,
				Student:   student + 1,
				Semester:  semestreActual,
				State:     estadoToLabel(estado),
				Data:      semesterPayload,
			})

			creditosInscritos := 0
			var asignaturasTomadas []string
			seen := make(map[string]bool)
			candidateChecks := make([]candidateTrace, 0)
			rawTurnos := make([]semesterTurnTrace, 0)

			tryEnroll := func(asig models.AsignaturaPayload) {
				candidate := candidateTrace{AsigID: asig.ID, CreditsBefore: creditosInscritos}
				turno := semesterTurnTrace{AsigID: asig.ID, CreditsBefore: creditosInscritos}

				if seen[asig.ID] {
					candidate.Reason = "duplicate_in_same_semester"
					turno.SkippedReason = candidate.Reason
					candidateChecks = append(candidateChecks, candidate)
					rawTurnos = append(rawTurnos, turno)
					return
				}
				seen[asig.ID] = true

				if h, ok := historial[asig.ID]; ok && h.Aprobado {
					candidate.AlreadyApproved = true
					candidate.Reason = "already_approved"
					turno.AlreadyApproved = true
					turno.SkippedReason = candidate.Reason
					candidateChecks = append(candidateChecks, candidate)
					rawTurnos = append(rawTurnos, turno)
					return
				}

				candidate.Prereqs = append([]string(nil), asig.Reqs...)
				turno.Prereqs = append([]string(nil), asig.Reqs...)
				cumpleReqs := true
				for _, reqSigla := range asig.Reqs {
					reqSigla = normalizeCourseID(reqSigla)
					if reqSigla == "" {
						continue
					}
					if reqHist, ok := historial[reqSigla]; !ok || !reqHist.Aprobado {
						cumpleReqs = false
						break
					}
				}
				candidate.PrereqsOK = cumpleReqs
				turno.PrereqsOK = cumpleReqs
				if !cumpleReqs {
					candidate.Reason = "prereqs_not_met"
					turno.SkippedReason = candidate.Reason
					candidateChecks = append(candidateChecks, candidate)
					rawTurnos = append(rawTurnos, turno)
					return
				}

				candidate.CreditsAfter = creditosInscritos + asig.Cred
				turno.CreditsAfter = candidate.CreditsAfter
				if creditosInscritos+asig.Cred <= NCSmax {
					asignaturasTomadas = append(asignaturasTomadas, asig.ID)
					creditosInscritos += asig.Cred
					candidate.Eligible = true
					candidate.Reason = "enrolled"
					turno.Chosen = true
				} else {
					candidate.Eligible = false
					candidate.Reason = "credits_limit"
					turno.SkippedReason = candidate.Reason
				}
				candidateChecks = append(candidateChecks, candidate)
				rawTurnos = append(rawTurnos, turno)
			}

			if len(programmedIDs) > 0 {
				for _, rawID := range programmedIDs {
					id := normalizeCourseID(rawID)
					if id == "" || id == "0" {
						continue
					}
					asig, ok := mallaMap[id]
					if !ok {
						continue
					}
					tryEnroll(asig)
				}
			} else {
				for _, asig := range asignaturasOrdenadas {
					if !shouldOfferByParity(asig, semestreActual) {
						continue
					}
					tryEnroll(asig)
				}
			}

			emit(traceEvent{
				Event:     "semester_candidates",
				Iteration: iteration,
				Student:   student + 1,
				Semester:  semestreActual,
				State:     estadoToLabel(estado),
				Data: semesterTrace{
					ProgrammedIDs:    programmedIDs,
					OfferOrder:       collectedOfferOrder(in, programmedIDs, semestreActual),
					CandidateChecks:  candidateChecks,
					RawTurnos:        rawTurnos,
					CreditsInscritos: creditosInscritos,
					StateBefore:      estadoToLabel(estado),
					HistoryBefore:    snapshotHistorial(historial),
				},
			})

			if len(asignaturasTomadas) == 0 {
				todasAprobadas := true
				for _, a := range asignaturasOrdenadas {
					if h, ok := historial[a.ID]; !ok || !h.Aprobado {
						todasAprobadas = false
						break
					}
				}
				if todasAprobadas {
					estado = models.Titulado
					estadoTimeline = append(estadoTimeline, estado)
					emit(traceEvent{Event: "student_titled", Iteration: iteration, Student: student + 1, Semester: semestreActual, State: estadoToLabel(estado), Data: map[string]any{"reason": "all_approved_without_more_courses"}})
					break
				}
			}

			approvalEvents := make([]approvalTrace, 0, len(asignaturasTomadas))
			for _, sigla := range asignaturasTomadas {
				asig := mallaMap[sigla]
				vmap, delta := VMapM, DeltaM
				if asig.Semestre <= 4 {
					vmap, delta = VMap1234, Delta1234
				} else if asig.Semestre <= 8 {
					vmap, delta = VMap5678, Delta5678
				}
				randNorm := rng.NormFloat64()
				r := mathAbs(vmap + delta*randNorm)
				aprobado := r >= asig.Rep

				if _, ok := historial[sigla]; !ok {
					historial[sigla] = &models.HistorialAsignatura{Sigla: sigla, Oportunidad: 0}
				}
				historial[sigla].Oportunidad++
				intentosLocal[sigla]++

				approvalEvents = append(approvalEvents, approvalTrace{
					AsigID:      sigla,
					Semestre:    semestreActual,
					VMap:        vmap,
					Delta:       delta,
					RandNorm:    randNorm,
					AbsValue:    r,
					Threshold:   asig.Rep,
					Approved:    aprobado,
					Oportunidad: historial[sigla].Oportunidad,
				})

				if aprobado {
					historial[sigla].Aprobado = true
					creditosAprobadosTotales += asig.Cred
				} else {
					reprobacionesLocal[sigla]++
					if historial[sigla].Oportunidad >= Opor {
						estado = models.EliminadoOpor
					}
				}
			}

			if estado == models.EliminadoOpor {
				estadoTimeline = append(estadoTimeline, estado)
				emit(traceEvent{Event: "semester_end", Iteration: iteration, Student: student + 1, Semester: semestreActual, State: estadoToLabel(estado), Data: semesterTrace{StateAfter: estadoToLabel(estado), CreditsAprobadosTotales: creditosAprobadosTotales, CreditsInscritos: creditosInscritos, Enrollments: approvalEvents, HistoryAfter: snapshotHistorial(historial), ReprobacionesPorRamo: copyIntMap(reprobacionesLocal), IntentosPorRamo: copyIntMap(intentosLocal), RawTurnos: rawTurnos}})
				break
			}

			semestresCursados = semestreActual

			if semestresCursados >= NapTAmin {
				if float64(creditosAprobadosTotales)/float64(semestresCursados) < TAmin {
					estado = models.EliminadoTAmin
					estadoTimeline = append(estadoTimeline, estado)
					emit(traceEvent{Event: "semester_end", Iteration: iteration, Student: student + 1, Semester: semestreActual, State: estadoToLabel(estado), Data: semesterTrace{StateAfter: estadoToLabel(estado), CreditsAprobadosTotales: creditosAprobadosTotales, CreditsInscritos: creditosInscritos, Enrollments: approvalEvents, HistoryAfter: snapshotHistorial(historial), ReprobacionesPorRamo: copyIntMap(reprobacionesLocal), IntentosPorRamo: copyIntMap(intentosLocal), RawTurnos: rawTurnos}})
					break
				}
			}

			estadoTimeline = append(estadoTimeline, estado)
			emit(traceEvent{Event: "semester_end", Iteration: iteration, Student: student + 1, Semester: semestreActual, State: estadoToLabel(estado), Data: semesterTrace{StateAfter: estadoToLabel(estado), CreditsAprobadosTotales: creditosAprobadosTotales, CreditsInscritos: creditosInscritos, Enrollments: approvalEvents, HistoryAfter: snapshotHistorial(historial), ReprobacionesPorRamo: copyIntMap(reprobacionesLocal), IntentosPorRamo: copyIntMap(intentosLocal), RawTurnos: rawTurnos}})
			semestreActual++
		}

		aprobadas := 0
		reprobadas := 0
		for _, h := range historial {
			if h.Aprobado {
				aprobadas++
			} else {
				reprobadas++
			}
		}

		resultados = append(resultados, resultAlumno{Estado: estado, SemestresUsados: semestreActual, Aprobadas: aprobadas, Reprobadas: reprobadas, Timeline: cloneEstadoTimeline(estadoTimeline)})
		emit(traceEvent{Event: "student_end", Iteration: iteration, Student: student + 1, State: estadoToLabel(estado), Semester: semestreActual, Data: studentTrace{StudentIndex: student + 1, FinalState: estadoToLabel(estado), Semestres: semestreActual, Metrics: studentMetric{Aprobadas: aprobadas, Reprobadas: reprobadas}, Timeline: cloneEstadoTimeline(estadoTimeline)}})
	}

	metricas["alumnos_simulados"] = float64(NE)
	for _, r := range resultados {
		if r.Estado == models.Titulado {
			metricas["titulados"]++
		}
	}

	finalData := map[string]any{
		"resultados": resultados,
		"metricas":   metricas,
	}
	return finalData
}

func programmedIDsForSemesterLocal(in scenarioInput, semestreActual int) []string {
	if in.Programacion == nil {
		return nil
	}
	if semestreActual%2 == 0 {
		return append([]string(nil), in.Programacion.Par...)
	}
	return append([]string(nil), in.Programacion.Impar...)
}

func collectedOfferOrder(in scenarioInput, programmedIDs []string, semestreActual int) []string {
	if len(programmedIDs) > 0 {
		out := make([]string, 0, len(programmedIDs))
		for _, id := range programmedIDs {
			n := normalizeCourseID(id)
			if n == "" || n == "0" {
				continue
			}
			out = append(out, n)
		}
		return out
	}
	asignaturasOrdenadas := make([]models.AsignaturaPayload, 0, len(in.Asignaturas))
	for _, rawAsig := range in.Asignaturas {
		asig := rawAsig
		asig.ID = normalizeCourseID(asig.ID)
		if asig.ID == "" {
			continue
		}
		asignaturasOrdenadas = append(asignaturasOrdenadas, asig)
	}
	sort.SliceStable(asignaturasOrdenadas, func(i, j int) bool {
		a := asignaturasOrdenadas[i]
		b := asignaturasOrdenadas[j]
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

	order := make([]string, 0, len(asignaturasOrdenadas))
	for _, asig := range asignaturasOrdenadas {
		if !shouldOfferByParity(asig, semestreActual) {
			continue
		}
		order = append(order, asig.ID)
	}
	return order
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
	if asig.Semestre <= 0 {
		return true
	}
	isImpar := asig.Semestre%2 != 0
	currentIsImpar := semestreActual%2 != 0
	return isImpar == currentIsImpar
}

func snapshotHistorial(historial map[string]*models.HistorialAsignatura) []histSnapshot {
	out := make([]histSnapshot, 0, len(historial))
	for sigla, h := range historial {
		out = append(out, histSnapshot{Sigla: sigla, Aprobado: h.Aprobado, Oportunidad: h.Oportunidad})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Sigla < out[j].Sigla })
	return out
}

func cloneEstadoTimeline(in []models.EstadoAlumno) []string {
	out := make([]string, 0, len(in))
	for _, st := range in {
		out = append(out, estadoToLabel(st))
	}
	return out
}

func copyIntMap(in map[string]int) map[string]int {
	out := make(map[string]int, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
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

func randSource(seed int64) *rand.Rand {
	return rand.New(rand.NewSource(seed))
}

func mathAbs(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}

func getenvDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getenvIntDefault(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			return parsed
		}
	}
	return fallback
}
