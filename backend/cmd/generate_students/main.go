// Command generate_students produce historiales académicos sintéticos
// para alumnos individuales o cohortes, sobre la malla y escenarios del
// paper Mendoza Baeza (2023).
//
// Uso:
//
//	# Un alumno esforzado, escenario base, hasta titulación/eliminación
//	go run ./cmd/generate_students --profile esforzado_top --seed 42
//
//	# Un alumno "a mitad de carrera" (8 semestres cursados)
//	go run ./cmd/generate_students --profile promedio --until 8 --seed 99
//
//	# Cohorte: 50 alumnos promedio, escenario "Propuesta Final"
//	go run ./cmd/generate_students --count 50 --profile promedio --scenario pf
//
// Output: JSON con un StudentHistory (count=1) o un array de N (count>1).
// Por defecto a stdout; usar --out para escribir a archivo.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/jsk11L/Simulador-PUCV/engine"
	"github.com/jsk11L/Simulador-PUCV/models"
)

type scenarioInput struct {
	Scenario     string                      `json:"scenario"`
	Asignaturas  []models.AsignaturaPayload  `json:"asignaturas"`
	Programacion *models.ProgramacionPayload `json:"programacion,omitempty"`
}

var scenarioOverrides = map[string]struct{ NCSmax int }{
	"pf": {NCSmax: 25},
}

func main() {
	profileName := flag.String("profile", "promedio", "Perfil del alumno: esforzado_top|promedio_alto|promedio|promedio_bajo|en_problemas")
	scenarioID := flag.String("scenario", "caso_actual", "Escenario del paper: caso_actual|pe|cas|r_10|r_mas_10|r_10_gt_40|pf")
	seed := flag.Int64("seed", 0, "Seed (0 = aleatoria por reloj; valor fijo para reproducir)")
	count := flag.Int("count", 1, "Cantidad de alumnos a generar")
	until := flag.Int("until", 0, "Cortar al final del semestre N (0 = hasta cierre natural)")
	outPath := flag.String("out", "", "Ruta de salida JSON (vacío = stdout)")
	pretty := flag.Bool("pretty", true, "Indentar JSON de salida")
	flag.Parse()

	profile, ok := engine.ProfileByName(*profileName)
	if !ok {
		fmt.Fprintf(os.Stderr, "perfil desconocido: %q\n", *profileName)
		fmt.Fprintln(os.Stderr, "perfiles disponibles:")
		for _, p := range engine.ProfilePresets() {
			fmt.Fprintf(os.Stderr, "  - %s (esfuerzo=%.2f disciplina=%.2f tolerancia=%.2f)\n",
				p.Nombre, p.Esfuerzo, p.Disciplina, p.Tolerancia)
		}
		os.Exit(2)
	}

	sc, err := loadScenarioJSON(*scenarioID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "cargando escenario %q: %v\n", *scenarioID, err)
		os.Exit(2)
	}

	ncsmax := 21
	if ovr, ok := scenarioOverrides[*scenarioID]; ok && ovr.NCSmax != 0 {
		ncsmax = ovr.NCSmax
	}

	baseSeed := *seed
	if baseSeed == 0 {
		baseSeed = 1
	}

	results := make([]models.StudentHistory, 0, *count)
	for i := 0; i < *count; i++ {
		cfg := engine.GeneratorConfig{
			Profile:      profile,
			Asignaturas:  sc.Asignaturas,
			Programacion: sc.Programacion,
			Variables: models.VariablesPayload{
				NCSmax:       ncsmax,
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
			Seed:          baseSeed + int64(i)*1000003,
			UntilSemestre: *until,
			RUT:           fmt.Sprintf("SYN-%s-%d", profile.Nombre, i),
			Nombre:        fmt.Sprintf("Sintético %s #%d", profile.Nombre, i),
			Carrera:       "ICE (sintético)",
		}
		hist, err := cfg.Generar()
		if err != nil {
			fmt.Fprintf(os.Stderr, "generar alumno #%d: %v\n", i, err)
			os.Exit(1)
		}
		results = append(results, hist)
	}

	var payload any = results
	if *count == 1 {
		payload = results[0]
	}

	enc := json.NewEncoder(getOutput(*outPath))
	if *pretty {
		enc.SetIndent("", "  ")
	}
	if err := enc.Encode(payload); err != nil {
		fmt.Fprintf(os.Stderr, "serializar: %v\n", err)
		os.Exit(1)
	}

	if *outPath != "" {
		fmt.Fprintf(os.Stderr, "generados %d alumnos perfil=%s seed=%d → %s\n",
			*count, profile.Nombre, baseSeed, *outPath)
	}
}

func loadScenarioJSON(scenarioID string) (*scenarioInput, error) {
	// Búsqueda en cascada: testdata embebido o carpeta original/.
	candidates := []string{
		filepath.Join("engine", "testdata", "scenarios", scenarioID+".json"),
		filepath.Join("..", "engine", "testdata", "scenarios", scenarioID+".json"),
		filepath.Join("..", "original", "scenarios", scenarioID+".json"),
		filepath.Join("..", "..", "original", "scenarios", scenarioID+".json"),
	}
	var lastErr error
	for _, p := range candidates {
		data, err := os.ReadFile(p)
		if err != nil {
			lastErr = err
			continue
		}
		var sc scenarioInput
		if err := json.Unmarshal(data, &sc); err != nil {
			return nil, fmt.Errorf("parse %s: %w", p, err)
		}
		return &sc, nil
	}
	return nil, fmt.Errorf("no encontrado en ninguno de: %s (último error: %v)",
		strings.Join(candidates, ", "), lastErr)
}

func getOutput(path string) *os.File {
	if path == "" {
		return os.Stdout
	}
	f, err := os.Create(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "crear %s: %v\n", path, err)
		os.Exit(1)
	}
	return f
}
