# Simulation Iteration Flow Report

## Objetivo
Describir una iteracion completa de simulacion, paso por paso, en Go y en MATLAB, con trazabilidad directa a codigo fuente y lineas exactas.

## Alcance
- Motor Go: [backend/engine/montecarlo.go](../backend/engine/montecarlo.go)
- Runner de traza MATLAB: [analysis/run_matlab_case1_full_trace.m](run_matlab_case1_full_trace.m)
- Implementacion original MATLAB (referencia canonica): [original/MallasV12.m](../original/MallasV12.m)

## Configuracion base de la iteracion
- Carga de programacion por semestre par/impar en Go: [backend/engine/montecarlo.go#L199](../backend/engine/montecarlo.go#L199)
- Regla de oferta por paridad (incluye guardas para semestre invalido) en Go: [backend/engine/montecarlo.go#L225](../backend/engine/montecarlo.go#L225)
- Inicio de simulacion en Go: [backend/engine/montecarlo.go#L379](../backend/engine/montecarlo.go#L379)
- Seed RNG en MATLAB runner: [analysis/run_matlab_case1_full_trace.m#L22](run_matlab_case1_full_trace.m#L22)
- Lectura de malla y programacion en MATLAB runner: [analysis/run_matlab_case1_full_trace.m#L28](run_matlab_case1_full_trace.m#L28), [analysis/run_matlab_case1_full_trace.m#L29](run_matlab_case1_full_trace.m#L29)
- Parametros estructurales en MATLAB runner (NE, NCSmax, TAmin, NapTAmin, Opor): [analysis/run_matlab_case1_full_trace.m#L52](run_matlab_case1_full_trace.m#L52)

## Flujo paso a paso: una iteracion en Go
### Paso 1: Preparar estructura de malla y orden de oferta
Se crea un mapa O(1) por asignatura y un arreglo ordenado por semestre para garantizar recorrido determinista cuando no hay programacion explicita.
- Mapa de asignaturas: [backend/engine/montecarlo.go#L381](../backend/engine/montecarlo.go#L381)
- Ordenamiento determinista por semestre/id: [backend/engine/montecarlo.go#L400](../backend/engine/montecarlo.go#L400)

### Paso 2: Lanzar ciclo por estudiante
Cada iteracion procesa NE estudiantes en paralelo y crea estado local por alumno.
- Loop de estudiantes: [backend/engine/montecarlo.go#L430](../backend/engine/montecarlo.go#L430)
- Inicializacion de semestre y estado: [backend/engine/montecarlo.go#L439](../backend/engine/montecarlo.go#L439)

### Paso 3: Inicio de semestre
Para cada semestre activo, el motor limpia estado temporal (creditos inscritos, lista de ramos tomados, deduplicacion).
- Apertura del ciclo semestral: [backend/engine/montecarlo.go#L451](../backend/engine/montecarlo.go#L451)

### Paso 4: Evaluar elegibilidad de cada ramo (tryEnroll)
El callback de inscripcion aplica, en este orden:
- Evitar duplicados en el mismo semestre.
- No reinscribir ramos ya aprobados.
- Validar prerrequisitos contra historial aprobado.
- Respetar limite NCSmax por creditos.
- Definicion de tryEnroll: [backend/engine/montecarlo.go#L462](../backend/engine/montecarlo.go#L462)

### Paso 5: Construir oferta del semestre
Se prioriza programacion oficial (impar/par). Si no existe, se usa fallback ordenado con filtro de paridad.
- Obtencion de programacion del semestre: [backend/engine/montecarlo.go#L493](../backend/engine/montecarlo.go#L493)
- Filtro por paridad en fallback: [backend/engine/montecarlo.go#L508](../backend/engine/montecarlo.go#L508)

### Paso 6: Caso sin ramos tomados
Si no hay inscripciones, se distingue entre:
- Titulacion por malla completa aprobada.
- Continuidad (si aun faltan ramos).
- Rama de titulacion inmediata: [backend/engine/montecarlo.go#L515](../backend/engine/montecarlo.go#L515)

### Paso 7: Simular aprobacion estocastica de ramos tomados
Por cada ramo inscrito:
- Seleccion de parametros VMap/Delta segun tramo de semestre de la asignatura.
- Muestreo normal y valor absoluto: abs(VMap + Delta * N(0,1)).
- Aprobacion por umbral: prob >= rep.
- Calculo probabilistico: [backend/engine/montecarlo.go#L544](../backend/engine/montecarlo.go#L544)

### Paso 8: Actualizar historial e intentos
Por ramo inscrito:
- Incrementa oportunidad.
- Si aprueba: marca Aprobado y suma creditos aprobados.
- Si reprueba: incrementa contador de reprobaciones.
- Actualizacion de oportunidad y creditos: [backend/engine/montecarlo.go#L549](../backend/engine/montecarlo.go#L549)

### Paso 9: Regla de eliminacion por oportunidades (Opor)
Si la oportunidad supera umbral, cambia estado a EliminadoOpor y corta ciclo del alumno.
- Condicion Opor: [backend/engine/montecarlo.go#L559](../backend/engine/montecarlo.go#L559)

### Paso 10: Regla de eliminacion por TAmin
Al cierre del semestre cursado:
- TA = creditosAprobadosTotales / semestresCursados.
- Si semestresCursados >= NapTAmin y TA < TAmin => EliminadoTAmin.
- Registro de timeline y corte: [backend/engine/montecarlo.go#L573](../backend/engine/montecarlo.go#L573)

### Paso 11: Cerrar alumno y emitir resultado
Se publica estado final, semestres usados, intentos/reprobaciones y timeline de estado.
- Envio de resultado por alumno: [backend/engine/montecarlo.go#L592](../backend/engine/montecarlo.go#L592)

### Paso 12: Agregacion global de la iteracion
Se agregan:
- Titulados, eliminados TA/Opor.
- Distribucion de semestres.
- Retenciones.
- Egreso oportuno con umbral maxSemestreMalla + 2.
- Umbral de egreso oportuno: [backend/engine/montecarlo.go#L621](../backend/engine/montecarlo.go#L621)

## Flujo paso a paso: una iteracion en MATLAB (runner + original)
### Paso 1: Inicializacion de iteracion
- Bucle por iteraciones: [analysis/run_matlab_case1_full_trace.m#L65](run_matlab_case1_full_trace.m#L65)
- Bucle por estudiante: [analysis/run_matlab_case1_full_trace.m#L78](run_matlab_case1_full_trace.m#L78)
- Equivalente original: [original/MallasV12.m#L36](../original/MallasV12.m#L36)

### Paso 2: Primer semestre
- Sem = 1: [analysis/run_matlab_case1_full_trace.m#L79](run_matlab_case1_full_trace.m#L79)
- Muestra normal del primer semestre: [analysis/run_matlab_case1_full_trace.m#L96](run_matlab_case1_full_trace.m#L96)
- Equivalente original: [original/MallasV12.m#L39](../original/MallasV12.m#L39), [original/MallasV12.m#L43](../original/MallasV12.m#L43)

### Paso 3: Calcular TA y chequear TAmin
- TA primer semestre: [analysis/run_matlab_case1_full_trace.m#L104](run_matlab_case1_full_trace.m#L104)
- Corte TAmin: [analysis/run_matlab_case1_full_trace.m#L105](run_matlab_case1_full_trace.m#L105)
- Equivalente original: [original/MallasV12.m#L51](../original/MallasV12.m#L51), [original/MallasV12.m#L52](../original/MallasV12.m#L52)

### Paso 4: Semestres siguientes, evaluar ramos inscritos del semestre previo
- Si Sem > 1, toma filas HA(:,3)==2 y les aplica aprobacion estocastica por tramo.
- Randn por tramos 2-4, 5-8, >=9: [analysis/run_matlab_case1_full_trace.m#L141](run_matlab_case1_full_trace.m#L141), [analysis/run_matlab_case1_full_trace.m#L143](run_matlab_case1_full_trace.m#L143), [analysis/run_matlab_case1_full_trace.m#L145](run_matlab_case1_full_trace.m#L145)
- TA por semestre: [analysis/run_matlab_case1_full_trace.m#L151](run_matlab_case1_full_trace.m#L151)
- Corte TAmin por semestre: [analysis/run_matlab_case1_full_trace.m#L152](run_matlab_case1_full_trace.m#L152)
- Equivalente original: [original/MallasV12.m#L76](../original/MallasV12.m#L76), [original/MallasV12.m#L86](../original/MallasV12.m#L86), [original/MallasV12.m#L87](../original/MallasV12.m#L87)

### Paso 5: Avanzar semestre y construir oferta
- Sem = Sem + 1: [analysis/run_matlab_case1_full_trace.m#L181](run_matlab_case1_full_trace.m#L181)
- Elegir columna par/impar de PROGRAMACION: [analysis/run_matlab_case1_full_trace.m#L184](run_matlab_case1_full_trace.m#L184), [analysis/run_matlab_case1_full_trace.m#L186](run_matlab_case1_full_trace.m#L186)
- Equivalente original: [original/MallasV12.m#L101](../original/MallasV12.m#L101), [original/MallasV12.m#L104](../original/MallasV12.m#L104), [original/MallasV12.m#L106](../original/MallasV12.m#L106)

### Paso 6: Limpiar programacion de ramos ya aprobados
Se elimina de ProgD cualquier ramo que en HA ya tenga aprobado.
- Limpieza de ProgD: [analysis/run_matlab_case1_full_trace.m#L191](run_matlab_case1_full_trace.m#L191)
- Equivalente original: [original/MallasV12.m#L110](../original/MallasV12.m#L110)

### Paso 7: Evaluar prerrequisitos y creditos para inscribir
Para cada candidato auxA:
- Obtener cantidad de prerequisitos (auxNAPr).
- Verificar cada prerequisito en HA aprobado.
- Si cumple prerequisitos y no rompe NCSmax, agregar a HA como estado 2 (inscrita).
- Estructura de candidato: [analysis/run_matlab_case1_full_trace.m#L208](run_matlab_case1_full_trace.m#L208)
- Lectura auxNAPr: [analysis/run_matlab_case1_full_trace.m#L214](run_matlab_case1_full_trace.m#L214)
- Check de prerequisitos: [analysis/run_matlab_case1_full_trace.m#L217](run_matlab_case1_full_trace.m#L217), [analysis/run_matlab_case1_full_trace.m#L228](run_matlab_case1_full_trace.m#L228)
- Insercion en HA: [analysis/run_matlab_case1_full_trace.m#L230](run_matlab_case1_full_trace.m#L230)
- Equivalente original: [original/MallasV12.m#L129](../original/MallasV12.m#L129), [original/MallasV12.m#L131](../original/MallasV12.m#L131), [original/MallasV12.m#L137](../original/MallasV12.m#L137), [original/MallasV12.m#L139](../original/MallasV12.m#L139)

### Paso 8: Cierre de estudiante e iteracion
- Actualizar Resumen del estudiante: [analysis/run_matlab_case1_full_trace.m#L296](run_matlab_case1_full_trace.m#L296)
- Calcular CT en iteracion: [analysis/run_matlab_case1_full_trace.m#L311](run_matlab_case1_full_trace.m#L311)
- Emitir iteration_end: [analysis/run_matlab_case1_full_trace.m#L68](run_matlab_case1_full_trace.m#L68)
- Equivalente original Resumen: [original/MallasV12.m#L179](../original/MallasV12.m#L179)

## Correspondencia conceptual Go vs MATLAB
- Seleccion de oferta por semestre:
Go usa Programacion.Impar/Par o fallback ordenado. MATLAB usa columnas 1/2 de PROGRAMACION.
- Prerrequisitos:
Ambos exigen prerequisitos aprobados para inscribir.
- Limite de creditos:
Ambos bloquean inscripcion cuando supera NCSmax.
- Resultado estocastico:
Ambos usan abs(media + delta * normal), pero con RNG de implementacion distinta.
- Eliminacion:
Ambos aplican Opor y TAmin durante la evolucion semestral.

## Nota de trazabilidad
Para analizar una corrida concreta en detalle evento por evento:
- Go: [analysis/traces/case1_go.jsonl](traces/case1_go.jsonl)
- MATLAB: [analysis/traces/case1_matlab.jsonl](traces/case1_matlab.jsonl)
