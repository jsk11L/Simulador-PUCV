# Specific Data Analysis

Este archivo cruza los resultados por iteración entre Go y Matlab usando las trazas completas de `case1` con 1000 iteraciones por motor. El foco está en tres variables por iteración: motivo de salida, semestre de eliminación o término, y cuentas acumuladas de aprobadas y reprobadas.

## 1. Tamaño del cruce

- Registros emparejados: 2000
- Iteraciones analizadas: 1000
- Estudiantes: 2

Cada iteración aporta dos pares de registros comparables, uno por estudiante.

## 2. Estudiante 1

### Distribución de salida

- Go: `EliminadoTAmin` 663, `EliminadoOpor` 117, `Titulado` 220
- Matlab: `Terminado` 414, `Eliminado` 586

### Semestre de salida

- Media Go: `11.37`
- Media Matlab: `12.94`
- Diferencia media Go - Matlab: `-1.57`
- Coincidencia exacta de semestre: `34/1000`

### Cuentas acumuladas

- Aprobadas medias en Go: `32.78`
- Aprobadas medias en Matlab: `41.14`
- Diferencia media de aprobadas Go - Matlab: `-8.36`
- Reprobadas medias en Go: `0.60`
- Reprobadas medias en Matlab: `8.19`
- Diferencia media de reprobadas Go - Matlab: `-7.59`

### Lectura

Go corta antes la trayectoria del estudiante 1. La diferencia no es solo en el estado final: también aparecen menos semestres cursados, menos aprobadas y menos reprobadas.

Eso sugiere que el motor Go está truncando la simulación antes de que se acumulen las mismas oportunidades que en Matlab.

## 3. Estudiante 2

### Distribución de salida

- Go: `EliminadoOpor` 140, `Titulado` 243, `EliminadoTAmin` 617
- Matlab: `Eliminado` 596, `Terminado` 404

### Semestre de salida

- Media Go: `11.47`
- Media Matlab: `12.98`
- Diferencia media Go - Matlab: `-1.51`
- Coincidencia exacta de semestre: `28/1000`

### Cuentas acumuladas

- Aprobadas medias en Go: `33.38`
- Aprobadas medias en Matlab: `41.04`
- Diferencia media de aprobadas Go - Matlab: `-7.67`
- Reprobadas medias en Go: `0.60`
- Reprobadas medias en Matlab: `8.38`
- Diferencia media de reprobadas Go - Matlab: `-7.78`

### Lectura

El patrón se repite casi igual para el segundo estudiante. Go termina antes, aprueba menos y también registra muchas menos reprobaciones acumuladas.

La baja cantidad de reprobaciones en Go no parece una mejora; más bien coincide con una salida prematura que interrumpe la evolución del estudiante antes de que el historial crezca como en Matlab.

## 4. Comparación entre motores

### Estado final

Go no coincide nunca exactamente con el estado final de Matlab en esta muestra de 1000 iteraciones.

- Estudiante 1: `Same state iterations = 0/1000`
- Estudiante 2: `Same state iterations = 0/1000`

Esto es importante: no se trata de una diferencia ocasional o de una sola semilla. En todo el cruce analizado, el estado final de ambos motores fue distinto en cada iteración.

### Semestre final

La coincidencia exacta de semestre es muy baja:

- Estudiante 1: `34/1000`
- Estudiante 2: `28/1000`

Eso equivale aproximadamente a un 3% de coincidencia. El resto de las iteraciones muestra que Go y Matlab cortan en momentos distintos.

### Cuentas acumuladas

En ambos estudiantes, Go acumula menos aprobadas y menos reprobadas.

La lectura correcta es que Go no está reproduciendo el mismo recorrido temporal que Matlab. No solo cierra antes, sino que también registra menos eventos intermedios, lo que es consistente con una trayectoria truncada.

## 5. Diferencia operativa que sí importa

El hallazgo más fuerte no es solamente que Go titule menos.

Lo que realmente aparece es esto:

1. Go muestra menos semestres promedio.
2. Go registra menos aprobadas promedio.
3. Go registra menos reprobadas promedio.
4. Go nunca iguala el estado final de Matlab en la muestra analizada.

Eso encaja con un problema de corte temprano o de evaluación acumulativa distinta, no con ruido estadístico.

## 6. Conclusión

El cruce por iteración confirma que la diferencia entre motores es estructural.

Go termina antes en promedio por alrededor de 1.5 semestres, acumula unas 7 a 8 aprobadas menos por estudiante y también registra muchas menos reprobaciones. Matlab mantiene trayectorias más largas y llega con mucha más frecuencia al término exitoso.

La señal útil para depurar Go es esta: si el motor corta antes, entonces el problema más probable está en el criterio de eliminación o en el flujo que sigue acumulando estados por semestre.

## 7. Siguiente paso sugerido

El siguiente cruce debería separar por motivo de salida dentro de Go (`EliminadoTAmin` vs `EliminadoOpor` vs `Titulado`) y compararlo contra el estado único de Matlab. Eso permitiría ver si el desajuste está concentrado en `TAmin` o si también afecta la lógica de oportunidades.