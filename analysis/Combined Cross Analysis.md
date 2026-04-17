# Combined Cross Analysis

Este informe consolida los tres cruces anteriores de `case1` con 1000 iteraciones por motor:

- cruce global por iteración,
- cruce por motivo de salida,
- cruce por semestre dentro de cada motivo.

El objetivo es dejar una sola lectura de cómo diverge Go frente a Matlab.

## 1. Resumen ejecutivo

La diferencia no es puntual ni aleatoria.

Go corta antes, acumula menos aprobadas y menos reprobaciones, y concentra la eliminación en el semestre 10. Matlab deja crecer más la trayectoria, concentra la eliminación en el semestre 11 y reparte el término exitoso hacia semestres más tardíos.

## 2. Vista compacta por estudiante

### Estudiante 1

| Dimensión | Go | Matlab |
| --- | ---: | ---: |
| Estado final dominante | `EliminadoTAmin` | `Eliminado` / `Terminado` |
| Semestre medio | 11.37 | 12.94 |
| Aprobadas medias | 32.78 | 41.14 |
| Reprobadas medias | 0.60 | 8.19 |
| Semestre modal de eliminación | 10 | 11 |

### Estudiante 2

| Dimensión | Go | Matlab |
| --- | ---: | ---: |
| Estado final dominante | `EliminadoTAmin` | `Eliminado` / `Terminado` |
| Semestre medio | 11.47 | 12.98 |
| Aprobadas medias | 33.38 | 41.04 |
| Reprobadas medias | 0.60 | 8.38 |
| Semestre modal de eliminación | 10 | 11 |

## 3. Vista por motivo de salida

### Go

#### Estudiante 1

- `EliminadoOpor`: 117 casos, semestre medio 7.09, aprobadas medias 13.29, reprobadas medias 1.21
- `EliminadoTAmin`: 663 casos, semestre medio 10.21, aprobadas medias 26.53, reprobadas medias 0.68
- `Titulado`: 220 casos, semestre medio 17.14, aprobadas medias 62.00, reprobadas medias 0.00

#### Estudiante 2

- `EliminadoOpor`: 140 casos, semestre medio 7.19, aprobadas medias 14.17, reprobadas medias 1.29
- `EliminadoTAmin`: 617 casos, semestre medio 10.28, aprobadas medias 26.46, reprobadas medias 0.68
- `Titulado`: 243 casos, semestre medio 16.99, aprobadas medias 62.00, reprobadas medias 0.00

### Matlab

#### Estudiante 1

- `Eliminado`: 586 casos, semestre medio 10.77, aprobadas medias 26.41, reprobadas medias 9.02
- `Terminado`: 414 casos, semestre medio 16.00, aprobadas medias 62.00, reprobadas medias 7.02

#### Estudiante 2

- `Eliminado`: 596 casos, semestre medio 10.90, aprobadas medias 26.84, reprobadas medias 9.17
- `Terminado`: 404 casos, semestre medio 16.06, aprobadas medias 62.00, reprobadas medias 7.21

## 4. Vista por semestre dentro de cada ruta

### Go

#### Estudiante 1

- `EliminadoOpor`: concentrado entre semestres 6 y 8, con cola menor hasta 10
- `EliminadoTAmin`: casi todo en semestre 10, con 633 casos de 663
- `Titulado`: concentrado en semestres 17 y 18

#### Estudiante 2

- `EliminadoOpor`: concentrado entre semestres 6 y 8, con cola hasta 14
- `EliminadoTAmin`: casi todo en semestre 10, con 582 casos de 617
- `Titulado`: concentrado en semestres 17 y 18

### Matlab

#### Estudiante 1

- `Eliminado`: pico fuerte en semestre 11, con 490 casos
- `Terminado`: concentrado en semestres 16 y 17

#### Estudiante 2

- `Eliminado`: pico fuerte en semestre 11, con 492 casos
- `Terminado`: concentrado en semestres 16 y 17

## 5. Qué significa todo junto

### 5.1 Go elimina antes

La ruta dominante de Go es `EliminadoTAmin` en el semestre 10. Eso aparece tanto en el promedio como en la distribución modal.

### 5.2 Matlab sostiene más trayectoria

Matlab desplaza la eliminación al semestre 11 y conserva más casos hasta `Terminado` en los semestres 16 y 17.

### 5.3 La brecha fuerte está en las reprobaciones

Go elimina con menos de una reprobación media en su ruta dominante. Matlab elimina con alrededor de 9 reprobaciones medias.

Eso es demasiado grande para ser ruido. Indica que Go no está acumulando el mismo historial que Matlab antes de cortar.

### 5.4 El patrón es consistente en ambos estudiantes

No cambia el sentido de la diferencia:

- Go siempre corta antes.
- Go siempre acumula menos aprobadas.
- Go siempre acumula muchas menos reprobaciones.
- Matlab siempre deja madurar más la trayectoria.

## 6. Conclusión final

El patrón conjunto es claro:

1. Go está adelantando el corte por una etapa.
2. Go está truncando la trayectoria antes de que crezca el historial.
3. Matlab conserva el avance y la reprobación acumulada de forma mucho más parecida al comportamiento esperado.

Si se quiere corregir Go, el foco debe estar en la transición entre semestres y en la decisión de eliminación, no solo en la lectura del escenario o en el resultado final.