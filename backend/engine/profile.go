package engine

// ==========================================
// PERFILES DE ALUMNO SINTÉTICO
// ==========================================
// El perfil representa el "esfuerzo personal" del alumno — factor que el
// motor de simulación NO puede observar pero que sí afecta su trayectoria.
// Es la señal latente que el algoritmo de modificadores (Sprint 3) debe
// inferir a partir del historial generado.
//
// Tres dimensiones independientes:
//   - Esfuerzo:   capacidad académica + dedicación. Afecta P(aprobar).
//   - Disciplina: regularidad/consistencia. Afecta varianza de notas.
//   - Tolerancia: cuánta carga académica soporta sin saturarse.
//
// Cada dimensión va en [0, 1]. 0.5 representa "promedio".

// StudentProfile encapsula el perfil oculto de un alumno generado.
type StudentProfile struct {
	Nombre     string  `json:"nombre"`     // identificador legible
	Esfuerzo   float64 `json:"esfuerzo"`   // [0,1]
	Disciplina float64 `json:"disciplina"` // [0,1]
	Tolerancia float64 `json:"tolerancia"` // [0,1]
}

// Presets nombrados. Estos son los "perfiles canónicos" para experimentación
// rápida. Los nombres se almacenan en el campo Nombre para que el reporte
// pueda agrupar y comparar trayectorias por categoría.
var (
	ProfileEsforzadoTop = StudentProfile{
		Nombre:     "esforzado_top",
		Esfuerzo:   0.95,
		Disciplina: 0.90,
		Tolerancia: 0.85,
	}
	ProfilePromedioAlto = StudentProfile{
		Nombre:     "promedio_alto",
		Esfuerzo:   0.70,
		Disciplina: 0.75,
		Tolerancia: 0.70,
	}
	ProfilePromedio = StudentProfile{
		Nombre:     "promedio",
		Esfuerzo:   0.55,
		Disciplina: 0.60,
		Tolerancia: 0.55,
	}
	ProfilePromedioBajo = StudentProfile{
		Nombre:     "promedio_bajo",
		Esfuerzo:   0.40,
		Disciplina: 0.45,
		Tolerancia: 0.40,
	}
	ProfileEnProblemas = StudentProfile{
		Nombre:     "en_problemas",
		Esfuerzo:   0.25,
		Disciplina: 0.30,
		Tolerancia: 0.25,
	}
)

// ProfilePresets devuelve todos los perfiles canónicos en orden de
// mayor a menor esfuerzo. Útil para iterar en tests o reportes.
func ProfilePresets() []StudentProfile {
	return []StudentProfile{
		ProfileEsforzadoTop,
		ProfilePromedioAlto,
		ProfilePromedio,
		ProfilePromedioBajo,
		ProfileEnProblemas,
	}
}

// ProfileByName busca un preset por su nombre. Devuelve (perfil, true)
// si existe, (zero, false) si no.
func ProfileByName(nombre string) (StudentProfile, bool) {
	for _, p := range ProfilePresets() {
		if p.Nombre == nombre {
			return p, true
		}
	}
	return StudentProfile{}, false
}

// deltaPesfuerzo devuelve el ajuste aditivo a la probabilidad de éxito
// del motor base según el esfuerzo del alumno.
//
// Esfuerzo > 0.5 → bonus positivo (alumno tiende a aprobar más)
// Esfuerzo < 0.5 → penalización (alumno tiende a reprobar más)
//
// El factor K se mantiene moderado (0.15) para que el "perfil" sea una
// señal detectable pero no domine las probabilidades base de cada ramo.
// Si fuera muy grande, la malla perdería relevancia.
func (p StudentProfile) deltaPesfuerzo() float64 {
	const K = 0.15
	return K * (p.Esfuerzo - 0.5)
}

// cargaPreferida devuelve la cantidad de créditos que el alumno tiende a
// inscribir cada semestre (intento). Tolerancia alta → inscribe más cerca
// del tope; tolerancia baja → inscribe carga modesta.
//
// Rango: [12, 21] créditos. Por debajo de 12 el alumno tendería a
// eliminarse por TAmin; por encima de 21 viola NCSmax típico.
func (p StudentProfile) cargaPreferida() int {
	const (
		minCarga = 12
		maxCarga = 21
	)
	v := minCarga + (maxCarga-minCarga)*p.Tolerancia
	return int(v + 0.5)
}

// notaParamAprobado devuelve (μ, σ) de la distribución normal para la
// nota cuando el alumno aprueba el ramo.
//
//	μ = 4.5 + 1.5·esfuerzo    (rango: 4.5 a 6.0)
//	σ = 0.7
//
// Un alumno con esfuerzo 0 que aprueba saca en promedio 4.5 (justo);
// uno con esfuerzo 1.0 saca 6.0 (sobresaliente).
func (p StudentProfile) notaParamAprobado() (mu, sigma float64) {
	return 4.5 + 1.5*p.Esfuerzo, 0.7
}

// notaParamReprobado devuelve (μ, σ) cuando el alumno reprueba.
// La nota va de 2.5 a 3.5 dependiendo del esfuerzo: incluso reprobando,
// un esforzado saca algo menos pésimo que alguien sin esfuerzo.
//
//	μ = 2.5 + 1.0·esfuerzo    (rango: 2.5 a 3.5)
//	σ = 0.6
func (p StudentProfile) notaParamReprobado() (mu, sigma float64) {
	return 2.5 + 1.0*p.Esfuerzo, 0.6
}
