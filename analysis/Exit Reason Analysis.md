# Exit Reason Analysis

Este documento compara Go y Matlab separando los resultados por motivo de salida. El objetivo es ver cómo cambian el semestre final, las aprobadas acumuladas y las reprobadas acumuladas cuando cada motor termina por una ruta distinta.

## 1. Resumen general

### Go

- Estudiante 1: `EliminadoTAmin` 663, `EliminadoOpor` 117, `Titulado` 220
- Estudiante 2: `EliminadoTAmin` 617, `EliminadoOpor` 140, `Titulado` 243

### Matlab

- Estudiante 1: `Eliminado` 586, `Terminado` 414
- Estudiante 2: `Eliminado` 596, `Terminado` 404

La diferencia básica es que Go divide sus salidas en dos mecanismos de eliminación, mientras Matlab concentra la salida en una sola etiqueta de eliminación y un término exitoso.

## 2. Estudiante 1

### Go por motivo de salida

- `EliminadoOpor`: semestre medio `7.09`, aprobadas medias `13.29`, reprobadas medias `1.21`
- `EliminadoTAmin`: semestre medio `10.21`, aprobadas medias `26.53`, reprobadas medias `0.68`
- `Titulado`: semestre medio `17.14`, aprobadas medias `62.00`, reprobadas medias `0.00`

### Matlab por motivo de salida

- `Eliminado`: semestre medio `10.77`, aprobadas medias `26.41`, reprobadas medias `9.02`
- `Terminado`: semestre medio `16.00`, aprobadas medias `62.00`, reprobadas medias `7.02`

### Lectura

La señal más clara aparece en `reproved`.

Go elimina por `TAmin` con apenas `0.68` reprobaciones medias, mientras Matlab elimina con `9.02` reprobaciones medias. Esa diferencia es demasiado grande para ser ruido.

Además, el semestre medio de eliminación por `TAmin` en Go (`10.21`) es más bajo que el semestre medio de eliminación en Matlab (`10.77`), y el término exitoso en Go aparece a `17.14`, un poco más tarde que en Matlab (`16.00`), pero con muchas menos reprobaciones acumuladas en toda la ruta.

## 3. Estudiante 2

### Go por motivo de salida

- `EliminadoOpor`: semestre medio `7.19`, aprobadas medias `14.17`, reprobadas medias `1.29`
- `EliminadoTAmin`: semestre medio `10.28`, aprobadas medias `26.46`, reprobadas medias `0.68`
- `Titulado`: semestre medio `16.99`, aprobadas medias `62.00`, reprobadas medias `0.00`

### Matlab por motivo de salida

- `Eliminado`: semestre medio `10.90`, aprobadas medias `26.84`, reprobadas medias `9.17`
- `Terminado`: semestre medio `16.06`, aprobadas medias `62.00`, reprobadas medias `7.21`

### Lectura

El patrón se repite casi igual.

Go corta por `TAmin` antes y con muy pocas reprobaciones acumuladas, mientras Matlab sostiene la trayectoria hasta una eliminación mucho más cargada en reprobaciones. El término exitoso también muestra una diferencia clara: Go alcanza `62` aprobadas con una trayectoria algo más larga, pero el camino previo sigue mucho más limpio que en Matlab.

## 4. Qué significa esta diferencia

### 4.1 Go está cortando con historial pobre

En las salidas por `EliminadoTAmin`, Go muestra menos de una reprobación promedio. Eso es una señal fuerte de corte prematuro o de que la lógica de acumulación no está generando el mismo historial que Matlab.

### 4.2 Matlab deja crecer el historial antes de cortar

En Matlab, la eliminación ocurre con alrededor de 9 reprobaciones medias. Eso sugiere una dinámica mucho más larga de repetición y seguimiento del estudiante.

### 4.3 El término exitoso no compensa la diferencia

Aunque ambos motores llegan a `62` aprobadas en las trayectorias exitosas, Go sigue mostrando menos reprobaciones y un promedio de semestre más corto. La divergencia no está solo en llegar o no llegar; está en el camino.

## 5. Interpretación técnica

El problema no parece estar en la mera clasificación final.

La diferencia grande está en cómo se construye la eliminación:

- Go llega a `EliminadoTAmin` con muy pocas reprobaciones.
- Matlab llega a `Eliminado` con muchas más reprobaciones acumuladas.

Eso apunta a una diferencia en la lógica de actualización por semestre, en la evaluación del avance mínimo o en la forma de conservar el historial de intentos.

## 6. Conclusión

Separar por motivo de salida deja el patrón más limpio:

1. Go elimina antes y con menos historial.
2. Matlab sostiene más tiempo al estudiante antes de eliminarlo.
3. La brecha más fuerte está en las reprobaciones acumuladas.

Si se busca corregir Go, el foco ya no debe estar solo en el estado final. Hay que revisar cómo se acumulan las reprobaciones y en qué momento exacto se dispara `TAmin` frente a la trayectoria real del estudiante.