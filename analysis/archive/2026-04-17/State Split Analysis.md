# State Split Analysis

Este análisis separa los resultados de `case1` por estado final y compara Go contra Matlab usando 1000 iteraciones por motor. La idea es ver qué pasa cuando cada motor termina en cada tipo de salida, no solo en el promedio global.

## 1. Resumen general

- Registros analizados por motor: 2000
- Estudiantes: 2
- Iteraciones: 1000

Go y Matlab no solo terminan distinto; además distribuyen de forma distinta el tipo de salida y la profundidad de cada trayectoria.

## 2. Estudiante 1

### Go

- `EliminadoTAmin`: 663 casos
- `EliminadoOpor`: 117 casos
- `Titulado`: 220 casos
- Media de semestre: `11.37`
- Media de aprobadas: `32.78`
- Media de reprobadas: `0.60`

### Go por estado

- `EliminadoOpor`: semestre medio `7.09`, aprobadas medias `13.29`, reprobadas medias `1.21`
- `EliminadoTAmin`: semestre medio `10.21`, aprobadas medias `26.53`, reprobadas medias `0.68`
- `Titulado`: semestre medio `17.14`, aprobadas medias `62.00`, reprobadas medias `0.00`

### Matlab

- `Terminado`: 414 casos
- `Eliminado`: 586 casos
- Media de semestre: `12.94`
- Media de aprobadas: `41.14`
- Media de reprobadas: `8.19`

### Matlab por estado

- `Eliminado`: semestre medio `10.77`, aprobadas medias `26.41`, reprobadas medias `9.02`
- `Terminado`: semestre medio `16.00`, aprobadas medias `62.00`, reprobadas medias `7.02`

### Lectura

Go concentra la mayor parte de sus salidas en `EliminadoTAmin`, mientras Matlab reparte su resultado entre `Terminado` y `Eliminado` con muchas más reprobaciones acumuladas.

La señal más importante es esta: cuando Go elimina por `TAmin`, lo hace con muy pocas reprobaciones acumuladas (`0.68` en promedio). Matlab, en cambio, elimina con `9.02` reprobaciones promedio.

Eso sugiere que Go no está dejando madurar el historial hasta un punto comparable al de Matlab.

## 3. Estudiante 2

### Go

- `EliminadoTAmin`: 617 casos
- `EliminadoOpor`: 140 casos
- `Titulado`: 243 casos
- Media de semestre: `11.47`
- Media de aprobadas: `33.38`
- Media de reprobadas: `0.60`

### Go por estado

- `EliminadoOpor`: semestre medio `7.19`, aprobadas medias `14.17`, reprobadas medias `1.29`
- `EliminadoTAmin`: semestre medio `10.28`, aprobadas medias `26.46`, reprobadas medias `0.68`
- `Titulado`: semestre medio `16.99`, aprobadas medias `62.00`, reprobadas medias `0.00`

### Matlab

- `Eliminado`: 596 casos
- `Terminado`: 404 casos
- Media de semestre: `12.98`
- Media de aprobadas: `41.04`
- Media de reprobadas: `8.38`

### Matlab por estado

- `Eliminado`: semestre medio `10.90`, aprobadas medias `26.84`, reprobadas medias `9.17`
- `Terminado`: semestre medio `16.06`, aprobadas medias `62.00`, reprobadas medias `7.21`

### Lectura

El segundo estudiante repite el patrón con bastante fidelidad.

Go vuelve a cortar muy temprano en `EliminadoTAmin`, con apenas `0.68` reprobaciones medias. Matlab elimina mucho más tarde y con `9.17` reprobaciones medias.

Ese desfase no parece incidental. Parece una diferencia de criterio o de acumulación del estado.

## 4. Qué revela el cruce por estado

### 4.1 Go elimina antes y con menos historial

En Go, tanto `EliminadoTAmin` como `EliminadoOpor` ocurren con menos semestres, menos aprobadas y muy pocas reprobaciones.

### 4.2 Matlab acumula más antes de cortar

En Matlab, la eliminación ocurre con muchos más rechazos acumulados, y el término exitoso se da en semestres más largos y con el historial completamente desarrollado.

### 4.3 El problema visible no es solo el resultado final

El problema aparece también en el camino:

- Go tiene más salidas por `TAmin`.
- Go registra menos reprobaciones antes de cortar.
- Matlab sostiene la trayectoria más tiempo.

Eso apunta a una divergencia en el mecanismo de actualización por semestre, no solo en una constante final.

## 5. Interpretación técnica

El estado `EliminadoTAmin` en Go aparece demasiado pronto y con un historial demasiado corto.

El estado `Eliminado` en Matlab, en cambio, deja crecer la trayectoria y la cantidad de reprobaciones antes de cortar.

La consecuencia práctica es clara: Go está evaluando o consolidando el progreso con una regla más estricta o más temprana que Matlab.

## 6. Conclusión

El cruce por estado confirma la hipótesis principal:

1. Go no está reproduciendo el mismo ritmo de acumulación que Matlab.
2. La diferencia más fuerte está en las salidas por `TAmin`.
3. Matlab deja madurar mucho más el historial antes de eliminar.

Si se quiere corregir Go, el punto de ataque no es solo el estado final. Hay que revisar cómo se acumulan aprobadas, reprobadas y semestres antes de decidir la eliminación.