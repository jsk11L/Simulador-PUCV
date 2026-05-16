package engine

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
)

// reportRow es una fila del reporte de contraste paper vs motor Go.
// Una fila contiene las 4 métricas principales (PPE, PSCE, EE, PEO) con
// su valor paper, valor obtenido por el motor, delta y estado de tolerancia.
type reportRow struct {
	Scenario    string
	Label       string
	Descripcion string
	Metrics     map[string]reportMetric
}

type reportMetric struct {
	Paper    float64
	Motor    float64
	Delta    float64
	Within   bool    // true si el delta está dentro de tolerancia
	Severity string  // "ok" | "warn" | "fail"
	TolPP    float64 // tolerancia aplicada (para mostrar)
}

// reportToleranceConfig define las tolerancias por métrica. Las usadas
// por TestCriticalParity_PaperRange.
type reportToleranceConfig struct {
	TolPP       float64 // PPE, PEO (puntos porcentuales)
	TolSem      float64 // PSCE (semestres absolutos)
	TolEE       float64 // EE (absoluto)
	WarnPercent float64 // multiplicador para zona "warn" (ej: 0.6 → 60% tolerancia)
}

var defaultReportTolerances = reportToleranceConfig{
	TolPP:       15.0,
	TolSem:      0.5,
	TolEE:       0.05,
	WarnPercent: 0.6,
}

func computeSeverity(delta, tol, warnPct float64) (bool, string) {
	abs := math.Abs(delta)
	if abs <= tol*warnPct {
		return true, "ok"
	}
	if abs <= tol {
		return true, "warn"
	}
	return false, "fail"
}

// buildReportRow construye una fila del reporte aplicando tolerancias.
func buildReportRow(scenario, label, descripcion string, paper, motor criticalMetrics, tol reportToleranceConfig) reportRow {
	mk := func(p, m, tolValue float64) reportMetric {
		delta := m - p
		within, sev := computeSeverity(delta, tolValue, tol.WarnPercent)
		return reportMetric{
			Paper:    p,
			Motor:    m,
			Delta:    delta,
			Within:   within,
			Severity: sev,
			TolPP:    tolValue,
		}
	}
	return reportRow{
		Scenario:    scenario,
		Label:       label,
		Descripcion: descripcion,
		Metrics: map[string]reportMetric{
			"PPE":  mk(paper.PPE, motor.PPE, tol.TolPP),
			"PSCE": mk(paper.PSCE, motor.PSCE, tol.TolSem),
			"EE":   mk(paper.EE, motor.EE, tol.TolEE),
			"PEO":  mk(paper.PEO, motor.PEO, tol.TolPP),
		},
	}
}

// renderReportCSV produce un CSV plano con todas las métricas en wide format.
// Incluye una columna `status_<metric>` por cada métrica para procesamiento
// posterior (ej: filtrar escenarios que fallaron).
func renderReportCSV(rows []reportRow) string {
	var b strings.Builder
	b.WriteString("scenario,paper_ppe,motor_ppe,delta_ppe,status_ppe,")
	b.WriteString("paper_psce,motor_psce,delta_psce,status_psce,")
	b.WriteString("paper_ee,motor_ee,delta_ee,status_ee,")
	b.WriteString("paper_peo,motor_peo,delta_peo,status_peo\n")

	for _, r := range rows {
		b.WriteString(r.Scenario)
		for _, key := range []string{"PPE", "PSCE", "EE", "PEO"} {
			m := r.Metrics[key]
			fmt.Fprintf(&b, ",%.2f,%.2f,%+.2f,%s",
				m.Paper, m.Motor, m.Delta, m.Severity)
		}
		b.WriteString("\n")
	}
	return b.String()
}

// renderReportHTML produce un reporte HTML estilizado con colores según
// severidad: verde (ok), amarillo (warn dentro de tolerancia pero al límite),
// rojo (fail fuera de tolerancia). Los valores del paper se muestran en gris
// neutro para no competir visualmente.
func renderReportHTML(rows []reportRow, tol reportToleranceConfig, generatedAt time.Time) string {
	var b strings.Builder

	b.WriteString(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>SimulaPUCV — Contraste Motor Go vs Paper</title>
<style>
:root {
  --bg: #0f172a;
  --panel: #1e293b;
  --panel-2: #334155;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --ok-bg: #064e3b;
  --ok-fg: #6ee7b7;
  --warn-bg: #78350f;
  --warn-fg: #fcd34d;
  --fail-bg: #7f1d1d;
  --fail-fg: #fca5a5;
  --paper: #475569;
  --border: #334155;
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 32px;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 800; }
.subtitle { color: var(--muted); margin-bottom: 24px; font-size: 14px; }
.legend {
  display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
  padding: 16px; background: var(--panel); border-radius: 12px;
  border: 1px solid var(--border);
}
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.swatch { width: 14px; height: 14px; border-radius: 4px; }
.swatch.ok   { background: var(--ok-fg); }
.swatch.warn { background: var(--warn-fg); }
.swatch.fail { background: var(--fail-fg); }
.swatch.paper{ background: var(--paper); }
table {
  width: 100%; border-collapse: separate; border-spacing: 0;
  background: var(--panel); border-radius: 12px; overflow: hidden;
  border: 1px solid var(--border); font-size: 13px;
}
th, td { padding: 12px 14px; text-align: right; }
th {
  background: var(--panel-2); color: var(--text);
  font-weight: 700; text-transform: uppercase;
  font-size: 11px; letter-spacing: 0.5px;
}
th.scenario, td.scenario { text-align: left; }
tbody tr { border-top: 1px solid var(--border); }
tbody tr:hover { background: rgba(255,255,255,0.02); }
.cell {
  display: inline-flex; flex-direction: column; gap: 2px;
  padding: 8px 10px; border-radius: 8px;
  font-variant-numeric: tabular-nums;
}
.cell .v { font-weight: 700; font-size: 14px; }
.cell .d { font-size: 11px; opacity: 0.85; }
.cell.paper { background: rgba(71, 85, 105, 0.25); color: var(--text); }
.cell.paper .v { color: var(--muted); }
.cell.ok    { background: var(--ok-bg);   color: var(--ok-fg); }
.cell.warn  { background: var(--warn-bg); color: var(--warn-fg); }
.cell.fail  { background: var(--fail-bg); color: var(--fail-fg); }
.scenario-name { font-weight: 700; font-size: 14px; }
.scenario-id {
  color: var(--muted);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-top: 2px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.scenario-desc {
  color: var(--muted);
  font-size: 12px;
  margin-top: 6px;
  max-width: 520px;
  line-height: 1.45;
}
.metric-group { display: flex; gap: 4px; justify-content: flex-end; }
td.scenario { width: 38%; }
footer {
  margin-top: 24px; color: var(--muted); font-size: 12px;
  text-align: center;
}
</style>
</head>
<body>
<h1>Contraste Motor Go vs Paper (Tabla 5)</h1>
<div class="subtitle">SimulaPUCV — Validación de paridad estadística contra <em>Mendoza Baeza (2023)</em></div>

<div class="legend">
  <div class="legend-item"><span class="swatch paper"></span> Valor del paper (referencia)</div>
  <div class="legend-item"><span class="swatch ok"></span> Dentro de tolerancia estrecha</div>
  <div class="legend-item"><span class="swatch warn"></span> Dentro de tolerancia amplia</div>
  <div class="legend-item"><span class="swatch fail"></span> Fuera de tolerancia</div>
</div>

<table>
<thead>
<tr>
  <th class="scenario">Escenario</th>
  <th>PPE (%)</th>
  <th>PSCE (sem)</th>
  <th>EE</th>
  <th>PEO (%)</th>
</tr>
</thead>
<tbody>
`)

	for _, r := range rows {
		fmt.Fprintf(&b, `<tr>
  <td class="scenario">
    <div class="scenario-name">%s</div>
    <div class="scenario-id">%s</div>
    <div class="scenario-desc">%s</div>
  </td>
`, htmlEscape(r.Label), htmlEscape(r.Scenario), htmlEscape(r.Descripcion))

		for _, key := range []string{"PPE", "PSCE", "EE", "PEO"} {
			m := r.Metrics[key]
			fmt.Fprintf(&b, `  <td>
    <div class="metric-group">
      <div class="cell paper" title="Paper">
        <span class="v">%s</span>
        <span class="d">paper</span>
      </div>
      <div class="cell %s" title="Δ vs paper">
        <span class="v">%s</span>
        <span class="d">%s</span>
      </div>
    </div>
  </td>
`,
				formatMetric(key, m.Paper),
				m.Severity,
				formatMetric(key, m.Motor),
				formatDelta(key, m.Delta),
			)
		}
		b.WriteString("</tr>\n")
	}

	b.WriteString(`</tbody>
</table>

<footer>
`)
	fmt.Fprintf(&b, "Tolerancias: PPE/PEO ±%.1f pp · PSCE ±%.2f sem · EE ±%.2f · Generado %s\n",
		tol.TolPP, tol.TolSem, tol.TolEE, generatedAt.Format("2006-01-02 15:04:05"))
	b.WriteString(`</footer>
</body>
</html>
`)
	return b.String()
}

func formatMetric(key string, v float64) string {
	switch key {
	case "EE":
		return fmt.Sprintf("%.2f", v)
	case "PSCE":
		return fmt.Sprintf("%.2f", v)
	default: // PPE, PEO
		return fmt.Sprintf("%.2f", v)
	}
}

func formatDelta(_ string, d float64) string {
	if d >= 0 {
		return fmt.Sprintf("Δ +%.2f", d)
	}
	return fmt.Sprintf("Δ %.2f", d)
}

func htmlEscape(s string) string {
	r := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		`"`, "&quot;",
		"'", "&#39;",
	)
	return r.Replace(s)
}

// sortReportRows ordena los escenarios en el mismo orden de criticalScenarios
// (caso_actual primero, PF último) para consistencia visual.
func sortReportRows(rows []reportRow) {
	order := make(map[string]int, len(criticalScenarios))
	for i, def := range criticalScenarios {
		order[def.ID] = i
	}
	sort.SliceStable(rows, func(i, j int) bool {
		return order[rows[i].Scenario] < order[rows[j].Scenario]
	})
}
