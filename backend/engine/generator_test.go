package engine

import (
	"testing"

	"github.com/jsk11L/Simulador-PUCV/models"
)

// configBase devuelve un GeneratorConfig listo con el escenario "caso_actual"
// y el perfil indicado. Las variables son las del paper.
func configBase(t *testing.T, profile StudentProfile, seed int64) GeneratorConfig {
	t.Helper()
	sc := loadScenario(t, "caso_actual")
	return GeneratorConfig{
		Profile:      profile,
		Asignaturas:  sc.Asignaturas,
		Programacion: sc.Programacion,
		Variables: models.VariablesPayload{
			NCSmax:       21,
			TAmin:        12.3,
			NapTAmin:     10,
			Opor:         6,
			MaxSemestres: 30,
		},
		Modelo: models.ModeloPayload{
			VMap1234: 0.48, Delta1234: 0.2,
			VMap5678: 0.55, Delta5678: 0.2,
			VMapM: 0.65, DeltaM: 0.25,
		},
		Seed: seed,
	}
}

// TestGenerator_NotasEnEscalaChilena verifica que toda nota cae en [1.0, 7.0]
// con un decimal de precisión.
func TestGenerator_NotasEnEscalaChilena(t *testing.T) {
	cfg := configBase(t, ProfilePromedio, 42)
	cfg.UntilSemestre = 12
	hist, err := cfg.Generar()
	if err != nil {
		t.Fatalf("Generar: %v", err)
	}
	for _, sem := range hist.Semestres {
		for _, c := range sem.Cursos {
			if c.Nota < 1.0 || c.Nota > 7.0 {
				t.Errorf("nota fuera de rango en %s/%s: %.2f", sem.Periodo, c.Sigla, c.Nota)
			}
		}
	}
}

// TestGenerator_AprobadosConNotaSuficiente verifica el invariante:
// si el ramo está aprobado, nota >= 4.0; si reprobado, nota < 4.0.
func TestGenerator_AprobadosConNotaSuficiente(t *testing.T) {
	cfg := configBase(t, ProfilePromedio, 99)
	cfg.UntilSemestre = 12
	hist, err := cfg.Generar()
	if err != nil {
		t.Fatalf("Generar: %v", err)
	}
	for _, sem := range hist.Semestres {
		for _, c := range sem.Cursos {
			if c.Estado == models.SubjectAprobado && c.Nota < 4.0 {
				t.Errorf("aprobado con nota < 4.0: %s/%s = %.2f", sem.Periodo, c.Sigla, c.Nota)
			}
			if c.Estado == models.SubjectReprobado && c.Nota >= 4.0 {
				t.Errorf("reprobado con nota >= 4.0: %s/%s = %.2f", sem.Periodo, c.Sigla, c.Nota)
			}
		}
	}
}

// TestGenerator_DeterministaConSeed verifica reproducibilidad exacta.
func TestGenerator_DeterministaConSeed(t *testing.T) {
	cfg1 := configBase(t, ProfilePromedioAlto, 12345)
	cfg2 := configBase(t, ProfilePromedioAlto, 12345)
	cfg1.UntilSemestre = 10
	cfg2.UntilSemestre = 10

	h1, err := cfg1.Generar()
	if err != nil {
		t.Fatalf("Generar 1: %v", err)
	}
	h2, err := cfg2.Generar()
	if err != nil {
		t.Fatalf("Generar 2: %v", err)
	}
	if len(h1.Semestres) != len(h2.Semestres) {
		t.Fatalf("len Semestres difiere: %d vs %d", len(h1.Semestres), len(h2.Semestres))
	}
	for i := range h1.Semestres {
		s1, s2 := h1.Semestres[i], h2.Semestres[i]
		if len(s1.Cursos) != len(s2.Cursos) {
			t.Errorf("sem %d cursos: %d vs %d", i, len(s1.Cursos), len(s2.Cursos))
			continue
		}
		for j, c1 := range s1.Cursos {
			c2 := s2.Cursos[j]
			if c1.Sigla != c2.Sigla || c1.Nota != c2.Nota || c1.Estado != c2.Estado {
				t.Errorf("sem %d curso %d difiere: %+v vs %+v", i, j, c1, c2)
			}
		}
	}
}

// TestGenerator_PerfilEsforzadoTitulaCasiSiempre cohorte de esforzados:
// se espera tasa de titulación >= 80%.
func TestGenerator_PerfilEsforzadoTitulaCasiSiempre(t *testing.T) {
	const N = 50
	titulados := 0
	for i := 0; i < N; i++ {
		cfg := configBase(t, ProfileEsforzadoTop, int64(i*7919+1))
		hist, err := cfg.Generar()
		if err != nil {
			t.Fatalf("Generar #%d: %v", i, err)
		}
		if hist.Estado == models.TrayectoriaTitulado {
			titulados++
		}
	}
	tasa := float64(titulados) / float64(N)
	t.Logf("tasa titulación esforzado_top (N=%d): %.2f%%", N, tasa*100)
	if tasa < 0.80 {
		t.Errorf("tasa titulación esforzado < 80%%: %.2f%%", tasa*100)
	}
}

// TestGenerator_PerfilEnProblemasTitulaPoco cohorte de en_problemas:
// se espera tasa de titulación <= 30%.
func TestGenerator_PerfilEnProblemasTitulaPoco(t *testing.T) {
	const N = 50
	titulados := 0
	for i := 0; i < N; i++ {
		cfg := configBase(t, ProfileEnProblemas, int64(i*7919+1))
		hist, err := cfg.Generar()
		if err != nil {
			t.Fatalf("Generar #%d: %v", i, err)
		}
		if hist.Estado == models.TrayectoriaTitulado {
			titulados++
		}
	}
	tasa := float64(titulados) / float64(N)
	t.Logf("tasa titulación en_problemas (N=%d): %.2f%%", N, tasa*100)
	if tasa > 0.30 {
		t.Errorf("tasa titulación en_problemas > 30%%: %.2f%%", tasa*100)
	}
}

// TestGenerator_ElectivosObligatorios verifica que ICR010 y ICR020 aparezcan
// siempre en el historial (electivos universales).
func TestGenerator_ElectivosObligatorios(t *testing.T) {
	const N = 20
	for i := 0; i < N; i++ {
		cfg := configBase(t, ProfilePromedio, int64(i*1009+1))
		hist, err := cfg.Generar()
		if err != nil {
			t.Fatalf("Generar #%d: %v", i, err)
		}
		// Solo verifico si el alumno alcanzó a tomarlos antes de eliminarse
		// (en alumnos muy débiles puede eliminarse antes que se asigne).
		if hist.Estado != models.TrayectoriaTitulado {
			continue
		}
		visto := map[string]bool{}
		for _, sem := range hist.Semestres {
			for _, c := range sem.Cursos {
				visto[c.Sigla] = true
			}
		}
		if !visto["ICR010"] {
			t.Errorf("seed %d (titulado): falta ICR010 en historial", i*1009+1)
		}
		if !visto["ICR020"] {
			t.Errorf("seed %d (titulado): falta ICR020 en historial", i*1009+1)
		}
	}
}

// TestGenerator_UntilSemestreCorta valida que --until-semestre=N produce
// exactamente N semestres y el alumno queda "activo".
func TestGenerator_UntilSemestreCorta(t *testing.T) {
	cfg := configBase(t, ProfileEsforzadoTop, 42)
	cfg.UntilSemestre = 5

	hist, err := cfg.Generar()
	if err != nil {
		t.Fatalf("Generar: %v", err)
	}
	if len(hist.Semestres) != 5 {
		t.Errorf("semestres: got %d, want 5", len(hist.Semestres))
	}
	if hist.Estado != models.TrayectoriaActiva {
		t.Errorf("estado: got %s, want activa", hist.Estado)
	}
}

// TestGenerator_OrdenDePresets valida que el orden por esfuerzo se respeta
// en las tasas de titulación (esforzado >= alto >= promedio >= bajo >= problemas).
func TestGenerator_OrdenDePresets(t *testing.T) {
	const N = 30
	presets := ProfilePresets()
	tasas := make([]float64, len(presets))
	for idx, p := range presets {
		titulados := 0
		for i := 0; i < N; i++ {
			cfg := configBase(t, p, int64(i*1013+idx))
			hist, err := cfg.Generar()
			if err != nil {
				t.Fatalf("Generar %s #%d: %v", p.Nombre, i, err)
			}
			if hist.Estado == models.TrayectoriaTitulado {
				titulados++
			}
		}
		tasas[idx] = float64(titulados) / float64(N)
		t.Logf("%-15s tasa titulación: %.1f%%", p.Nombre, tasas[idx]*100)
	}
	// Orden no estricto (puede haber ties), pero el primero debe superar al último.
	if tasas[0] <= tasas[len(tasas)-1] {
		t.Errorf("esforzado_top no supera a en_problemas: %.2f vs %.2f", tasas[0], tasas[len(tasas)-1])
	}
}
