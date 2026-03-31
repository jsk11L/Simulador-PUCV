package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/jsk11L/Simulador-PUCV/engine"
	"github.com/jsk11L/Simulador-PUCV/middleware"
	"github.com/jsk11L/Simulador-PUCV/models"
)

// DB es la referencia a la base de datos. Se configura desde main.
var DB *gorm.DB

// ==========================================
// AUTENTICACIÓN
// ==========================================

func Register(c *gin.Context) {
	type RegisterInput struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	usuario := models.Usuario{Email: input.Email, PasswordHash: string(hashedPassword)}
	if err := DB.Create(&usuario).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El email ya está registrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Registro exitoso. Esperando aprobación."})
}

func Login(c *gin.Context) {
	type LoginInput struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}
	var usuario models.Usuario
	if err := DB.Where("email = ?", input.Email).First(&usuario).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales inválidas"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(usuario.PasswordHash), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales inválidas"})
		return
	}
	if !usuario.IsApproved {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cuenta no aprobada."})
		return
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"usuario_id": usuario.ID,
		"is_admin":   usuario.IsAdmin,
		"exp":        time.Now().Add(time.Hour * 72).Unix(),
	})
	tokenString, _ := token.SignedString(middleware.JWTSecret)
	c.JSON(http.StatusOK, gin.H{"token": tokenString, "is_admin": usuario.IsAdmin})
}

// ==========================================
// SIMULACIÓN
// ==========================================

func SimularHandler(c *gin.Context) {
	var req models.SimularRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido: " + err.Error()})
		return
	}

	resultados := engine.EjecutarMontecarlo(req)

	// Auto-guardar resultado en BD
	usuarioID, _ := c.Get("usuario_id")
	if uid, ok := usuarioID.(string); ok {
		metricasBytes, _ := json.Marshal(resultados.MetricasGlobales)
		distBytes, _ := json.Marshal(resultados.DistribucionSemestres)
		ramosBytes, _ := json.Marshal(resultados.RamosCriticos)
		varsBytes, _ := json.Marshal(req.Variables)
		modeloBytes, _ := json.Marshal(req.Modelo)

		mallaNombre := "Simulación sin nombre"
		if mn, exists := c.GetQuery("malla_nombre"); exists {
			mallaNombre = mn
		}

		maxSem := 0
		for _, a := range req.Asignaturas {
			if a.Semestre > maxSem {
				maxSem = a.Semestre
			}
		}

		resDB := models.ResultadoSimulacionDB{
			UsuarioID:         uid,
			MallaNombre:       mallaNombre,
			TotalAsignaturas:  len(req.Asignaturas),
			TotalSemestres:    maxSem,
			MetricasJSON:      string(metricasBytes),
			DistribucionJSON:  string(distBytes),
			RamosCriticosJSON: string(ramosBytes),
			VariablesJSON:     string(varsBytes),
			ModeloJSON:        string(modeloBytes),
		}
		DB.Create(&resDB)

		c.JSON(http.StatusOK, gin.H{
			"resultado_id":           resDB.ID,
			"mensaje":                resultados.Mensaje,
			"metricas_globales":      resultados.MetricasGlobales,
			"distribucion_semestres": resultados.DistribucionSemestres,
			"ramos_criticos":         resultados.RamosCriticos,
		})
		return
	}

	c.JSON(http.StatusOK, resultados)
}

// ==========================================
// CRUD MALLAS
// ==========================================

func CrearMallaHandler(c *gin.Context) {
	usuarioID, _ := c.Get("usuario_id")
	uid := usuarioID.(string)

	var body struct {
		Nombre         string                    `json:"nombre" binding:"required"`
		TotalSemestres int                       `json:"total_semestres"`
		Asignaturas    []models.AsignaturaPayload `json:"asignaturas" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos: " + err.Error()})
		return
	}

	asigBytes, _ := json.Marshal(body.Asignaturas)

	malla := models.MallaGuardadaDB{
		UsuarioID:      uid,
		Nombre:         body.Nombre,
		TotalSemestres: body.TotalSemestres,
		Asignaturas:    string(asigBytes),
	}
	if err := DB.Create(&malla).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar la malla"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":      malla.ID,
		"nombre":  malla.Nombre,
		"mensaje": "Malla guardada con éxito",
	})
}

func ListarMallasHandler(c *gin.Context) {
	usuarioID, _ := c.Get("usuario_id")
	uid := usuarioID.(string)

	var mallas []models.MallaGuardadaDB
	DB.Where("usuario_id = ?", uid).Order("updated_at DESC").Find(&mallas)

	type MallaResponse struct {
		ID             string                    `json:"id"`
		Nombre         string                    `json:"nombre"`
		TotalSemestres int                       `json:"total_semestres"`
		Asignaturas    []models.AsignaturaPayload `json:"asignaturas"`
		CreatedAt      time.Time                 `json:"created_at"`
		UpdatedAt      time.Time                 `json:"updated_at"`
	}

	var resp []MallaResponse
	for _, m := range mallas {
		var asigs []models.AsignaturaPayload
		json.Unmarshal([]byte(m.Asignaturas), &asigs)
		resp = append(resp, MallaResponse{
			ID:             m.ID,
			Nombre:         m.Nombre,
			TotalSemestres: m.TotalSemestres,
			Asignaturas:    asigs,
			CreatedAt:      m.CreatedAt,
			UpdatedAt:      m.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, resp)
}

func ObtenerMallaHandler(c *gin.Context) {
	usuarioID, _ := c.Get("usuario_id")
	uid := usuarioID.(string)
	mallaID := c.Param("id")

	var malla models.MallaGuardadaDB
	if err := DB.Where("id = ? AND usuario_id = ?", mallaID, uid).First(&malla).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Malla no encontrada"})
		return
	}

	var asigs []models.AsignaturaPayload
	json.Unmarshal([]byte(malla.Asignaturas), &asigs)

	c.JSON(http.StatusOK, gin.H{
		"id":              malla.ID,
		"nombre":          malla.Nombre,
		"total_semestres": malla.TotalSemestres,
		"asignaturas":     asigs,
		"created_at":      malla.CreatedAt,
		"updated_at":      malla.UpdatedAt,
	})
}

func ActualizarMallaHandler(c *gin.Context) {
	usuarioID, _ := c.Get("usuario_id")
	uid := usuarioID.(string)
	mallaID := c.Param("id")

	var malla models.MallaGuardadaDB
	if err := DB.Where("id = ? AND usuario_id = ?", mallaID, uid).First(&malla).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Malla no encontrada"})
		return
	}

	var body struct {
		Nombre         string                    `json:"nombre"`
		TotalSemestres int                       `json:"total_semestres"`
		Asignaturas    []models.AsignaturaPayload `json:"asignaturas"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	if body.Nombre != "" {
		malla.Nombre = body.Nombre
	}
	if body.TotalSemestres > 0 {
		malla.TotalSemestres = body.TotalSemestres
	}
	if body.Asignaturas != nil {
		asigBytes, _ := json.Marshal(body.Asignaturas)
		malla.Asignaturas = string(asigBytes)
	}

	DB.Save(&malla)
	c.JSON(http.StatusOK, gin.H{"mensaje": "Malla actualizada"})
}

func EliminarMallaHandler(c *gin.Context) {
	usuarioID, _ := c.Get("usuario_id")
	uid := usuarioID.(string)
	mallaID := c.Param("id")

	result := DB.Where("id = ? AND usuario_id = ?", mallaID, uid).Delete(&models.MallaGuardadaDB{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Malla no encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mensaje": "Malla eliminada"})
}

// ==========================================
// CRUD RESULTADOS
// ==========================================

func ListarResultadosHandler(c *gin.Context) {
	usuarioID, _ := c.Get("usuario_id")
	uid := usuarioID.(string)

	var resultados []models.ResultadoSimulacionDB
	DB.Where("usuario_id = ?", uid).Order("created_at DESC").Find(&resultados)

	type ResultadoListItem struct {
		ID               string                `json:"id"`
		MallaNombre      string                `json:"malla_nombre"`
		TotalAsignaturas int                   `json:"total_asignaturas"`
		TotalSemestres   int                   `json:"total_semestres"`
		Metricas         models.MetricasGlobales `json:"metricas_globales"`
		CreatedAt        time.Time             `json:"created_at"`
	}

	var resp []ResultadoListItem
	for _, r := range resultados {
		var metricas models.MetricasGlobales
		json.Unmarshal([]byte(r.MetricasJSON), &metricas)
		resp = append(resp, ResultadoListItem{
			ID:               r.ID,
			MallaNombre:      r.MallaNombre,
			TotalAsignaturas: r.TotalAsignaturas,
			TotalSemestres:   r.TotalSemestres,
			Metricas:         metricas,
			CreatedAt:        r.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, resp)
}

func ObtenerResultadoHandler(c *gin.Context) {
	usuarioID, _ := c.Get("usuario_id")
	uid := usuarioID.(string)
	resID := c.Param("id")

	var res models.ResultadoSimulacionDB
	if err := DB.Where("id = ? AND usuario_id = ?", resID, uid).First(&res).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resultado no encontrado"})
		return
	}

	var metricas models.MetricasGlobales
	var distribucion map[int]int
	var ramosCriticos []models.RamoCritico
	var variables models.VariablesPayload
	var modelo models.ModeloPayload

	json.Unmarshal([]byte(res.MetricasJSON), &metricas)
	json.Unmarshal([]byte(res.DistribucionJSON), &distribucion)
	json.Unmarshal([]byte(res.RamosCriticosJSON), &ramosCriticos)
	json.Unmarshal([]byte(res.VariablesJSON), &variables)
	json.Unmarshal([]byte(res.ModeloJSON), &modelo)

	c.JSON(http.StatusOK, gin.H{
		"id":                     res.ID,
		"malla_nombre":           res.MallaNombre,
		"total_asignaturas":      res.TotalAsignaturas,
		"total_semestres":        res.TotalSemestres,
		"metricas_globales":      metricas,
		"distribucion_semestres": distribucion,
		"ramos_criticos":         ramosCriticos,
		"variables":              variables,
		"modelo":                 modelo,
		"created_at":             res.CreatedAt,
	})
}

// ==========================================
// EXPORTACIÓN DE DATOS
// ==========================================

func ExportarDatosHandler(c *gin.Context) {
	usuarioID, _ := c.Get("usuario_id")
	uid := usuarioID.(string)

	// Obtener mallas
	var mallasDB []models.MallaGuardadaDB
	DB.Where("usuario_id = ?", uid).Order("updated_at DESC").Find(&mallasDB)

	type MallaExp struct {
		ID             string                    `json:"id"`
		Nombre         string                    `json:"nombre"`
		TotalSemestres int                       `json:"total_semestres"`
		Asignaturas    []models.AsignaturaPayload `json:"asignaturas"`
		CreatedAt      time.Time                 `json:"created_at"`
	}

	var mallas []MallaExp
	for _, m := range mallasDB {
		var asigs []models.AsignaturaPayload
		json.Unmarshal([]byte(m.Asignaturas), &asigs)
		mallas = append(mallas, MallaExp{
			ID: m.ID, Nombre: m.Nombre, TotalSemestres: m.TotalSemestres,
			Asignaturas: asigs, CreatedAt: m.CreatedAt,
		})
	}

	// Obtener resultados con toda la data deserializada
	var resultadosDB []models.ResultadoSimulacionDB
	DB.Where("usuario_id = ?", uid).Order("created_at DESC").Find(&resultadosDB)

	type ResultadoExp struct {
		ID               string                `json:"id"`
		MallaNombre      string                `json:"malla_nombre"`
		TotalAsignaturas int                   `json:"total_asignaturas"`
		TotalSemestres   int                   `json:"total_semestres"`
		Metricas         models.MetricasGlobales `json:"metricas_globales"`
		Distribucion     map[int]int           `json:"distribucion_semestres"`
		RamosCriticos    []models.RamoCritico   `json:"ramos_criticos"`
		Variables        models.VariablesPayload `json:"variables"`
		Modelo           models.ModeloPayload   `json:"modelo"`
		CreatedAt        time.Time             `json:"created_at"`
	}

	var resultados []ResultadoExp
	for _, r := range resultadosDB {
		var metricas models.MetricasGlobales
		var dist map[int]int
		var ramos []models.RamoCritico
		var vars models.VariablesPayload
		var mod models.ModeloPayload

		json.Unmarshal([]byte(r.MetricasJSON), &metricas)
		json.Unmarshal([]byte(r.DistribucionJSON), &dist)
		json.Unmarshal([]byte(r.RamosCriticosJSON), &ramos)
		json.Unmarshal([]byte(r.VariablesJSON), &vars)
		json.Unmarshal([]byte(r.ModeloJSON), &mod)

		resultados = append(resultados, ResultadoExp{
			ID: r.ID, MallaNombre: r.MallaNombre,
			TotalAsignaturas: r.TotalAsignaturas, TotalSemestres: r.TotalSemestres,
			Metricas: metricas, Distribucion: dist, RamosCriticos: ramos,
			Variables: vars, Modelo: mod, CreatedAt: r.CreatedAt,
		})
	}

	exportData := gin.H{
		"exportado_en": time.Now().Format(time.RFC3339),
		"plataforma":   "SimulaPUCV",
		"total_mallas":     len(mallas),
		"total_resultados": len(resultados),
		"mallas":           mallas,
		"resultados":       resultados,
	}

	c.Header("Content-Disposition", "attachment; filename=simulapucv_backup.json")
	c.Header("Content-Type", "application/json")
	c.JSON(http.StatusOK, exportData)
}

// ==========================================
// PANEL DE ADMINISTRACIÓN
// ==========================================

// checkIsAdmin verifica que el usuario autenticado sea admin
func checkIsAdmin(c *gin.Context) bool {
	usuarioID, _ := c.Get("usuario_id")
	uid := usuarioID.(string)

	var usuario models.Usuario
	if err := DB.Where("id = ?", uid).First(&usuario).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return false
	}
	if !usuario.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acceso denegado. Se requieren permisos de administrador."})
		return false
	}
	return true
}

func ListarUsuariosAdmin(c *gin.Context) {
	if !checkIsAdmin(c) {
		return
	}

	var usuarios []models.Usuario
	DB.Order("created_at DESC").Find(&usuarios)

	type UsuarioResponse struct {
		ID         string    `json:"id"`
		Email      string    `json:"email"`
		IsApproved bool      `json:"is_approved"`
		IsAdmin    bool      `json:"is_admin"`
		CreatedAt  time.Time `json:"created_at"`
	}

	var resp []UsuarioResponse
	for _, u := range usuarios {
		resp = append(resp, UsuarioResponse{
			ID:         u.ID,
			Email:      u.Email,
			IsApproved: u.IsApproved,
			IsAdmin:    u.IsAdmin,
			CreatedAt:  u.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, resp)
}

func AprobarUsuarioAdmin(c *gin.Context) {
	if !checkIsAdmin(c) {
		return
	}

	userID := c.Param("id")

	var body struct {
		IsApproved bool `json:"is_approved"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	result := DB.Model(&models.Usuario{}).Where("id = ?", userID).Update("is_approved", body.IsApproved)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuario no encontrado"})
		return
	}

	estado := "aprobado"
	if !body.IsApproved {
		estado = "revocado"
	}
	c.JSON(http.StatusOK, gin.H{"mensaje": "Usuario " + estado + " exitosamente"})
}
