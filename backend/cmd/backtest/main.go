// Command backtest valida la calidad predictiva del motor individual
// sobre cohortes sintéticas con perfiles conocidos.
//
// Modos:
//
//	# Backtest único con DefaultWeights
//	go run ./cmd/backtest --profile promedio --count 30
//
//	# Backtest con pesos específicos
//	go run ./cmd/backtest --profile promedio --w-hist 1.5 --w-prereq 0.3 --w-stress 0.7
//
//	# Grid search de calibración (busca mejor combinación)
//	go run ./cmd/backtest --profile promedio --calibrate
//
//	# Grid search con métrica específica
//	go run ./cmd/backtest --profile promedio --calibrate --metric log_loss
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

func main() {
	profileName := flag.String("profile", "promedio", "Perfil del alumno: esforzado_top|promedio_alto|promedio|promedio_bajo|en_problemas")
	scenarioID := flag.String("scenario", "caso_actual", "Escenario base")
	count := flag.Int("count", 30, "Cantidad de alumnos sintéticos")
	iter := flag.Int("iter", 200, "Iteraciones por punto de corte")
	seed := flag.Int64("seed", 20260516, "Seed base")
	napCorte := flag.Int("nap-corte", 3, "Primer semestre para walk-forward")

	wHist := flag.Float64("w-hist", 1.0, "Peso W_hist (modo simple)")
	wPrereq := flag.Float64("w-prereq", 0.5, "Peso W_prereq (modo simple)")
	wStress := flag.Float64("w-stress", 0.5, "Peso W_stress (modo simple)")

	calibrate := flag.Bool("calibrate", false, "Modo grid search de calibración")
	metric := flag.String("metric", "brier", "Métrica para calibración: brier|log_loss|accuracy")
	outPath := flag.String("out", "", "Ruta para guardar JSON completo (vacío = no guardar)")
	flag.Parse()

	profile, ok := engine.ProfileByName(*profileName)
	if !ok {
		fmt.Fprintf(os.Stderr, "perfil desconocido: %q\n", *profileName)
		os.Exit(2)
	}

	sc, err := cargarScenario(*scenarioID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "escenario: %v\n", err)
		os.Exit(2)
	}

	vars := models.VariablesPayload{
		NCSmax:       21,
		TAmin:        12.3,
		NapTAmin:     10,
		Opor:         6,
		MaxSemestres: 30,
	}
	if *scenarioID == "pf" {
		vars.NCSmax = 25
	}
	modelo := models.ModeloPayload{
		VMap1234: 0.48, Delta1234: 0.2,
		VMap5678: 0.55, Delta5678: 0.2,
		VMapM: 0.65, DeltaM: 0.25,
	}

	if *calibrate {
		runCalibration(profile, sc, vars, modelo, *count, *iter, *seed, *napCorte, *metric, *outPath)
		return
	}

	runSingleBacktest(profile, sc, vars, modelo, *count, *iter, *seed, *napCorte,
		engine.Weights{WHist: *wHist, WPrereq: *wPrereq, WStress: *wStress}, *outPath)
}

func runSingleBacktest(
	profile engine.StudentProfile,
	sc *scenarioInput,
	vars models.VariablesPayload,
	modelo models.ModeloPayload,
	count, iter int,
	seed int64,
	napCorte int,
	weights engine.Weights,
	outPath string,
) {
	fmt.Printf("=== Backtest %s (N=%d) ===\n", profile.Nombre, count)
	fmt.Printf("Weights: W_hist=%.2f W_prereq=%.2f W_stress=%.2f\n",
		weights.WHist, weights.WPrereq, weights.WStress)
	fmt.Println()

	bt, err := engine.BacktestCohort(engine.CohortBacktestConfig{
		Profile:      profile,
		Count:        count,
		Asignaturas:  sc.Asignaturas,
		Programacion: sc.Programacion,
		Variables:    vars,
		Modelo:       modelo,
		Weights:      weights,
		Iteraciones:  iter,
		BaseSeed:     seed,
		NapCorteIni:  napCorte,
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, "backtest:", err)
		os.Exit(1)
	}

	fmt.Printf("Alumnos evaluados:     %d / %d\n", bt.AlumnosEvaluados, count)
	fmt.Printf("Predicciones totales:  %d\n", bt.PrediccionesTotal)
	fmt.Println()
	fmt.Printf("Brier score:   %.4f  (menor = mejor)\n", bt.BrierAvg)
	fmt.Printf("Accuracy:      %.4f  (mayor = mejor)\n", bt.AccuracyAvg)
	fmt.Printf("Log-loss:      %.4f  (menor = mejor)\n", bt.LogLossAvg)

	if outPath != "" {
		guardarJSON(outPath, bt)
	}
}

func runCalibration(
	profile engine.StudentProfile,
	sc *scenarioInput,
	vars models.VariablesPayload,
	modelo models.ModeloPayload,
	count, iter int,
	seed int64,
	napCorte int,
	metric, outPath string,
) {
	fmt.Printf("=== Calibración (Grid Search) — %s (N=%d) ===\n", profile.Nombre, count)
	fmt.Printf("Métrica: %s\n\n", engine.MetricLabel(metric))

	cal, err := engine.CalibrateGridSearch(engine.CalibrationConfig{
		Profile:      profile,
		Count:        count,
		Asignaturas:  sc.Asignaturas,
		Programacion: sc.Programacion,
		Variables:    vars,
		Modelo:       modelo,
		Iteraciones:  iter,
		BaseSeed:     seed,
		NapCorteIni:  napCorte,
		Metric:       metric,
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, "calibrate:", err)
		os.Exit(1)
	}

	// Imprimir grilla ordenada por métrica
	fmt.Printf("Total puntos: %d\n\n", len(cal.AllPoints))
	fmt.Printf("%-10s %-10s %-10s | %-10s %-10s %-10s\n",
		"W_hist", "W_prereq", "W_stress", "Brier", "Accuracy", "LogLoss")
	fmt.Println(strings.Repeat("-", 76))
	for _, p := range cal.AllPoints {
		marker := "  "
		if p.Weights == cal.Best.Weights {
			marker = "★ "
		}
		fmt.Printf("%s%-8.2f %-10.2f %-10.2f | %-10.4f %-10.4f %-10.4f\n",
			marker, p.Weights.WHist, p.Weights.WPrereq, p.Weights.WStress,
			p.Brier, p.Accuracy, p.LogLoss)
	}
	fmt.Println()

	fmt.Println("Resultados clave:")
	fmt.Printf("  ★ MEJOR:     %s\n", engine.FormatPoint(cal.Best, metric))
	fmt.Printf("    Baseline:  %s\n", engine.FormatPoint(cal.Baseline, metric))
	fmt.Printf("    Peor:      %s\n", engine.FormatPoint(cal.Worst, metric))

	delta := cal.Best.MetricValue(metric) - cal.Baseline.MetricValue(metric)
	fmt.Printf("\nGanancia sobre baseline (ZeroWeights): Δ%s = %+.4f\n",
		metric, delta)

	if outPath != "" {
		guardarJSON(outPath, cal)
	}
}

func cargarScenario(scenarioID string) (*scenarioInput, error) {
	candidates := []string{
		filepath.Join("engine", "testdata", "scenarios", scenarioID+".json"),
		filepath.Join("..", "engine", "testdata", "scenarios", scenarioID+".json"),
		filepath.Join("..", "original", "scenarios", scenarioID+".json"),
		filepath.Join("..", "..", "original", "scenarios", scenarioID+".json"),
	}
	for _, p := range candidates {
		data, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		var sc scenarioInput
		if err := json.Unmarshal(data, &sc); err != nil {
			return nil, fmt.Errorf("parse %s: %w", p, err)
		}
		return &sc, nil
	}
	return nil, fmt.Errorf("escenario %q no encontrado", scenarioID)
}

func guardarJSON(path string, payload any) {
	f, err := os.Create(path)
	if err != nil {
		fmt.Fprintln(os.Stderr, "crear out:", err)
		return
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if err := enc.Encode(payload); err != nil {
		fmt.Fprintln(os.Stderr, "serializar:", err)
		return
	}
	fmt.Fprintf(os.Stderr, "→ guardado en %s\n", path)
}
