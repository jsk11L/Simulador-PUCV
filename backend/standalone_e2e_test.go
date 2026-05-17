package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/jsk11L/Simulador-PUCV/handlers"
	"github.com/jsk11L/Simulador-PUCV/models"

	_ "modernc.org/sqlite"
)

// ============================================================
// Tests E2E del modo standalone (SQLite).
//
// Verifican que el binario portable (DB_TYPE=sqlite) ejecuta el mismo
// motor con los mismos resultados que el modo servidor (DB_TYPE=postgres).
// Para esto:
//
//   1. Levantan un router httptest con SQLite in-memory.
//   2. Registran un usuario (que debe auto-aprobarse como admin en
//      standalone mode) y obtienen su token.
//   3. Llaman /api/simular y /api/generar-alumno con escenarios canónicos.
//   4. Verifican que la respuesta cae dentro del rango esperado (los
//      mismos rangos que los tests del paquete engine usan contra el
//      paper Mendoza Baeza 2023).
//
// Si estos tests pasan en SQLite, la "versión portable" produce los
// mismos resultados que la versión servidor — el motor no depende de la
// DB, solo del payload de entrada.
// ============================================================

const testJWTSecret = "standalone-test-secret-32-bytes-long-padding!"

// setupStandalone arma un server gin con SQLite in-memory y API en modo
// standalone (LocalUserID pre-creado, sin login). Devuelve el server +
// un token vacío (en standalone el middleware ignora el token y opera
// con LocalUserID).
func setupStandalone(t *testing.T) (*httptest.Server, string) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	// SQLite in-memory — un :memory: por test, sin tocar disco.
	db, err := gorm.Open(sqlite.Dialector{
		DriverName: "sqlite",
		DSN:        ":memory:?_pragma=foreign_keys(1)",
	}, &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite in-memory: %v", err)
	}

	if err := db.AutoMigrate(
		&models.Usuario{}, &models.MallaGuardadaDB{}, &models.ResultadoSimulacionDB{},
	); err != nil {
		t.Fatalf("automigrate: %v", err)
	}

	// Pre-crear usuario local (mismo path que main.go en standalone).
	localUser := models.Usuario{
		Email:        "local@simulapucv",
		PasswordHash: "standalone-no-password",
		IsApproved:   true,
		IsAdmin:      true,
	}
	if err := db.Create(&localUser).Error; err != nil {
		t.Fatalf("crear usuario local: %v", err)
	}

	api := handlers.NewAPI(db, []byte(testJWTSecret))
	api.Standalone = true
	api.LocalUserID = localUser.ID

	r := gin.New()
	api.Mount(r)
	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	// En standalone no hay login: el middleware ignora Authorization y
	// usa LocalUserID. El "token" devuelto es opcional, lo dejamos vacío
	// para reflejar el flujo real.
	return srv, ""
}

// TestStandaloneE2E_InfoEndpoint verifica que /api/info expone el modo
// standalone (lo usa el frontend para saltear AuthView).
func TestStandaloneE2E_InfoEndpoint(t *testing.T) {
	srv, _ := setupStandalone(t)

	resp, err := http.Get(srv.URL + "/api/info")
	if err != nil {
		t.Fatalf("GET /api/info: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	var info struct {
		Standalone bool `json:"standalone"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !info.Standalone {
		t.Error("/api/info en modo standalone debería retornar standalone:true")
	}
}

// postAuth hace POST autenticado al endpoint dado y devuelve el body.
func postAuth(t *testing.T, srv *httptest.Server, token, path string, body any) []byte {
	t.Helper()
	raw, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", srv.URL+path, bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("POST %s: %v", path, err)
	}
	defer resp.Body.Close()
	out := new(bytes.Buffer)
	out.ReadFrom(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		t.Fatalf("POST %s → %d: %s", path, resp.StatusCode, out.String())
	}
	return out.Bytes()
}

// scenarioPayload carga el JSON canónico de un escenario (mismos archivos
// que usa el paquete engine para sus tests contra el paper) y lo arma como
// SimularRequest con las variables default del paper.
func scenarioPayload(t *testing.T, scenarioID string, ne int) models.SimularRequest {
	t.Helper()
	path := filepath.Join("engine", "testdata", "scenarios", scenarioID+".json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read scenario %s: %v", scenarioID, err)
	}
	var sc struct {
		Asignaturas  []models.AsignaturaPayload  `json:"asignaturas"`
		Programacion *models.ProgramacionPayload `json:"programacion,omitempty"`
	}
	if err := json.Unmarshal(raw, &sc); err != nil {
		t.Fatalf("parse scenario %s: %v", scenarioID, err)
	}
	return models.SimularRequest{
		Asignaturas:  sc.Asignaturas,
		Programacion: sc.Programacion,
		Variables: models.VariablesPayload{
			NE:       ne,
			NCSmax:   21,
			TAmin:    12.3,
			NapTAmin: 10,
			Opor:     6,
			Seed:     20260516,
		},
		// Mismos defaults del paper que usan los tests de engine/.
		Modelo: models.ModeloPayload{
			VMap1234: 0.48, Delta1234: 0.2,
			VMap5678: 0.55, Delta5678: 0.2,
			VMapM: 0.65, DeltaM: 0.25,
		},
	}
}

// TestStandaloneE2E_MotorAgregadoEnSQLite valida que el motor de
// simulación agregada produce KPIs en el rango esperado del paper cuando
// el backend está corriendo en modo standalone con SQLite. Tolerancia
// generosa (rango amplio) — la paridad fina contra el paper la cubren
// los tests de engine/. Acá lo que se verifica es que el flujo HTTP
// auth → simular → response no se vea afectado por el cambio de driver.
func TestStandaloneE2E_MotorAgregadoEnSQLite(t *testing.T) {
	srv, token := setupStandalone(t)

	// NE de 1000 — compromiso entre rapidez y varianza aceptable.
	payload := scenarioPayload(t, "caso_actual", 1000)
	raw := postAuth(t, srv, token, "/api/simular", payload)

	var resp models.SimulacionResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		t.Fatalf("decode simular: %v", err)
	}

	m := resp.MetricasGlobales
	// Sanity: el motor corrió, hay KPIs no triviales.
	if m.AlumnosSimulados < 100 {
		t.Errorf("AlumnosSimulados=%v < 100 esperado", m.AlumnosSimulados)
	}
	// Caso actual del paper: PPE ~37%, PSCE ~16. Con NE=500 admite mucha
	// varianza — chequeamos sólo que no se haya degenerado.
	if m.TasaTitulacionPct < 20 || m.TasaTitulacionPct > 60 {
		t.Errorf("PPE=%.2f fuera de rango [20,60] (paper: ~37%%)", m.TasaTitulacionPct)
	}
	if m.SemestresPromedio < 12 || m.SemestresPromedio > 20 {
		t.Errorf("PSCE=%.2f fuera de rango [12,20] (paper: ~16)", m.SemestresPromedio)
	}
	if len(resp.RamosCriticos) == 0 {
		t.Error("RamosCriticos vacío — debería tener al menos 1 entrada")
	}
	if len(resp.HeatmapEstadoSemestre) == 0 {
		t.Error("HeatmapEstadoSemestre vacío")
	}
}

// TestStandaloneE2E_GenerarAlumnoEnSQLite valida que el generador
// sintético funciona en standalone (motor individual). Si esto pasa, el
// motor δ está operativo en la versión portable.
func TestStandaloneE2E_GenerarAlumnoEnSQLite(t *testing.T) {
	srv, token := setupStandalone(t)

	payload := map[string]any{
		"profile":  "promedio",
		"scenario": "caso_actual",
		"seed":     20260516,
		"count":    1,
	}
	raw := postAuth(t, srv, token, "/api/generar-alumno", payload)

	// La respuesta es un StudentHistory para count=1.
	var hist struct {
		Rut        string `json:"rut"`
		Semestres  []any  `json:"semestres"`
		Estado     string `json:"estado"`
	}
	if err := json.Unmarshal(raw, &hist); err != nil {
		t.Fatalf("decode generar-alumno: %v\nraw: %s", err, string(raw))
	}
	if len(hist.Semestres) == 0 {
		t.Errorf("alumno sin semestres — generador no produjo trayectoria")
	}
	if hist.Estado == "" {
		t.Error("alumno sin estado final")
	}
}

// TestStandaloneE2E_PersistenciaMallaEnSQLite valida que la persistencia
// de mallas funciona en SQLite: que el hook BeforeCreate genere UUID y
// que el campo Asignaturas (antes jsonb, ahora text) se serialice ok.
func TestStandaloneE2E_PersistenciaMallaEnSQLite(t *testing.T) {
	srv, token := setupStandalone(t)

	// Crear malla mínima.
	malla := map[string]any{
		"nombre":          "test malla",
		"total_semestres": 2,
		"asignaturas": []map[string]any{
			{
				"id": "MAT-101", "cred": 6, "rep": 0.5,
				"reqs": []string{}, "semestre": 1, "dictacion": "semestral",
			},
		},
	}
	raw := postAuth(t, srv, token, "/api/mallas", malla)

	var created struct {
		ID     string `json:"id"`
		Nombre string `json:"nombre"`
	}
	if err := json.Unmarshal(raw, &created); err != nil {
		t.Fatalf("decode crear malla: %v\nraw: %s", err, string(raw))
	}
	if created.ID == "" {
		t.Error("malla creada sin ID — hook BeforeCreate de UUID no se ejecutó")
	}
	if len(created.ID) < 30 {
		t.Errorf("ID %q no parece UUID", created.ID)
	}
}
