package engine

import (
	"fmt"
	"math"
	"math/rand"
	"sort"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// ==========================================
// GENERADOR DE ALUMNOS SINTÉTICOS
// ==========================================
// Produce trayectorias académicas individualizadas a partir de:
//   - Malla y programación (escenarios del paper o personalizada)
//   - Perfil oculto del alumno (esfuerzo, disciplina, tolerancia)
//   - Seed determinístico
//
// El generador es la fuente de verdad para backtesting: implementa
// internamente el efecto del perfil sobre la trayectoria. El motor de
// modificadores (Sprint 3) intentará INFERIR esos efectos desde el
// historial generado, sin acceso al perfil real.

// GeneratorConfig agrupa los parámetros de generación de UN alumno.
type GeneratorConfig struct {
	Profile       StudentProfile
	Asignaturas   []models.AsignaturaPayload
	Programacion  *models.ProgramacionPayload
	Variables     models.VariablesPayload // NCSmax, TAmin, NapTAmin, Opor, MaxSemestres
	Modelo        models.ModeloPayload
	Seed          int64

	// UntilSemestre corta la trayectoria al final del semestre N. 0 = corre
	// hasta cierre natural (titulación o eliminación).
	UntilSemestre int

	// Identificación opcional del alumno generado.
	RUT    string
	Nombre string
	Carrera string
}

// Generar produce el historial sintético completo de un alumno.
//
// El algoritmo replica la lógica del motor base (`simulateStudent`) pero
// con tres extensiones:
//
//  1. La probabilidad de éxito de cada ramo se ajusta por el esfuerzo del
//     alumno: P_alumno = P_motor + K·(esfuerzo − 0.5).
//  2. Cuando el ramo se resuelve (aprobado/reprobado) se muestra una nota
//     numérica desde N(μ, σ) con parámetros que dependen del perfil.
//  3. Se inyectan slots de FOFU obligatorios (ICR010, ICR020), 1 FOFU
//     adicional y 4 optativos en posiciones aleatorias dentro de su
//     ventana válida.
func (cfg GeneratorConfig) Generar() (models.StudentHistory, error) {
	if len(cfg.Asignaturas) == 0 {
		return models.StudentHistory{}, fmt.Errorf("generador: malla vacía")
	}
	if cfg.Variables.NCSmax <= 0 {
		return models.StudentHistory{}, fmt.Errorf("generador: NCSmax debe ser > 0")
	}

	rng := newRNG(cfg.Seed)
	malla := normalizeMalla(cfg.Asignaturas)

	maxSemSimulado := cfg.Variables.MaxSemestres
	if cfg.UntilSemestre > 0 && (maxSemSimulado == 0 || cfg.UntilSemestre < maxSemSimulado) {
		maxSemSimulado = cfg.UntilSemestre
	}
	if maxSemSimulado == 0 {
		maxSemSimulado = 30 // cota dura para evitar bucles infinitos en mallas raras
	}

	// Pre-asignar semestres de electivos: ICR010, ICR020, FOFU adicional, 4 optativos.
	electivos := planificarElectivos(rng, maxSemSimulado)

	// Estado del alumno
	historialRamos := make(map[string]*models.HistorialAsignatura)
	intentosLocal := make(map[string]int)
	creditosAprobados := 0
	pendientesEval := make([]string, 0) // siglas inscritas este semestre (de la malla)

	// Inicializar siempre Semestres como slice vacío (no nil) para garantizar
	// que el JSON serializado sea [] en vez de null. Esto evita crashes en el
	// frontend al iterar sobre hist.semestres.
	hist := models.StudentHistory{
		RUT:       cfg.RUT,
		Nombre:    cfg.Nombre,
		Carrera:   cfg.Carrera,
		Estado:    models.TrayectoriaActiva,
		Semestres: make([]models.SemesterRecord, 0),
	}

	semestreActual := 1
	estado := models.Activo

	// Semestre 1: ramos del primer semestre se inscriben automáticamente.
	// Cursos también inicializado como [] para misma razón.
	semRecord := models.SemesterRecord{
		Cursos: make([]models.SubjectRecord, 0),
	}
	semRecord.Anio, semRecord.Semestre = anioSemestreFromIdx(1, baseYear(cfg))
	semRecord.Periodo = periodoIDFor(semRecord.Anio, semRecord.Semestre)

	for _, id := range malla.FirstSemester {
		asig, ok := malla.Mapa[id]
		if !ok {
			continue
		}
		aprobado, nota := simulateGradeOnRamo(rng, cfg.Profile, asig, cfg.Modelo, 1)
		historialRamos[id] = &models.HistorialAsignatura{Sigla: id, Oportunidad: 1, Aprobado: aprobado}
		intentosLocal[id]++
		if aprobado {
			creditosAprobados += asig.Cred
		} else {
			// El motor aún no marca eliminadoOpor en sem 1 con Opor>1; mantenemos coherencia.
			if cfg.Variables.Opor > 0 && historialRamos[id].Oportunidad >= cfg.Variables.Opor {
				estado = models.EliminadoOpor
			}
		}
		semRecord.Cursos = append(semRecord.Cursos, models.SubjectRecord{
			Sigla:     asig.ID,
			Nombre:    "", // la malla no trae nombres legibles, queda vacío
			Creditos:  asig.Cred,
			Nota:      nota,
			Estado:    aprobadoToEstado(aprobado),
			Categoria: models.CategoriaObligatoria,
		})
	}
	appendElectivosDelSemestre(&semRecord, electivos, 1, rng, cfg.Profile, &creditosAprobados, historialRamos, intentosLocal)
	hist.Semestres = append(hist.Semestres, semRecord)

	// TAmin sólo aplica desde NapTAmin
	if estado == models.Activo && semestreActual >= cfg.Variables.NapTAmin {
		if float64(creditosAprobados)/float64(semestreActual) < cfg.Variables.TAmin {
			estado = models.EliminadoTAmin
		}
	}

	for estado == models.Activo {
		if semestreActual >= maxSemSimulado {
			// Corte explícito por configuración del generador.
			if cfg.UntilSemestre > 0 && semestreActual == cfg.UntilSemestre {
				hist.Estado = models.TrayectoriaActiva
			} else {
				estado = models.EliminadoTAmin
			}
			break
		}

		// Evaluar pendientes del semestre anterior (los que se inscribieron al avanzar)
		if semestreActual > 1 && len(pendientesEval) > 0 {
			for _, sigla := range pendientesEval {
				asig, ok := malla.Mapa[sigla]
				if !ok {
					continue
				}
				aprobado, nota := simulateGradeOnRamo(rng, cfg.Profile, asig, cfg.Modelo, semestreActual)

				h, ok := historialRamos[sigla]
				if !ok {
					h = &models.HistorialAsignatura{Sigla: sigla}
					historialRamos[sigla] = h
				}
				h.Oportunidad++
				intentosLocal[sigla]++
				if aprobado && !h.Aprobado {
					h.Aprobado = true
					creditosAprobados += asig.Cred
				}
				if !aprobado && cfg.Variables.Opor > 0 && h.Oportunidad >= cfg.Variables.Opor {
					estado = models.EliminadoOpor
				}

				// Registrar el ramo en el SemesterRecord del semestre actual
				semRecord := &hist.Semestres[len(hist.Semestres)-1]
				semRecord.Cursos = append(semRecord.Cursos, models.SubjectRecord{
					Sigla:     asig.ID,
					Creditos:  asig.Cred,
					Nota:      nota,
					Estado:    aprobadoToEstado(aprobado),
					Categoria: models.CategoriaObligatoria,
				})
			}

			if estado == models.Activo && semestreActual >= cfg.Variables.NapTAmin {
				if float64(creditosAprobados)/float64(semestreActual) < cfg.Variables.TAmin {
					estado = models.EliminadoTAmin
				}
			}
			if estado != models.Activo {
				break
			}
		}

		// Avanzar al siguiente semestre
		semestreActual++
		anio, sem := anioSemestreFromIdx(semestreActual, baseYear(cfg))
		newRecord := models.SemesterRecord{
			Periodo:  periodoIDFor(anio, sem),
			Anio:     anio,
			Semestre: sem,
			Cursos:   make([]models.SubjectRecord, 0),
		}

		// Construir candidatos del semestre
		programmedIDs := programmedIDsForSemester(models.SimularRequest{Programacion: cfg.Programacion}, semestreActual)
		candidatos := make([]string, 0)
		if len(programmedIDs) > 0 {
			for _, raw := range programmedIDs {
				id := normalizeCourseID(raw)
				if id == "" || id == "0" {
					continue
				}
				candidatos = append(candidatos, id)
			}
		} else {
			for _, asig := range malla.Fallback {
				if !shouldOfferByParity(asig, semestreActual) {
					continue
				}
				candidatos = append(candidatos, asig.ID)
			}
		}

		// Filtrar aprobados y reqs no cumplidos
		filtrados := make([]string, 0, len(candidatos))
		for _, id := range candidatos {
			if h, ok := historialRamos[id]; ok && h.Aprobado {
				continue
			}
			asig, ok := malla.Mapa[id]
			if !ok {
				continue
			}
			cumple := true
			for _, req := range asig.Reqs {
				req = normalizeCourseID(req)
				if req == "" {
					continue
				}
				rh, ok := historialRamos[req]
				if !ok || !rh.Aprobado {
					cumple = false
					break
				}
			}
			if cumple {
				filtrados = append(filtrados, id)
			}
		}

		// Inscribir respetando carga preferida (la tolerancia del alumno) y NCSmax
		cargaTarget := cfg.Profile.cargaPreferida()
		if cargaTarget > cfg.Variables.NCSmax {
			cargaTarget = cfg.Variables.NCSmax
		}
		pendientesEval = pendientesEval[:0]
		creditosInscritos := 0
		for _, id := range filtrados {
			asig := malla.Mapa[id]
			if creditosInscritos+asig.Cred > cargaTarget {
				continue
			}
			pendientesEval = append(pendientesEval, id)
			creditosInscritos += asig.Cred
			if _, ok := historialRamos[id]; !ok {
				historialRamos[id] = &models.HistorialAsignatura{Sigla: id}
			}
		}

		// Si no se pudo inscribir nada → titulación o eliminación
		if len(pendientesEval) == 0 && countElectivosPendientes(electivos, semestreActual) == 0 {
			todasAprobadas := true
			for _, a := range malla.Normalizadas {
				if h, ok := historialRamos[a.ID]; !ok || !h.Aprobado {
					todasAprobadas = false
					break
				}
			}
			if todasAprobadas {
				estado = models.Titulado
			} else {
				estado = models.EliminadoTAmin
			}
			hist.Semestres = append(hist.Semestres, newRecord)
			break
		}

		hist.Semestres = append(hist.Semestres, newRecord)
		appendElectivosDelSemestre(&hist.Semestres[len(hist.Semestres)-1], electivos, semestreActual, rng, cfg.Profile, &creditosAprobados, historialRamos, intentosLocal)
	}

	hist.Estado = trayectoriaFromEstado(estado)
	return hist, nil
}

// simulateGradeOnRamo decide aprobado/reprobado para un ramo aplicando el
// ajuste por esfuerzo del perfil, y muestrea una nota numérica desde la
// distribución apropiada.
func simulateGradeOnRamo(rng *rand.Rand, p StudentProfile, asig models.AsignaturaPayload, modelo models.ModeloPayload, sem int) (aprobado bool, nota float64) {
	vmap, delta := selectVmapDelta(modelo, sem)
	probMotor := math.Abs(vmap + delta*rng.NormFloat64())
	probAjustada := math.Max(0, math.Min(1, probMotor+p.deltaPesfuerzo()))
	aprobado = probAjustada >= asig.Rep

	var mu, sigma float64
	if aprobado {
		mu, sigma = p.notaParamAprobado()
	} else {
		mu, sigma = p.notaParamReprobado()
	}
	nota = mu + sigma*rng.NormFloat64()
	// Clamp a la escala chilena
	if nota < 1.0 {
		nota = 1.0
	}
	if nota > 7.0 {
		nota = 7.0
	}
	// Coherencia interna: si aprobó debe ser >=4.0, si reprobó <4.0
	if aprobado && nota < 4.0 {
		nota = 4.0
	}
	if !aprobado && nota >= 4.0 {
		nota = 3.9
	}
	return aprobado, math.Round(nota*10) / 10 // notas con 1 decimal (estilo PUCV)
}

func aprobadoToEstado(aprobado bool) models.EstadoSubject {
	if aprobado {
		return models.SubjectAprobado
	}
	return models.SubjectReprobado
}

func trayectoriaFromEstado(e models.EstadoAlumno) models.EstadoTrayectoria {
	switch e {
	case models.Titulado:
		return models.TrayectoriaTitulado
	case models.EliminadoTAmin:
		return models.TrayectoriaEliminadoTAmin
	case models.EliminadoOpor:
		return models.TrayectoriaEliminadoOpor
	case models.Activo:
		return models.TrayectoriaActiva
	}
	return models.TrayectoriaDesconocida
}

// ==========================================
// PLANIFICACIÓN DE ELECTIVOS SINTÉTICOS
// ==========================================
// El alumno toma:
//   - ICR010 (Antropología): obligatorio universal, desde sem 1
//   - ICR020 (Ética): obligatorio universal, después de ICR010
//   - 1 FOFU genérico adicional (3 totales con los ICR)
//   - 4 optativos: desde sem 5
//
// Los semestres exactos se asignan uniformemente al inicio de la trayectoria,
// determinístico por seed.

type electivoSlot struct {
	Sigla     string
	Creditos  int
	Categoria models.CategoriaSubject
	Semestre  int
	RepBase   float64 // tasa de reprobación sintética del electivo (más fácil que ramo obligatorio)
}

func planificarElectivos(rng *rand.Rand, maxSem int) []electivoSlot {
	if maxSem < 12 {
		maxSem = 12
	}
	slots := make([]electivoSlot, 0, 7)

	// ICR010 Antropología — entre sem 1 y maxSem
	semIcr1 := 1 + rng.Intn(min(maxSem, 6))
	slots = append(slots, electivoSlot{
		Sigla: "ICR010", Creditos: 2, Categoria: models.CategoriaFOFU,
		Semestre: semIcr1, RepBase: 0.15,
	})

	// ICR020 Ética — después de Antropología
	semIcr2 := semIcr1 + 1 + rng.Intn(max(1, min(maxSem-semIcr1, 6)))
	if semIcr2 > maxSem {
		semIcr2 = maxSem
	}
	slots = append(slots, electivoSlot{
		Sigla: "ICR020", Creditos: 2, Categoria: models.CategoriaFOFU,
		Semestre: semIcr2, RepBase: 0.15,
	})

	// 1 FOFU genérico desde sem 3
	if maxSem >= 3 {
		semFofu := 3 + rng.Intn(maxSem-2)
		slots = append(slots, electivoSlot{
			Sigla: "FOFU_GEN_01", Creditos: 2, Categoria: models.CategoriaFOFU,
			Semestre: semFofu, RepBase: 0.20,
		})
	}

	// 4 optativos desde sem 5
	if maxSem >= 5 {
		for i := 1; i <= 4; i++ {
			semOpt := 5 + rng.Intn(maxSem-4)
			slots = append(slots, electivoSlot{
				Sigla:     fmt.Sprintf("OPT_GEN_%02d", i),
				Creditos:  4,
				Categoria: models.CategoriaOptativa,
				Semestre:  semOpt,
				RepBase:   0.25,
			})
		}
	}

	sort.SliceStable(slots, func(i, j int) bool {
		return slots[i].Semestre < slots[j].Semestre
	})
	return slots
}

func appendElectivosDelSemestre(
	semRec *models.SemesterRecord,
	slots []electivoSlot,
	semestre int,
	rng *rand.Rand,
	perfil StudentProfile,
	creditosAprobados *int,
	historialRamos map[string]*models.HistorialAsignatura,
	intentosLocal map[string]int,
) {
	for _, s := range slots {
		if s.Semestre != semestre {
			continue
		}
		// Asignatura sintética con la RepBase definida
		asigSintetica := models.AsignaturaPayload{
			ID:        s.Sigla,
			Cred:      s.Creditos,
			Rep:       s.RepBase,
			Semestre:  semestre,
			Dictacion: "semestral",
		}
		// Usar modelo "ciclo básico" como default para electivos — son más fáciles
		modeloFOFU := models.ModeloPayload{
			VMap1234: 0.65, Delta1234: 0.15,
			VMap5678: 0.65, Delta5678: 0.15,
			VMapM:    0.65, DeltaM:    0.15,
		}
		aprobado, nota := simulateGradeOnRamo(rng, perfil, asigSintetica, modeloFOFU, semestre)

		historialRamos[s.Sigla] = &models.HistorialAsignatura{Sigla: s.Sigla, Oportunidad: 1, Aprobado: aprobado}
		intentosLocal[s.Sigla]++
		if aprobado {
			*creditosAprobados += s.Creditos
		}

		semRec.Cursos = append(semRec.Cursos, models.SubjectRecord{
			Sigla:     s.Sigla,
			Creditos:  s.Creditos,
			Nota:      nota,
			Estado:    aprobadoToEstado(aprobado),
			Categoria: s.Categoria,
		})
	}
}

func countElectivosPendientes(slots []electivoSlot, semActual int) int {
	n := 0
	for _, s := range slots {
		if s.Semestre > semActual {
			n++
		}
	}
	return n
}

// ==========================================
// HELPERS DE PERIODIZACIÓN
// ==========================================

func baseYear(cfg GeneratorConfig) int {
	// Para alumnos sintéticos arrancamos en S1-2024 por default
	// (representativo de un ingreso reciente). El año exacto solo
	// afecta el label de los periodos, no la lógica.
	return 2024
}

// anioSemestreFromIdx convierte un índice de semestre (1, 2, 3, ...) en
// un par (anio, semestre) consistente:
//
//	idx=1 → (baseYear,   1)
//	idx=2 → (baseYear,   2)
//	idx=3 → (baseYear+1, 1)
//	idx=4 → (baseYear+1, 2)
func anioSemestreFromIdx(idx, baseYear int) (anio, semestre int) {
	offset := idx - 1
	anio = baseYear + offset/2
	semestre = (offset % 2) + 1
	return anio, semestre
}

func periodoIDFor(anio, semestre int) string {
	return fmt.Sprintf("S%d-%d", semestre, anio)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
