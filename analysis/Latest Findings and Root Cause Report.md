# Latest Findings and Root Cause Report

## 1. Resumen ejecutivo
En esta etapa se identifico y corrigio la causa principal de la divergencia entre Go y MATLAB para el escenario Caso Actual. El problema no era solo de parametros, sino de orden de flujo semestral en el motor Go y de una validacion hecha contra un runner distinto al motor real.

Despues de la correccion, el motor Go quedo muy cercano a MATLAB en las metricas principales para 1000 iteraciones.

## 2. Sintoma observado
Antes de la correccion del flujo del motor, los resultados comparados mostraban una brecha grande entre Go y MATLAB (especialmente en titulacion y egreso oportuno), y parecia que los cambios no tenian efecto.

## 3. Causa raiz
### 3.1 Diferencia de flujo entre Go y MATLAB
El orden de operaciones semestrales en Go no seguia exactamente la secuencia del algoritmo MATLAB original.

Puntos clave de desalineacion previos:
- Orden de evaluacion del semestre y del semestre siguiente.
- Momento de aplicacion de TAmin.
- Orden de programacion, limpieza de aprobadas e inscripcion.
- Manejo de primer semestre en un flujo unico no equivalente al original.

### 3.2 Error de validacion (comparando contra implementacion equivocada)
Parte del analisis se ejecuto via [analysis/run_case1_full_trace.py](analysis/run_case1_full_trace.py), que invoca [backend/cmd/trace_case1/main.go](../backend/cmd/trace_case1/main.go).

Ese runner no usa el flujo de [backend/engine/montecarlo.go](../backend/engine/montecarlo.go) para calcular metricas finales del backend. Resultado: se modificaba el motor real pero la validacion principal no reflejaba esos cambios.

### 3.3 Error operativo adicional de tarea/script
La tarea antigua intentaba ejecutar un script inexistente: `original/compare_critical_sets.py`.

## 4. Solucion aplicada
Se reescribio el nucleo de simulacion en [backend/engine/montecarlo.go](../backend/engine/montecarlo.go) para replicar el orden MATLAB:

1. Primer semestre tratado como bloque inicial (equivalente al original).
2. Evaluacion de asignaturas inscritas del semestre en curso.
3. Chequeo de TAmin en el momento equivalente del ciclo.
4. Avance de semestre.
5. Carga de programacion par/impar.
6. Limpieza de oferta por asignaturas ya aprobadas.
7. Inscripcion por prerrequisitos y tope de creditos.
8. Evaluacion de cortes por oportunidades y estado final del semestre.

Ademas:
- Se mantuvo normalizacion de IDs y prerequisitos.
- Se evito usar `trace_case1` para validar el impacto del engine.
- Se paso a validar con [backend/cmd/critical_compare/main.go](../backend/cmd/critical_compare/main.go), que si utiliza [backend/engine/montecarlo.go](../backend/engine/montecarlo.go).

## 5. Validacion posterior a la correccion
Corrida comparada con 1000 iteraciones, seed 20260416, escenario Caso Actual.

### Go (engine corregido)
- PPE: 41.15
- PSCE: 10.60
- EE: 0.88
- PEO: 4.15

### MATLAB
- PPE: 40.90
- PSCE: 10.4595
- EE: 0.871625
- PEO: 3.85

### Lectura
- Las metricas Go quedaron muy cercanas a MATLAB.
- La discrepancia grande anterior se explicaba por la combinacion de flujo desalineado + validacion hecha contra un runner alternativo.

## 6. Impacto en el proyecto
- Se recupero paridad funcional alta entre Go y MATLAB en Caso Actual.
- Se establecio una ruta de validacion correcta para cambios del engine.
- Se redujo el riesgo de conclusiones falsas por usar binarios/entrypoints distintos.

## 7. Recomendaciones
1. Usar [backend/cmd/critical_compare/main.go](../backend/cmd/critical_compare/main.go) como validacion oficial de paridad del motor.
2. Mantener [analysis/run_case1_full_trace.py](analysis/run_case1_full_trace.py) y [backend/cmd/trace_case1/main.go](../backend/cmd/trace_case1/main.go) para trazabilidad, pero no como fuente unica de metricas del backend.
3. Reemplazar o retirar cualquier referencia a `original/compare_critical_sets.py` y usar [analysis/run_interleaved_critical_comparison.py](analysis/run_interleaved_critical_comparison.py) como script vigente.
4. Repetir la comparacion completa en los 7 escenarios para confirmar estabilidad de la convergencia.
