# Data Trail: comparación entre `case1_go.jsonl` y `case1_matlab.jsonl`

Este documento resume la comparación entre las dos trazas del caso `Caso Actual`. El objetivo no es solo listar diferencias de formato, sino explicar cómo cambia el comportamiento del simulador por fase, por estudiante y por semestre.

## 1. Lectura estructural de las trazas

Las dos trazas representan el mismo escenario base:

- Escenario: `Caso Actual`
- ID de escenario: `caso_actual`
- Seed: `20260416`
- Iteraciones: `1`
- Libro fuente: `Civilelectrica93.xlsx`
- Hojas: `Malla` y `ProgramacionB`

La diferencia principal no está en el escenario, sino en el modo de registrar y exponer el avance:

- La traza Go usa eventos tipo `event` con campos como `scenario_loaded`, `iteration_start`, `student_start`, `semester_start`, `semester_candidates`, `semester_end` y `student_end`.
- La traza Matlab usa `stage` / `payload` y muestra más estado interno por semestre, con etapas como `semester_programming`, `semester_iteration` y un vector de variables de control más explícito.

En otras palabras: ambas trazas parten del mismo caso, pero Matlab deja ver más del estado algorítmico, mientras Go resume el flujo en hitos operativos.

## 2. Diferencias por fase

### Fase de carga del escenario

En ambas trazas aparece la misma base de entrada. No hay divergencia de escenario, semilla ni archivo fuente.

Lo importante aquí es que el problema no está en la lectura inicial: ambos logs nacen del mismo caso y, por lo tanto, las diferencias posteriores deben venir de la lógica de simulación, del criterio de corte o de cómo cada motor registra el avance.

### Fase de inicialización

Las dos trazas arrancan con estudiante activo y semestre 1.

La traza Matlab expone explícitamente más estado acumulado desde el principio, por ejemplo variables como `Sem`, `CA`, `NCSmax`, `TAmin`, `NapTAmin`, `Opor`, además de vectores de historial y métricas de avance.

Go, en cambio, muestra una inicialización más compacta: estado activo, semestre actual, historial por asignatura y acumulados de créditos aprobados.

### Fase de programación del semestre

Aquí aparece una de las diferencias más claras de lectura:

- Go registra candidatos y el resultado del semestre con eventos como `semester_candidates` y `semester_end`.
- Matlab registra la programación del semestre con más detalle interno, incluyendo el armado del semestre y la iteración del estado.

Esto hace que Matlab sea más útil para auditar la causa de cada decisión, mientras Go es más útil para ver el flujo externo del simulador.

### Fase de aprobación y repetición

Ambas trazas reflejan la misma idea central: la aprobación depende de la combinación entre elegibilidad, cupos/carga y una evaluación estocástica contra umbrales de aprobación.

La diferencia práctica es que Matlab deja ver mejor el estado acumulado de aprobadas y reprobadas, mientras Go concentra ese resultado en el historial y en los contadores agregados.

### Fase de eliminación por avance académico

Aquí está la divergencia más importante.

Las dos trazas aplican la regla de avance mínimo (`TAmin`) después de cierto número de semestres (`NapTAmin`). Sin embargo, el resultado final del mismo escenario no coincide:

- En Go, el corte ocurre antes y deja al estudiante 1 como `EliminadoTAmin`.
- En Matlab, el mismo estudiante 1 sigue avanzando hasta terminar como `Terminado`.

Eso significa que, aunque la regla existe en ambos motores, no se está llegando al mismo punto de corte, o no se están acumulando exactamente las mismas métricas en cada implementación.

## 3. Comparación por estudiante

### Estudiante 1

**Go**

- Estado final: `EliminadoTAmin`
- Semestres cursados: `10`
- Asignaturas aprobadas: `29`
- Asignaturas reprobadas: `1`

**Matlab**

- Estado final: `Terminado`
- Semestres cursados: `15`
- Asignaturas aprobadas: `62`
- Asignaturas reprobadas: `7`

**Interpretación**

La diferencia no es menor: el mismo caso lleva a un cierre prematuro en Go y a egreso completo en Matlab. Esto apunta a una diferencia acumulativa, no a una variación aislada de un semestre.

La lectura más fuerte es que el motor Go está evaluando antes o de forma distinta el progreso académico mínimo, o bien está acumulando créditos/aprobaciones con una regla no equivalente a la del original.

### Estudiante 2

**Go**

- En el tramo observado del log, el estudiante 2 aparece en progreso parcial, pero el resumen disponible en la conversación no mostró su cierre completo.

**Matlab**

- Estado final: `Eliminado`
- Semestre de salida observado: `11`

**Interpretación**

Aquí también hay una diferencia de comportamiento: Matlab sí deja ver un recorrido más largo hasta la eliminación, mientras que el recorte disponible de Go no permite confirmar el mismo punto de corte.

Esto refuerza que no estamos ante una mera diferencia de formato de log, sino ante una divergencia efectiva en la evolución del estudiante.

## 4. Comparación por semestre

### Semestres tempranos

En los primeros semestres, ambas trazas comparten el mismo patrón general:

- se carga el estudiante,
- se abre el semestre,
- se seleccionan candidatos o se arma la programación,
- se evalúan aprobaciones,
- se actualizan contadores y estado.

La semántica del flujo es equivalente, pero el nivel de detalle no lo es.

### Semestre 10

Este es el punto crítico visible para Go:

- Go cierra al estudiante 1 en `EliminadoTAmin` en el semestre 10.

Ese cierre temprano indica que, al llegar al umbral temporal, el avance acumulado no superó el mínimo exigido por la regla de eliminación.

### Semestres 11 a 15

En Matlab, el estudiante 1 sigue activo después del umbral que en Go ya produjo eliminación.

El estudiante finalmente llega a `Terminado` en el semestre 15.

Esto demuestra que el desfase no es solo de presentación, sino de trayectoria. El algoritmo Matlab tolera más permanencia o acumula progreso de forma distinta antes de disparar la eliminación.

### Semestre 11 para el estudiante 2

En Matlab, el estudiante 2 llega al semestre 11 y termina eliminado.

Ese comportamiento sugiere que Matlab sí está aplicando una lógica de permanencia más larga antes del corte, mientras que Go probablemente está evaluando más agresivamente alguna condición de salida o está consolidando el avance con otra base.

## 5. Conclusión técnica

La comparación muestra tres conclusiones fuertes:

1. Las dos trazas describen el mismo escenario y la misma semilla.
2. El formato de trazado es distinto, pero la diferencia clave no es visual: el comportamiento final cambia.
3. El punto de ruptura está en la dinámica acumulativa del semestre, sobre todo en la evaluación de avance mínimo y en cómo cada motor consolida aprobaciones, reprobas y permanencia.

En términos prácticos, Go no está reproduciendo exactamente el mismo trayecto que Matlab para este caso. El síntoma más claro es el estudiante 1:

- Go: eliminación por `TAmin` en 10 semestres.
- Matlab: término exitoso en 15 semestres.

Eso obliga a revisar la equivalencia de la lógica de actualización por semestre, no solo la carga de datos o el nombre de los eventos.

## 6. Recomendación de análisis siguiente

Si el objetivo es cerrar la paridad entre motores, el siguiente paso debería ser alinear estas tres zonas:

- regla exacta de cálculo de avance (`TA`),
- momento exacto en que se evalúa la eliminación por `TAmin`,
- y acumulación de aprobadas/reprobadas por semestre.

Con esas tres piezas alineadas, la comparación dejaría de divergir en los cierres de estudiante y pasaría a ser una comparación puramente de formato.