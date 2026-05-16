package engine

import (
	"bufio"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// ParseStudentCSV lee el formato CSV exacto que entrega la PUCV (vista
// "Cursos Inscritos") y devuelve un StudentHistory con los semestres
// agrupados cronológicamente.
//
// Formato esperado:
//
//	RUT: 21556428-2;;;;;;
//	Nombre: SEPULVEDA CABRERA JAVIER ARTURO;;;;;;
//	Carrera: 227 - INGENIERIA CIVIL INFORMATICA;;;;;;
//	Peíodo;Clave;Nombre Asignatura;Créditos;Nota;Inscripciones;Finalización
//	1° Semestre 2022;ICI1241-02;FUNDAMENTOS DE ALGORITMOS;4;5,5;VIGENTE;Aprobado
//	...
//
// Convenciones:
//   - Separador: ';'
//   - Decimal: ',' (estilo chileno)
//   - Sigla-Sección: la sección es el último componente tras el último '-'.
//     "ICI1241-02" → sigla="ICI1241", sección="02"
//   - Categoría: heurística por prefijo (ver clasificarCategoria).
func ParseStudentCSV(r io.Reader) (models.StudentHistory, error) {
	var h models.StudentHistory
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)

	semByPeriodo := make(map[string]*models.SemesterRecord)
	periodoOrder := make([]string, 0)
	firstLine := true

	for scanner.Scan() {
		raw := strings.TrimRight(scanner.Text(), "\r\n")
		// Eliminar BOM UTF-8 (EF BB BF) si está al inicio del archivo.
		if firstLine {
			raw = stripUTF8BOM(raw)
			firstLine = false
		}
		if raw == "" {
			continue
		}

		// Líneas de metadata del alumno.
		if strings.HasPrefix(raw, "RUT:") {
			h.RUT = extractMeta(raw, "RUT:")
			continue
		}
		if strings.HasPrefix(raw, "Nombre:") {
			h.Nombre = extractMeta(raw, "Nombre:")
			continue
		}
		if strings.HasPrefix(raw, "Carrera:") {
			h.Carrera = extractMeta(raw, "Carrera:")
			continue
		}

		fields := strings.Split(raw, ";")
		if len(fields) < 7 {
			continue // línea corrupta o vacía
		}

		// Las filas de datos comienzan con un dígito (1° Semestre 2022).
		// Cualquier otra cosa (header de columnas, separadores) se ignora.
		if !esLineaDeDatos(fields[0]) {
			continue
		}

		periodo := strings.TrimSpace(fields[0])
		clave := strings.TrimSpace(fields[1])
		nombre := strings.TrimSpace(fields[2])
		creditosStr := strings.TrimSpace(fields[3])
		notaStr := strings.TrimSpace(fields[4])
		// fields[5] = Inscripciones (VIGENTE/RETIRO/etc) — no se usa aún
		finalizacionStr := strings.TrimSpace(fields[6])

		if periodo == "" || clave == "" {
			continue
		}

		periodoID, anio, semestre, err := parsePeriodo(periodo)
		if err != nil {
			return h, fmt.Errorf("período inválido %q: %w", periodo, err)
		}

		sigla, seccion := splitSiglaSeccion(clave)

		creditos, err := strconv.Atoi(creditosStr)
		if err != nil {
			return h, fmt.Errorf("créditos inválidos en %s (%s): %w", clave, creditosStr, err)
		}

		nota, err := parseNotaChilena(notaStr)
		if err != nil {
			return h, fmt.Errorf("nota inválida en %s (%s): %w", clave, notaStr, err)
		}

		estado := parseEstadoFinalizacion(finalizacionStr, nota)
		categoria := clasificarCategoria(sigla)

		rec := models.SubjectRecord{
			Sigla:     sigla,
			Seccion:   seccion,
			Nombre:    nombre,
			Creditos:  creditos,
			Nota:      nota,
			Estado:    estado,
			Categoria: categoria,
		}

		sem, ok := semByPeriodo[periodoID]
		if !ok {
			sem = &models.SemesterRecord{
				Periodo:  periodoID,
				Anio:     anio,
				Semestre: semestre,
				Cursos:   make([]models.SubjectRecord, 0),
			}
			semByPeriodo[periodoID] = sem
			periodoOrder = append(periodoOrder, periodoID)
		}
		sem.Cursos = append(sem.Cursos, rec)
	}

	if err := scanner.Err(); err != nil {
		return h, fmt.Errorf("error de lectura: %w", err)
	}

	h.Semestres = make([]models.SemesterRecord, 0, len(periodoOrder))
	for _, id := range periodoOrder {
		h.Semestres = append(h.Semestres, *semByPeriodo[id])
	}
	return h, nil
}

func extractMeta(line, prefix string) string {
	s := strings.TrimSpace(strings.TrimPrefix(line, prefix))
	// remover los ;;;;;; al final
	s = strings.TrimRight(s, ";")
	return strings.TrimSpace(s)
}

// esLineaDeDatos retorna true si la primera columna parece una fila de
// datos. Las filas de datos comienzan con un dígito ("1° Semestre 2022");
// cualquier otra cosa (encabezado de columnas, separadores, etc.) se
// considera ruido y se ignora.
func esLineaDeDatos(first string) bool {
	if first == "" {
		return false
	}
	c := first[0]
	return c >= '0' && c <= '9'
}

// stripUTF8BOM remueve el marcador BOM UTF-8 (EF BB BF) si está al inicio
// del string. Se trabaja con bytes para evitar tener el BOM como literal
// dentro del código fuente (cosa que el compilador Go rechaza).
func stripUTF8BOM(s string) string {
	if len(s) >= 3 && s[0] == 0xEF && s[1] == 0xBB && s[2] == 0xBF {
		return s[3:]
	}
	return s
}

// parsePeriodo convierte "1° Semestre 2022" / "2° Semestre 2025" a:
//
//	periodoID = "S1-2022" / "S2-2025"
//	anio = 2022, semestre = 1
//
// Soporta tanto el "°" Unicode como variantes con "º" o "1er Semestre".
var rePeriodo = regexp.MustCompile(`(?i)(\d)[°º]?\s*Sem(?:estre)?\s*(\d{4})`)

func parsePeriodo(s string) (id string, anio, semestre int, err error) {
	m := rePeriodo.FindStringSubmatch(s)
	if len(m) != 3 {
		return "", 0, 0, fmt.Errorf("no matchea patrón período")
	}
	semestre, err = strconv.Atoi(m[1])
	if err != nil {
		return "", 0, 0, err
	}
	anio, err = strconv.Atoi(m[2])
	if err != nil {
		return "", 0, 0, err
	}
	if semestre != 1 && semestre != 2 {
		return "", 0, 0, fmt.Errorf("semestre debe ser 1 o 2, fue %d", semestre)
	}
	id = fmt.Sprintf("S%d-%d", semestre, anio)
	return id, anio, semestre, nil
}

// splitSiglaSeccion separa "ICI1241-02" en ("ICI1241", "02").
// La sección es el último componente numérico tras el último guión.
// Si no hay guión o el último componente no es numérico, devuelve la
// clave entera como sigla.
func splitSiglaSeccion(clave string) (sigla, seccion string) {
	idx := strings.LastIndex(clave, "-")
	if idx < 0 {
		return clave, ""
	}
	candidato := clave[idx+1:]
	if _, err := strconv.Atoi(candidato); err != nil {
		return clave, ""
	}
	return clave[:idx], candidato
}

// parseNotaChilena convierte "5,5" → 5.5. Cadena vacía o "-" → 0
// (representa "sin nota" para cursos en curso).
func parseNotaChilena(s string) (float64, error) {
	s = strings.TrimSpace(s)
	if s == "" || s == "-" {
		return 0, nil
	}
	s = strings.ReplaceAll(s, ",", ".")
	return strconv.ParseFloat(s, 64)
}

// parseEstadoFinalizacion mapea la columna "Finalización" al enum.
// Reglas:
//
//	"Aprobado"   → SubjectAprobado
//	"Reprobado"  → SubjectReprobado
//	""           → SubjectEnCurso (curso vigente sin nota final)
//	"Retiro" etc → SubjectAbandonado
func parseEstadoFinalizacion(s string, nota float64) models.EstadoSubject {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "aprobado", "aprobada", "aprob":
		return models.SubjectAprobado
	case "reprobado", "reprobada", "reprob":
		return models.SubjectReprobado
	case "":
		return models.SubjectEnCurso
	default:
		// Estados raros (Retiro, Anulado, etc.) caen acá
		return models.SubjectAbandonado
	}
}

// clasificarCategoria asigna categoría por prefijo de sigla.
// Heurística simple, mejorable cuando integremos malla oficial.
//
//	ICR*         → FOFU (Antropología/Ética obligatorias)
//	OII*         → Optativa (electivos del área en ICI)
//	HIS*, AGR*,  → FOFU (electivos de formación general)
//	ICC*, FIN*,
//	resto        → Obligatoria
func clasificarCategoria(sigla string) models.CategoriaSubject {
	prefix := siglaPrefix(sigla)
	switch prefix {
	case "ICR":
		return models.CategoriaFOFU
	case "OII":
		return models.CategoriaOptativa
	case "HIS", "AGR", "ICC", "FIN":
		return models.CategoriaFOFU
	default:
		return models.CategoriaObligatoria
	}
}

// siglaPrefix extrae las letras iniciales de una sigla.
// "ICI1241" → "ICI", "MAT1001" → "MAT".
func siglaPrefix(sigla string) string {
	for i, r := range sigla {
		if r < 'A' || r > 'Z' {
			return sigla[:i]
		}
	}
	return sigla
}
