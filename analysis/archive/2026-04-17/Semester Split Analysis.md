# Semester Split Analysis

Este análisis cruza Go y Matlab por semestre de salida dentro de cada motivo de salida. El objetivo es ver en qué semestre se concentra cada ruta y cómo cambia la forma de la trayectoria entre motores.

## 1. Qué se observa primero

Go concentra la eliminación en el semestre 10. Matlab, en cambio, concentra la eliminación en el semestre 11 y mueve el término exitoso hacia los semestres 15 a 17.

Eso ya sugiere una diferencia de una etapa completa en la trayectoria.

## 2. Estudiante 1

### Go

#### `EliminadoOpor`

- Conteo: 117
- Semestre mínimo: 6
- Semestre máximo: 10
- Semestres más frecuentes: 6, 7 y 8

#### `EliminadoTAmin`

- Conteo: 663
- Semestre mínimo: 10
- Semestre máximo: 18
- Semestre más frecuente: 10, con 633 casos

#### `Titulado`

- Conteo: 220
- Semestre mínimo: 15
- Semestre máximo: 19
- Semestres más frecuentes: 18 y 17

### Matlab

#### `Eliminado`

- Conteo: 586
- Semestre mínimo: 7
- Semestre máximo: 19
- Semestre más frecuente: 11, con 490 casos

#### `Terminado`

- Conteo: 414
- Semestre mínimo: 14
- Semestre máximo: 18
- Semestres más frecuentes: 16 y 17

### Lectura

La diferencia más fuerte está en la masa principal de eliminación.

Go elimina por `TAmin` casi siempre en el semestre 10. Matlab, en cambio, elimina mayoritariamente en el semestre 11.

Eso significa que Go dispara la salida un semestre antes en la ruta de eliminación más común.

El término exitoso también ocurre más tarde en Go que en Matlab si se mira la distribución modal: Go se concentra en 17 y 18, mientras Matlab se concentra en 16 y 17. Pero eso no compensa la salida temprana masiva por `TAmin`.

## 3. Estudiante 2

### Go

#### `EliminadoOpor`

- Conteo: 140
- Semestre mínimo: 6
- Semestre máximo: 14
- Semestres más frecuentes: 7 y 6

#### `EliminadoTAmin`

- Conteo: 617
- Semestre mínimo: 10
- Semestre máximo: 18
- Semestre más frecuente: 10, con 582 casos

#### `Titulado`

- Conteo: 243
- Semestre mínimo: 13
- Semestre máximo: 19
- Semestres más frecuentes: 18 y 17

### Matlab

#### `Eliminado`

- Conteo: 596
- Semestre mínimo: 6
- Semestre máximo: 19
- Semestre más frecuente: 11, con 492 casos

#### `Terminado`

- Conteo: 404
- Semestre mínimo: 14
- Semestre máximo: 18
- Semestres más frecuentes: 17 y 16

### Lectura

El segundo estudiante repite el mismo patrón con muy poca variación.

Go concentra la eliminación por `TAmin` en el semestre 10 y la eliminación por oportunidad en los semestres 6 a 8.

Matlab mueve la eliminación al semestre 11 y conserva más casos hasta el término entre los semestres 16 y 17.

## 4. Qué patrón importa realmente

### 4.1 Go corta una etapa antes

El semestre más frecuente de eliminación en Go es 10 para `EliminadoTAmin`.

### 4.2 Matlab desplaza la eliminación al 11

El semestre más frecuente de eliminación en Matlab es 11.

### 4.3 El término exitoso también es más tardío y más distribuido en Matlab

Matlab tiene su masa de término en 16 y 17, mientras Go la tiene en 17 y 18.

### 4.4 La brecha no es ruido

La distribución de Go está mucho más concentrada en un semestre de corte prematuro. Matlab reparte más la trayectoria y permite mayor maduración del historial.

## 5. Interpretación técnica

El cruce por semestre confirma que Go no solo elimina con menos reprobaciones o con otro estado final; también lo hace un semestre antes en la ruta dominante.

Eso apunta a una diferencia concreta en la lógica de avance:

- la evaluación de `TAmin` podría estar entrando antes,
- o el historial podría estar consolidándose de forma distinta,
- o el criterio de permanencia podría ser más estricto en Go.

## 6. Conclusión

La forma de la distribución es muy clara:

1. Go concentra `EliminadoTAmin` en el semestre 10.
2. Matlab concentra `Eliminado` en el semestre 11.
3. Go y Matlab terminan exitosamente en rangos distintos, con Matlab más cargado hacia 16-17.

La señal de depuración es fuerte: el punto de corte de Go parece adelantado por una etapa respecto de Matlab.