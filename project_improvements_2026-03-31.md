# SimulaPUCV - Informe de Mejoras (2026-03-31)

## 1) Objetivo general del proyecto

SimulaPUCV busca replicar y evolucionar el modelo de simulacion curricular original (MATLAB) para evaluar trayectorias academicas, riesgo de eliminacion, titulación y eficiencia de egreso, entregando resultados accionables para estudiantes y toma de decisiones academicas.

## 2) Comparacion tecnica: MATLAB original vs Montecarlo Go actual

### Coincidencias
- Modelo de aprobacion estocastica por tramo con formula base `abs(VMap + Delta * randn)`.
- Uso de prerrequisitos y tope de creditos por semestre.
- Reglas de eliminacion por TAmin y oportunidades (Opor).
- Metricas principales del paper: titulacion, semestres promedio, eficiencia, retencion.

### Diferencias relevantes
- MATLAB usa matriz de programacion de docencia por paridad (`PROGRAMACION` / `ProgD`) para decidir oferta real de cursos por semestre.
- Go usa `dictacion` y no consume una matriz de oferta semestral equivalente.
- Riesgo de desviacion metodologica: un ramo marcado como semestral en Go puede no comportarse igual que en la matriz de programacion original.

### Recomendacion de alineacion
- Agregar al payload un campo `programacion` por ramo (por ejemplo `oferta: [impar, par]`), o una matriz de oferta semestral global.
- Ejecutar bateria de regresion comparativa con mallas identicas (MATLAB vs Go) y medir desvio por metrica principal.

## 3) Factibilidad: recuperacion de cuenta por email

### Viabilidad
Alta. Arquitectura actual backend/frontend permite incorporar flujo forgot/reset sin cambios estructurales mayores.

### Opcion recomendada
- Proveedor transaccional: Resend con SDK Go (`/resend/resend-go`).
- Ventajas: implementacion rapida, observabilidad, API clara para envios HTML y control de idempotencia.

### Diseño sugerido minimo
- Nuevas rutas:
  - `POST /api/forgot-password` (siempre responde 200 generico)
  - `POST /api/reset-password` (token + nueva password)
- Nueva tabla de tokens (`password_reset_tokens`):
  - `id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`
- Seguridad:
  - Token aleatorio de un solo uso
  - TTL corto (15-30 min)
  - Hash en BD (no guardar token plano)
  - Rate limit por IP/email
  - Mensajes anti-enumeracion

### Estimacion
- MVP tecnico: 1 a 2 dias.
- Con hardening (rate limit, logs y tests): 3 a 4 dias.

## 4) Factibilidad: incluir imagenes de graficos en el ZIP

### Viabilidad
Alta. Actualmente ya existe exportacion ZIP en frontend con JSZip.

### Opcion recomendada
- Captura de nodos DOM a PNG con `html-to-image` (`/bubkoo/html-to-image`).
- Flujo:
  1. Asignar `ref` a contenedores de graficos
  2. Convertir a `Blob` (`toBlob`)
  3. Incluir blobs en JSZip (`zip.file('graficos/distribucion.png', blob)`)

### Consideraciones
- Forzar fondo blanco para evitar transparencias no deseadas.
- Definir `pixelRatio` para buena calidad de reporte.
- Capturar fuentes si se requieren consistencia visual (`getFontEmbedCSS`).

### Estimacion
- MVP para 2 graficos: 0.5 a 1 dia.
- Con robustez completa (errores, fallback, opciones): 1.5 dias.

## 5) Nuevas metricas recomendadas

### Metricas de progresion
- Tiempo esperado a primer cuello de botella (semestre de mayor riesgo).
- Probabilidad de atraso > 2 semestres y > 4 semestres.
- Creditos aprobados acumulados por semestre (percentiles P10/P50/P90).

### Metricas de riesgo
- Riesgo condicional de eliminacion al finalizar cada semestre.
- Aporte marginal de cada ramo a eliminacion por TAmin.
- Impacto de relajar/estresar NCSmax, Opor y TAmin (analisis sensibilidad).

### Metricas de curriculum
- Indice de criticidad estructural por ramo (fallo * centralidad de prerrequisitos).
- Densidad de prerrequisitos por semestre.
- Carga academica efectiva promedio vs carga teorica.

## 6) Nuevas funcionalidades sugeridas

- Escenarios comparativos A/B (baseline vs propuesta curricular).
- Simulacion por cohortes (perfil de ingreso alto/medio/bajo).
- Parametros con presets institucionales versionados.
- Exportacion PDF ejecutiva (1 pagina) para comites curriculares.
- Modo "plan de mitigacion" con simulacion de intervenciones (tutorias, ajuste de prerreqs, cambios de oferta).

## 7) Nuevos graficos recomendados (prioridad alta)

1. Curva de supervivencia academica por semestre
- Eje X: semestre, Eje Y: % estudiantes aun activos.

2. CDF de titulacion
- Probabilidad acumulada de titularse hasta semestre N.

3. Heatmap semestre x estado
- Titulado / activo / eliminado TA / eliminado Opor.

4. Sankey de transiciones de estado
- Flujo entre estados por semestre.

5. Tornado de sensibilidad
- Impacto de cada variable (NE, NCSmax, TAmin, Opor, parametros de modelo) sobre tasa de titulacion.

6. Burndown de creditos
- Curva de creditos pendientes promedio por semestre.

### Estado de implementacion UI (2026-03-31, tarde)
- ✅ Implementado en Resultados: Supervivencia academica (proxy con datos agregados actuales).
- ✅ Implementado en Resultados: CDF de titulacion acumulada por semestre.
- ✅ Implementado backend+frontend: Heatmap estado-semestre (conteos por estado y semestre).
- ✅ Implementado backend+frontend: Sankey compacto de transiciones (from->to por semestre).
- ✅ Implementado backend+frontend: Tornado de sensibilidad con perturbacion ±10% en variables clave.
- ✅ Heatmap rediseñado a estilo tablero Kanban (columnas por semestre con tarjetas por estado).

## 8) Siguiente roadmap sugerido

1. Cerrar alineacion MATLAB-Go en oferta semestral (prioridad metodologica).
2. Agregar export de imagenes de graficos al ZIP.
3. Incorporar 2 graficos nuevos de alto valor (Supervivencia + CDF).
4. Implementar forgot/reset con proveedor de email y token seguro.
5. Construir baseline de tests de regresion para metricas clave.
