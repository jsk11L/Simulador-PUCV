package engine

import (
	"fmt"
	"math"
	"math/rand"
	"sort"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// ==========================================
// MOTOR INDIVIDUAL — SIMULACIÓN POR ALUMNO
// ==========================================
// SimulateIndividual proyecta la trayectoria futura de UN alumno real (o
// generado) a partir de su historial conocido. Aplica modificadores δ
// para individualizar la probabilidad de éxito de cada ramo pendiente.
//
// Es Montecarlo a nivel alumno: corre N iteraciones del futuro y agrega
// estadísticas (probabilidad de aprobar cada ramo, tasa de titulación,
// semestres restantes esperados).

// IndividualConfig agrupa la configuración de una proyección individual.
type IndividualConfig struct {
	History      models.StudentHistory
	Asignaturas  []models.AsignaturaPayload
	Programacion *models.ProgramacionPayload
	Variables    models.VariablesPayload
	Modelo       models.ModeloPayload
	Weights      Weights

	// Iteraciones futuras por alumno. Si <= 0, default 1000.
	Iteraciones int

	// Seed determinística. 0 = aleatoria.
	Seed int64

	// TAminMode controla cómo se aplica el criterio de eliminación TAmin
	// (tasa mínima de avance) en las trayectorias proyectadas:
	//
	//   "" o "proyectivo" (DEFAULT): TAmin se evalúa solo sobre semestres
	//      SIMULADOS desde la predicción. El historial pasado no entra al
	//      denominador. Útil para predicciones individuales — permite que
	//      alumnos con tasa histórica baja tengan probabilidad realista de
	//      titularse si proyectan bien hacia adelante.
	//
	//   "estricto": TAmin se evalúa sobre TODO el recorrido (historial +
	//      futuro), como en el paper. Apropiado para análisis poblacional.
	//      Si la tasa histórica ya está por debajo de TAmin, el alumno
	//      queda condenado a eliminación en sem NapTAmin sin importar lo
	//      que haga en el futuro.
	TAminMode string
}

// RamoProbabilidad agrega la predicción para un ramo específico.
type RamoProbabilidad struct {
	Sigla         string  `json:"sigla"`
	Creditos      int     `json:"creditos"`
	Semestre      int     `json:"semestre_nominal"`
	ProbAprobar   float64 `json:"prob_aprobar"`   // [0,1]
	IntentosProm  float64 `json:"intentos_prom"`  // promedio de intentos antes de aprobar
}

// IndividualPrediction es el output del motor individual.
type IndividualPrediction struct {
	AlumnoRUT string `json:"alumno_rut,omitempty"`

	// Resumen del historial usado como input.
	HistorialResumen HistorialResumen `json:"historial_resumen"`

	// Modificadores δ promedio observados durante las iteraciones.
	DeltaHistAvg   float64 `json:"delta_hist_avg"`
	DeltaPrereqAvg float64 `json:"delta_prereq_avg"`
	DeltaStressAvg float64 `json:"delta_stress_avg"`

	// Métricas agregadas sobre las N iteraciones.
	TasaTitulacion       float64 `json:"tasa_titulacion"`        // [0,1]
	TasaEliminadoTAmin   float64 `json:"tasa_eliminado_tamin"`
	TasaEliminadoOpor    float64 `json:"tasa_eliminado_opor"`
	SemestresHastaCierre float64 `json:"semestres_hasta_cierre"` // promedio (solo titulados)
	SemestresProyectados float64 `json:"semestres_proyectados"`  // promedio total trayectoria

	// Predicción ramo a ramo de los pendientes en la malla.
	ProbabilidadesPorRamo []RamoProbabilidad `json:"probabilidades_por_ramo"`

	// TrayectoriaProyectada es UNA realización representativa del futuro
	// del alumno (semestres + cursos con sus notas simuladas), pensada
	// para visualizarse como kanban. Se elige la iteración cuyo
	// semestreFinal está cerca de la mediana de la cohorte interna.
	//
	// Estos semestres NO incluyen los del historial — son solo los
	// proyectados desde el punto de corte hacia el futuro. El frontend
	// los concatena con el historial al renderizar.
	TrayectoriaProyectada []models.SemesterRecord `json:"trayectoria_proyectada"`

	// Total de iteraciones efectivamente corridas.
	Iteraciones int `json:"iteraciones"`
}

// SimulateIndividual ejecuta la proyección Montecarlo individual.
func SimulateIndividual(cfg IndividualConfig) (IndividualPrediction, error) {
	if len(cfg.Asignaturas) == 0 {
		return IndividualPrediction{}, fmt.Errorf("motor individual: malla vacía")
	}
	iter := cfg.Iteraciones
	if iter <= 0 {
		iter = 1000
	}
	resumen := ResumirHistorial(cfg.History)
	malla := normalizeMalla(cfg.Asignaturas)
	rng := newRNG(cfg.Seed)

	// Ramos ya aprobados en el historial real — no se simulan.
	aprobadosPrevios := make(map[string]bool)
	creditosBase := 0
	semestresBase := len(cfg.History.Semestres)
	for _, sem := range cfg.History.Semestres {
		for _, c := range sem.Cursos {
			if c.Estado == models.SubjectAprobado && esRamoDeLaMalla(malla, c.Sigla) {
				aprobadosPrevios[c.Sigla] = true
				if asig, ok := malla.Mapa[c.Sigla]; ok {
					creditosBase += asig.Cred
				}
			}
		}
	}

	// Contadores agregados.
	titulados := 0
	elimTA := 0
	elimOpor := 0
	sumaSemTotal := 0
	sumaSemTitulados := 0
	intentosPorRamo := make(map[string]int)
	aprobadosPorRamo := make(map[string]int)
	sumDeltaHist := 0.0
	sumDeltaPrereq := 0.0
	sumDeltaStress := 0.0
	contadoresDelta := 0

	// Guardamos todas las trayectorias proyectadas para elegir después la
	// "representativa" (mediana por semestreFinal). Memoria razonable:
	// iter ≤ ~1000, semestres ≤ 30, cursos ≤ ~8 por semestre.
	trayectorias := make([][]models.SemesterRecord, 0, iter)
	semestresFinales := make([]int, 0, iter)

	for it := 0; it < iter; it++ {
		hist := simularFuturoUnaVez(rng, cfg, malla, resumen, aprobadosPrevios)

		// Métricas agregadas
		switch hist.estado {
		case models.Titulado:
			titulados++
			sumaSemTitulados += hist.semestreFinal
		case models.EliminadoTAmin:
			elimTA++
		case models.EliminadoOpor:
			elimOpor++
		}
		sumaSemTotal += hist.semestreFinal

		for sigla, intentos := range hist.intentos {
			intentosPorRamo[sigla] += intentos
		}
		for sigla := range hist.aprobados {
			aprobadosPorRamo[sigla]++
		}
		sumDeltaHist += hist.sumDeltaHist
		sumDeltaPrereq += hist.sumDeltaPrereq
		sumDeltaStress += hist.sumDeltaStress
		contadoresDelta += hist.contadoresDelta

		trayectorias = append(trayectorias, hist.semestresProyectados)
		semestresFinales = append(semestresFinales, hist.semestreFinal)
	}

	pred := IndividualPrediction{
		AlumnoRUT:        cfg.History.RUT,
		HistorialResumen: resumen,
		Iteraciones:      iter,
	}
	pred.TasaTitulacion = float64(titulados) / float64(iter)
	pred.TasaEliminadoTAmin = float64(elimTA) / float64(iter)
	pred.TasaEliminadoOpor = float64(elimOpor) / float64(iter)
	pred.SemestresProyectados = float64(sumaSemTotal) / float64(iter)
	if titulados > 0 {
		pred.SemestresHastaCierre = float64(sumaSemTitulados) / float64(titulados)
	}

	if contadoresDelta > 0 {
		pred.DeltaHistAvg = sumDeltaHist / float64(contadoresDelta)
		pred.DeltaPrereqAvg = sumDeltaPrereq / float64(contadoresDelta)
		pred.DeltaStressAvg = sumDeltaStress / float64(contadoresDelta)
	}

	// Elegir trayectoria representativa: aquella cuyo `semestreFinal` está
	// cerca de la mediana del conjunto. Da una proyección "típica" en vez
	// de un outlier.
	pred.TrayectoriaProyectada = elegirTrayectoriaRepresentativa(trayectorias, semestresFinales)

	// Construir tabla de probabilidades para ramos pendientes (que NO estaban aprobados).
	probs := make([]RamoProbabilidad, 0)
	for _, asig := range malla.Normalizadas {
		if aprobadosPrevios[asig.ID] {
			continue
		}
		intentos := intentosPorRamo[asig.ID]
		aprob := aprobadosPorRamo[asig.ID]

		var probAprobar, intProm float64
		if intentos > 0 {
			probAprobar = float64(aprob) / float64(iter)
			intProm = float64(intentos) / float64(iter)
		}
		probs = append(probs, RamoProbabilidad{
			Sigla:        asig.ID,
			Creditos:     asig.Cred,
			Semestre:     asig.Semestre,
			ProbAprobar:  math.Round(probAprobar*10000) / 10000,
			IntentosProm: math.Round(intProm*100) / 100,
		})
	}
	sort.SliceStable(probs, func(i, j int) bool {
		if probs[i].Semestre == probs[j].Semestre {
			return probs[i].Sigla < probs[j].Sigla
		}
		return probs[i].Semestre < probs[j].Semestre
	})
	pred.ProbabilidadesPorRamo = probs

	_ = creditosBase
	_ = semestresBase
	return pred, nil
}

// trayectoriaResumen es el resultado interno de UNA iteración futura.
type trayectoriaResumen struct {
	estado          models.EstadoAlumno
	semestreFinal   int
	aprobados       map[string]bool
	intentos        map[string]int
	sumDeltaHist    float64
	sumDeltaPrereq  float64
	sumDeltaStress  float64
	contadoresDelta int

	// semestresProyectados captura los SemesterRecords generados durante
	// la trayectoria futura. Usado para devolver una iteración
	// representativa al frontend (kanban del futuro proyectado).
	semestresProyectados []models.SemesterRecord
}

// simularFuturoUnaVez corre UNA trayectoria futura del alumno desde el
// estado actual hasta titulación, eliminación o tope MaxSemestres.
// Aplica los modificadores δ a cada ramo evaluado.
func simularFuturoUnaVez(
	rng *rand.Rand,
	cfg IndividualConfig,
	malla mallaContext,
	resumen HistorialResumen,
	aprobadosPrevios map[string]bool,
) trayectoriaResumen {

	tr := trayectoriaResumen{
		aprobados: make(map[string]bool, len(aprobadosPrevios)),
		intentos:  make(map[string]int),
		estado:    models.Activo,
	}
	for sigla := range aprobadosPrevios {
		tr.aprobados[sigla] = true
	}

	maxSem := cfg.Variables.MaxSemestres
	if maxSem == 0 {
		maxSem = 30
	}
	semestreInicial := len(cfg.History.Semestres) + 1
	semestreActual := semestreInicial

	creditosAprobados := 0
	for sigla := range tr.aprobados {
		if asig, ok := malla.Mapa[sigla]; ok {
			creditosAprobados += asig.Cred
		}
	}
	// Snapshot del crédito acumulado al inicio del futuro. En modo
	// proyectivo el TAmin se evalúa sobre créditos GANADOS desde aquí.
	creditosHistoricos := creditosAprobados

	historialOportunidad := make(map[string]int)
	pendientesEval := make([]string, 0)

	// Inicializar la lista de semestres proyectados. Cada iteración va
	// agregando uno por semestre simulado con sus cursos para visualizar
	// como kanban del futuro.
	tr.semestresProyectados = make([]models.SemesterRecord, 0)
	periodoBase := periodoBaseDesdeHistorial(cfg.History)

	for tr.estado == models.Activo {
		if semestreActual > maxSem {
			tr.estado = models.EliminadoTAmin
			break
		}

		// Construir candidatos del semestre.
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

		// Filtrar aprobados y prereqs no cumplidos.
		filtrados := make([]string, 0, len(candidatos))
		for _, id := range candidatos {
			if tr.aprobados[id] {
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
				if !tr.aprobados[req] {
					cumple = false
					break
				}
			}
			if cumple {
				filtrados = append(filtrados, id)
			}
		}

		// Inscribir respetando carga preferida del alumno (la histórica si la tiene).
		cargaTarget := int(math.Round(resumen.CargaPromedio))
		if cargaTarget == 0 || cargaTarget > cfg.Variables.NCSmax {
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
		}

		// Si no se pudo inscribir nada → cierre.
		if len(pendientesEval) == 0 {
			tr.estado = cerrarTrayectoria(malla, tr.aprobados)
			break
		}

		// Construir el SemesterRecord proyectado de este semestre.
		anio, semPar, periodoID := siguientePeriodo(periodoBase, len(tr.semestresProyectados))
		semRecord := models.SemesterRecord{
			Periodo:  periodoID,
			Anio:     anio,
			Semestre: semPar,
			Cursos:   make([]models.SubjectRecord, 0, len(pendientesEval)),
		}

		// Evaluar cada ramo aplicando modificadores δ.
		for _, sigla := range pendientesEval {
			asig := malla.Mapa[sigla]

			vmap, delta := selectVmapDelta(cfg.Modelo, semestreActual)
			probMotor := math.Abs(vmap + delta*rng.NormFloat64())

			dHist := resumen.DeltaHist()
			dPrereq := resumen.DeltaPrereq(asig.Reqs)
			dStress := resumen.DeltaStress(creditosInscritos)
			probAjustada := ApplyWeights(probMotor, cfg.Weights, dHist, dPrereq, dStress)

			tr.sumDeltaHist += dHist
			tr.sumDeltaPrereq += dPrereq
			tr.sumDeltaStress += dStress
			tr.contadoresDelta++

			aprobado := probAjustada >= asig.Rep
			tr.intentos[sigla]++
			historialOportunidad[sigla]++

			// Generar nota numérica para visualización en el kanban.
			nota := generarNotaProyectada(rng, resumen, aprobado)

			estado := models.SubjectReprobado
			if aprobado {
				estado = models.SubjectAprobado
				tr.aprobados[sigla] = true
				creditosAprobados += asig.Cred
			}
			semRecord.Cursos = append(semRecord.Cursos, models.SubjectRecord{
				Sigla:     sigla,
				Creditos:  asig.Cred,
				Nota:      nota,
				Estado:    estado,
				Categoria: models.CategoriaObligatoria,
			})

			if !aprobado && cfg.Variables.Opor > 0 && historialOportunidad[sigla] >= cfg.Variables.Opor {
				tr.estado = models.EliminadoOpor
				break
			}
		}

		tr.semestresProyectados = append(tr.semestresProyectados, semRecord)
		if tr.estado != models.Activo {
			break
		}

		// Chequeo TAmin. El semestre de aplicación se cuenta sobre el TOTAL
		// (historial + futuro) en ambos modos; lo que cambia es el numerador
		// y denominador del cociente.
		if cfg.Variables.NapTAmin > 0 && semestreActual >= cfg.Variables.NapTAmin && cfg.Variables.TAmin > 0 {
			var numerador, denominador float64
			if cfg.TAminMode == "estricto" {
				// Modo paper: cuenta TODOS los créditos / TODOS los semestres.
				numerador = float64(creditosAprobados)
				denominador = float64(semestreActual)
			} else {
				// Modo proyectivo (default): solo créditos ganados en simulación
				// dividido por semestres simulados. Permite predicciones útiles
				// para alumnos con tasa histórica baja.
				numerador = float64(creditosAprobados - creditosHistoricos)
				denominador = float64(semestreActual - semestreInicial + 1)
			}
			if denominador > 0 && numerador/denominador < cfg.Variables.TAmin {
				tr.estado = models.EliminadoTAmin
				break
			}
		}

		// ¿Todos los ramos de la malla aprobados? → titulado.
		if len(tr.aprobados) >= len(malla.Normalizadas) {
			tr.estado = models.Titulado
			break
		}

		semestreActual++
	}
	tr.semestreFinal = semestreActual
	return tr
}

// cerrarTrayectoria decide si una trayectoria sin inscripciones posibles
// terminó en titulación (todos los ramos aprobados) o eliminación.
func cerrarTrayectoria(malla mallaContext, aprobados map[string]bool) models.EstadoAlumno {
	for _, asig := range malla.Normalizadas {
		if !aprobados[asig.ID] {
			return models.EliminadoTAmin
		}
	}
	return models.Titulado
}

func esRamoDeLaMalla(malla mallaContext, sigla string) bool {
	_, ok := malla.Mapa[sigla]
	return ok
}

// periodoBase describe el primer período proyectado (el siguiente al
// último del historial). Si el alumno no tiene historial, se asume
// S1-2024 como referencia.
type periodoBaseRef struct {
	Anio     int
	Semestre int // 1 o 2
}

func periodoBaseDesdeHistorial(h models.StudentHistory) periodoBaseRef {
	const anioDefault = 2024
	if len(h.Semestres) == 0 {
		return periodoBaseRef{Anio: anioDefault, Semestre: 1}
	}
	ult := h.Semestres[len(h.Semestres)-1]
	if ult.Anio == 0 || (ult.Semestre != 1 && ult.Semestre != 2) {
		return periodoBaseRef{Anio: anioDefault, Semestre: 1}
	}
	// Avanzar al siguiente período.
	if ult.Semestre == 1 {
		return periodoBaseRef{Anio: ult.Anio, Semestre: 2}
	}
	return periodoBaseRef{Anio: ult.Anio + 1, Semestre: 1}
}

// siguientePeriodo devuelve el (anio, semestre 1|2, "SX-AAAA") del
// período proyectado en el índice `idx` (0-based) a partir de la base.
func siguientePeriodo(base periodoBaseRef, idx int) (anio, semestre int, periodoID string) {
	totalOffset := (base.Semestre - 1) + idx
	anio = base.Anio + totalOffset/2
	semestre = (totalOffset % 2) + 1
	periodoID = fmt.Sprintf("S%d-%d", semestre, anio)
	return anio, semestre, periodoID
}

// elegirTrayectoriaRepresentativa devuelve la trayectoria cuyo
// semestreFinal está cerca de la mediana del conjunto. Si no hay
// iteraciones, devuelve un slice vacío (NUNCA nil, para evitar JSON null).
func elegirTrayectoriaRepresentativa(trayectorias [][]models.SemesterRecord, finales []int) []models.SemesterRecord {
	if len(trayectorias) == 0 {
		return make([]models.SemesterRecord, 0)
	}
	// Ordenar índices por semestreFinal y elegir la mediana.
	idx := make([]int, len(finales))
	for i := range idx {
		idx[i] = i
	}
	sort.SliceStable(idx, func(i, j int) bool {
		return finales[idx[i]] < finales[idx[j]]
	})
	chosen := idx[len(idx)/2]
	out := trayectorias[chosen]
	if out == nil {
		return make([]models.SemesterRecord, 0)
	}
	return out
}

// generarNotaProyectada genera una nota numérica realista para un curso
// proyectado, usando el ratio histórico del alumno como proxy de esfuerzo.
//
// Espeja la lógica de simulateGradeOnRamo en el generador, pero sin
// perfil sintético (el motor individual no lo conoce).
func generarNotaProyectada(rng *rand.Rand, resumen HistorialResumen, aprobado bool) float64 {
	// Proxy del esfuerzo: ratio histórico clampado a [0,1].
	esfuerzo := resumen.RatioAprobacion
	if esfuerzo < 0 {
		esfuerzo = 0
	}
	if esfuerzo > 1 {
		esfuerzo = 1
	}

	var mu, sigma float64
	if aprobado {
		mu, sigma = 4.5+1.5*esfuerzo, 0.7
	} else {
		mu, sigma = 2.5+1.0*esfuerzo, 0.6
	}
	nota := mu + sigma*rng.NormFloat64()
	if nota < 1.0 {
		nota = 1.0
	}
	if nota > 7.0 {
		nota = 7.0
	}
	// Coherencia: aprobado ≥ 4.0, reprobado < 4.0
	if aprobado && nota < 4.0 {
		nota = 4.0
	}
	if !aprobado && nota >= 4.0 {
		nota = 3.9
	}
	return math.Round(nota*10) / 10
}
