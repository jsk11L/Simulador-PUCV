package engine

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// TestParseStudentCSV_Real parsea el CSV real de un alumno PUCV (Javier
// Sepúlveda, ICI 2022-2026) y valida la estructura. Es el test de
// referencia del formato.
func TestParseStudentCSV_Real(t *testing.T) {
	f, err := os.Open(filepath.Join("testdata", "cursos_inscritos_sample.csv"))
	if err != nil {
		t.Fatalf("abrir CSV: %v", err)
	}
	defer f.Close()

	h, err := ParseStudentCSV(f)
	if err != nil {
		t.Fatalf("parsear: %v", err)
	}

	if h.RUT != "21556428-2" {
		t.Errorf("RUT: got %q, want %q", h.RUT, "21556428-2")
	}
	if !strings.Contains(h.Nombre, "SEPULVEDA") {
		t.Errorf("Nombre no contiene SEPULVEDA: %q", h.Nombre)
	}
	if !strings.Contains(h.Carrera, "INGENIERIA CIVIL INFORMATICA") {
		t.Errorf("Carrera no contiene ICI: %q", h.Carrera)
	}

	// El alumno tiene 9 semestres (2022/1 a 2026/1).
	if len(h.Semestres) != 9 {
		t.Errorf("Semestres: got %d, want 9", len(h.Semestres))
		for i, s := range h.Semestres {
			t.Logf("  %d: %s (%d cursos)", i, s.Periodo, len(s.Cursos))
		}
	}

	// Primer semestre = S1-2022 con 4 ramos: ICI1241, ICI1243, ICI1458, MAT1001.
	if len(h.Semestres) > 0 {
		s0 := h.Semestres[0]
		if s0.Periodo != "S1-2022" {
			t.Errorf("primer período: got %q, want S1-2022", s0.Periodo)
		}
		if s0.Anio != 2022 || s0.Semestre != 1 {
			t.Errorf("primer (anio,sem): got (%d,%d), want (2022,1)", s0.Anio, s0.Semestre)
		}
		if len(s0.Cursos) != 4 {
			t.Errorf("primer semestre cursos: got %d, want 4", len(s0.Cursos))
		}
	}
}

func TestParseStudentCSV_SiglaSeccionSplit(t *testing.T) {
	cases := []struct {
		clave   string
		sigla   string
		seccion string
	}{
		{"ICI1241-02", "ICI1241", "02"},
		{"MAT1001-26", "MAT1001", "26"},
		{"FIN100-14-04", "FIN100-14", "04"},
		{"ICR010-02", "ICR010", "02"},
		{"OII450-01", "OII450", "01"},
		{"SinGuion", "SinGuion", ""},
		{"NO-NUMERICA", "NO-NUMERICA", ""}, // último componente no numérico
	}
	for _, c := range cases {
		sigla, seccion := splitSiglaSeccion(c.clave)
		if sigla != c.sigla || seccion != c.seccion {
			t.Errorf("splitSiglaSeccion(%q): got (%q,%q), want (%q,%q)",
				c.clave, sigla, seccion, c.sigla, c.seccion)
		}
	}
}

func TestParseStudentCSV_Periodo(t *testing.T) {
	cases := []struct {
		in       string
		id       string
		anio     int
		semestre int
		wantErr  bool
	}{
		{"1° Semestre 2022", "S1-2022", 2022, 1, false},
		{"2° Semestre 2025", "S2-2025", 2025, 2, false},
		{"1º Semestre 2024", "S1-2024", 2024, 1, false},
		{"texto sin patrón", "", 0, 0, true},
	}
	for _, c := range cases {
		id, anio, sem, err := parsePeriodo(c.in)
		if (err != nil) != c.wantErr {
			t.Errorf("parsePeriodo(%q): err=%v wantErr=%v", c.in, err, c.wantErr)
			continue
		}
		if c.wantErr {
			continue
		}
		if id != c.id || anio != c.anio || sem != c.semestre {
			t.Errorf("parsePeriodo(%q): got (%q,%d,%d), want (%q,%d,%d)",
				c.in, id, anio, sem, c.id, c.anio, c.semestre)
		}
	}
}

func TestParseStudentCSV_NotaChilena(t *testing.T) {
	cases := []struct {
		in   string
		want float64
	}{
		{"5,5", 5.5},
		{"3,9", 3.9},
		{"7", 7.0},
		{"4,1", 4.1},
		{"", 0},
		{"-", 0},
	}
	for _, c := range cases {
		got, err := parseNotaChilena(c.in)
		if err != nil {
			t.Errorf("parseNotaChilena(%q): err %v", c.in, err)
			continue
		}
		if got != c.want {
			t.Errorf("parseNotaChilena(%q): got %v, want %v", c.in, got, c.want)
		}
	}
}

func TestParseStudentCSV_Categorias(t *testing.T) {
	cases := []struct {
		sigla string
		want  models.CategoriaSubject
	}{
		{"ICI1241", models.CategoriaObligatoria},
		{"MAT1001", models.CategoriaObligatoria},
		{"ICR010", models.CategoriaFOFU},  // Antropología Cristiana
		{"ICR020", models.CategoriaFOFU},  // Ética Cristiana
		{"OII450", models.CategoriaOptativa},
		{"HIS016", models.CategoriaFOFU},
		{"AGR010", models.CategoriaFOFU},
		{"ICC012", models.CategoriaFOFU},
		{"FIN100", models.CategoriaFOFU},
	}
	for _, c := range cases {
		got := clasificarCategoria(c.sigla)
		if got != c.want {
			t.Errorf("clasificarCategoria(%q): got %q, want %q", c.sigla, got, c.want)
		}
	}
}

func TestParseStudentCSV_Reprobados(t *testing.T) {
	f, err := os.Open(filepath.Join("testdata", "cursos_inscritos_sample.csv"))
	if err != nil {
		t.Fatalf("abrir CSV: %v", err)
	}
	defer f.Close()

	h, err := ParseStudentCSV(f)
	if err != nil {
		t.Fatalf("parsear: %v", err)
	}

	// El alumno real reprobó 2 ramos en 2025/2: ICA4161 y ICI4248.
	reprobados := make(map[string]float64)
	for _, sem := range h.Semestres {
		for _, c := range sem.Cursos {
			if c.Estado == models.SubjectReprobado {
				reprobados[c.Sigla] = c.Nota
			}
		}
	}
	if len(reprobados) != 2 {
		t.Errorf("reprobaciones: got %d, want 2 (ICA4161 y ICI4248)", len(reprobados))
	}
	if n := reprobados["ICA4161"]; n != 3.9 {
		t.Errorf("ICA4161 nota: got %v, want 3.9", n)
	}
	if n := reprobados["ICI4248"]; n != 3.7 {
		t.Errorf("ICI4248 nota: got %v, want 3.7", n)
	}
}

func TestParseStudentCSV_RatioAprobacion(t *testing.T) {
	f, err := os.Open(filepath.Join("testdata", "cursos_inscritos_sample.csv"))
	if err != nil {
		t.Fatalf("abrir CSV: %v", err)
	}
	defer f.Close()

	h, err := ParseStudentCSV(f)
	if err != nil {
		t.Fatalf("parsear: %v", err)
	}

	ratio := h.RatioAprobacion()
	// Alumno con 2 reprobaciones sobre 47 ramos cursados.
	// Espero ratio > 0.85 (buen alumno).
	if ratio < 0.85 || ratio > 1.0 {
		t.Errorf("RatioAprobacion fuera de rango esperado: %v (esperado entre 0.85 y 1.0)", ratio)
	}
	t.Logf("Ratio aprobación del alumno: %.4f", ratio)
	t.Logf("Total créditos inscritos: %d", h.TotalCreditosInscritos())
	t.Logf("Total créditos aprobados: %d", h.TotalCreditosAprobados())
	t.Logf("Promedio carga semestral: %.2f", h.PromedioCargaSemestral())
}

func TestParseStudentCSV_UltimoSemestre(t *testing.T) {
	f, err := os.Open(filepath.Join("testdata", "cursos_inscritos_sample.csv"))
	if err != nil {
		t.Fatalf("abrir CSV: %v", err)
	}
	defer f.Close()

	h, err := ParseStudentCSV(f)
	if err != nil {
		t.Fatalf("parsear: %v", err)
	}

	ultimo := h.UltimoSemestre()
	if ultimo == nil {
		t.Fatal("UltimoSemestre nil para alumno con historial")
	}
	// 2026/1 es el período activo con cursos en curso.
	if ultimo.Periodo != "S1-2026" {
		t.Errorf("UltimoSemestre: got %s, want S1-2026", ultimo.Periodo)
	}

	// SinUltimoSemestre debería retornar 8 semestres (2022/1 a 2025/2).
	cortado := h.SinUltimoSemestre()
	if len(cortado.Semestres) != 8 {
		t.Errorf("SinUltimoSemestre len: got %d, want 8", len(cortado.Semestres))
	}
	if cortado.UltimoSemestre().Periodo != "S2-2025" {
		t.Errorf("nuevo último: got %s, want S2-2025", cortado.UltimoSemestre().Periodo)
	}
}
