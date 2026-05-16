package models

// ==========================================
// HISTORIAL ACADÉMICO INDIVIDUAL
// ==========================================
// Modelos para representar el historial real de un alumno proveniente
// de la API/CSV de la universidad. Usado por el motor de simulación
// individual (backtesting) — NO por la simulación generacional, que
// trabaja con cohortes hipotéticas sobre la malla.

// EstadoSubject refleja el estado de un curso en el historial del alumno.
// Espejo de la columna "Finalización" del CSV PUCV.
type EstadoSubject string

const (
	SubjectAprobado    EstadoSubject = "aprobado"
	SubjectReprobado   EstadoSubject = "reprobado"
	SubjectEnCurso     EstadoSubject = "en_curso"  // inscrito sin nota final
	SubjectAbandonado  EstadoSubject = "abandonado" // retiro/eliminación administrativa
)

// CategoriaSubject distingue entre asignaturas obligatorias de la malla,
// formación fundamental (FOFU) y optativas. Necesario para aplicar los
// modificadores correctamente (los FOFU/optativos no afectan prereqs
// hacia otros ramos, los obligatorios sí).
type CategoriaSubject string

const (
	CategoriaObligatoria CategoriaSubject = "obligatoria"
	CategoriaFOFU        CategoriaSubject = "fofu"     // formación fundamental
	CategoriaOptativa    CategoriaSubject = "optativa" // electiva vinculada a la carrera
)

// SubjectRecord es un curso del historial del alumno: la inscripción real
// a una asignatura concreta con su resultado.
//
// La sigla aquí es la sigla pura (ej: "ICI1241"), sin la sección que viene
// concatenada en el CSV de la PUCV (ej: "ICI1241-02"). El parser CSV se
// encarga de la separación.
type SubjectRecord struct {
	Sigla      string           `json:"sigla"`      // ICI1241, MAT1001, etc.
	Seccion    string           `json:"seccion,omitempty"` // 02, 26, etc. — para trazabilidad
	Nombre     string           `json:"nombre,omitempty"`  // FUNDAMENTOS DE ALGORITMOS
	Creditos   int              `json:"creditos"`
	Nota       float64          `json:"nota,omitempty"`  // escala chilena 1.0-7.0; 0 si en curso
	Estado     EstadoSubject    `json:"estado"`
	Categoria  CategoriaSubject `json:"categoria"`
}

// Aprobada devuelve true si el ramo está aprobado con nota válida.
func (s SubjectRecord) Aprobada() bool {
	return s.Estado == SubjectAprobado
}

// SemesterRecord agrupa los SubjectRecord de un alumno en un período
// académico específico. El identificador del período usa el formato
// "S1-2022" / "S2-2022" (consistente con la columna Per.Insc del HTML).
type SemesterRecord struct {
	Periodo   string          `json:"periodo"`   // S1-2022, S2-2025, etc.
	Anio      int             `json:"anio"`      // 2022, 2025
	Semestre  int             `json:"semestre"`  // 1 o 2 (impar/par)
	Cursos    []SubjectRecord `json:"cursos"`
}

// CreditosInscritos suma créditos de todos los cursos del semestre,
// sin importar resultado. Útil para δ_stress (carga semestral).
func (s SemesterRecord) CreditosInscritos() int {
	total := 0
	for _, c := range s.Cursos {
		total += c.Creditos
	}
	return total
}

// CreditosAprobados suma créditos solo de cursos aprobados.
func (s SemesterRecord) CreditosAprobados() int {
	total := 0
	for _, c := range s.Cursos {
		if c.Aprobada() {
			total += c.Creditos
		}
	}
	return total
}

// EstadoTrayectoria refleja el cierre académico del alumno en el momento
// del snapshot del historial. Para datos reales del parser CSV queda como
// "desconocido"; el generador sintético lo setea explícitamente.
type EstadoTrayectoria string

const (
	TrayectoriaDesconocida    EstadoTrayectoria = ""
	TrayectoriaActiva         EstadoTrayectoria = "activa"
	TrayectoriaTitulado       EstadoTrayectoria = "titulado"
	TrayectoriaEliminadoTAmin EstadoTrayectoria = "eliminado_tamin"
	TrayectoriaEliminadoOpor  EstadoTrayectoria = "eliminado_opor"
)

// StudentHistory es el historial académico completo de un alumno,
// agrupado por semestre. El alumno puede estar activo (último semestre
// con cursos `en_curso`) o tener historial cerrado.
//
// Los semestres deben venir ordenados cronológicamente por el parser.
type StudentHistory struct {
	RUT       string            `json:"rut"`                // 21556428-2
	Nombre    string            `json:"nombre,omitempty"`
	Carrera   string            `json:"carrera,omitempty"`  // "227 - INGENIERIA CIVIL INFORMATICA"
	Estado    EstadoTrayectoria `json:"estado,omitempty"`
	Semestres []SemesterRecord  `json:"semestres"`
}

// TotalCreditosAprobados devuelve los créditos totales aprobados en toda
// la trayectoria. Proxy del avance real del alumno.
func (h StudentHistory) TotalCreditosAprobados() int {
	total := 0
	for _, sem := range h.Semestres {
		total += sem.CreditosAprobados()
	}
	return total
}

// TotalCreditosInscritos devuelve los créditos totales inscritos
// (aprobados + reprobados + en curso). Denominador para δ_hist.
func (h StudentHistory) TotalCreditosInscritos() int {
	total := 0
	for _, sem := range h.Semestres {
		total += sem.CreditosInscritos()
	}
	return total
}

// RatioAprobacion = créditos aprobados / créditos inscritos.
// Es el proxy principal de "esfuerzo/capacidad" del alumno. 1.0 = todo
// aprobado, 0.0 = nada aprobado. Cuando no hay créditos inscritos
// (alumno nuevo) devuelve 0 para evitar división por cero.
func (h StudentHistory) RatioAprobacion() float64 {
	inscritos := h.TotalCreditosInscritos()
	if inscritos == 0 {
		return 0
	}
	return float64(h.TotalCreditosAprobados()) / float64(inscritos)
}

// PromedioCargaSemestral = créditos inscritos promedio por semestre
// efectivamente cursado. Base para δ_stress.
func (h StudentHistory) PromedioCargaSemestral() float64 {
	if len(h.Semestres) == 0 {
		return 0
	}
	return float64(h.TotalCreditosInscritos()) / float64(len(h.Semestres))
}

// UltimoSemestre devuelve la referencia al último período cursado, o nil
// si el alumno no tiene historial. Usado para data masking en backtesting.
func (h StudentHistory) UltimoSemestre() *SemesterRecord {
	if len(h.Semestres) == 0 {
		return nil
	}
	return &h.Semestres[len(h.Semestres)-1]
}

// SinUltimoSemestre devuelve una copia del historial sin el último período.
// Usado por el framework de backtesting walk-forward para ocultar el target.
func (h StudentHistory) SinUltimoSemestre() StudentHistory {
	if len(h.Semestres) <= 1 {
		return StudentHistory{
			RUT:       h.RUT,
			Nombre:    h.Nombre,
			Carrera:   h.Carrera,
			Semestres: nil,
		}
	}
	return StudentHistory{
		RUT:       h.RUT,
		Nombre:    h.Nombre,
		Carrera:   h.Carrera,
		Semestres: append([]SemesterRecord(nil), h.Semestres[:len(h.Semestres)-1]...),
	}
}
