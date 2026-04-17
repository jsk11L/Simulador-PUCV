# Data Trail 2: análisis de resultados agregados

Este documento analiza los resultados de la corrida larga y busca diferencias sistemáticas entre Go y Matlab. La fuente principal es el archivo [Critical Comparison Report.csv](analysis/Critical%20Comparison%20Report.csv), que resume los promedios por escenario.

## 1. Qué muestran los resultados

La comparación ya no apunta a un caso aislado. Con promedios agregados, la diferencia entre motores deja de parecer ruido y empieza a verse como un sesgo de comportamiento.

La señal más clara es esta:

- Go queda por debajo de Matlab en prácticamente todos los escenarios y métricas.
- Matlab se acerca más al paper en varias métricas, pero no de forma uniforme.
- La diferencia no parece aleatoria, porque se repite en todos los escenarios evaluados.

## 2. Patrón general por métrica

### PPE

Go subestima fuertemente `ppe` en todos los escenarios.

- En `Caso Actual`, Go da `24.40` y Matlab `39.22`.
- En `R-10>40`, Go da `42.68` y Matlab `59.92`.
- En `PF`, Go da `47.14` y Matlab `63.58`.

Interpretación: Go no solo está un poco abajo, sino consistentemente abajo. Eso sugiere una diferencia estructural en la permanencia o en la forma de titular.

### PSCE

Go también cae mucho en `psce`.

- En `Caso Actual`, Go da `7.44` y Matlab `10.12`.
- En `R+10`, Go da `2.62` y Matlab `5.16`.
- En `PF`, Go da `12.33` y Matlab `13.60`.

Interpretación: el motor Go está produciendo semestres promedio claramente más bajos. Eso coincide con una simulación que elimina antes o que corta trayectorias demasiado pronto.

### EE

La diferencia en `ee` es más pequeña, pero sigue favoreciendo a Matlab en casi todos los escenarios.

- `Caso Actual`: Go `0.62`, Matlab `0.84`.
- `R-10`: Go `1.03`, Matlab `1.13`.
- `PF`: Go `1.03`, Matlab `1.13`.

Interpretación: aquí la brecha no es tan grande como en `ppe` o `peo`, pero sigue apuntando a que Go entrega trayectorias menos eficientes.

### PEO

Esta es la métrica más alarmante.

- `Caso Actual`: Go `0.13`, Matlab `4.18`.
- `PE`: Go `0.02`, Matlab `1.01`.
- `R-10`: Go `0.63`, Matlab `12.62`.
- `PF`: Go `0.64`, Matlab `12.52`.

Interpretación: Go prácticamente destruye el egreso oportuno. No es una desviación pequeña; es una caída de orden de magnitud. Eso apunta a una condición de corte o de acumulación que está castigando mucho más al estudiante que en Matlab.

## 3. Comparación por escenario

### Caso Actual

Matlab supera a Go en todas las métricas:

- `ppe`: +14.82
- `psce`: +2.68
- `ee`: +0.22
- `peo`: +4.05

Este caso ya mostraba una diferencia clara en la traza puntual, y el agregado confirma que no fue suerte.

### PE

Matlab vuelve a quedar por encima de Go en todas las métricas:

- `ppe`: +5.36
- `psce`: +1.45
- `ee`: +0.12
- `peo`: +0.99

La brecha es menor que en `Caso Actual`, pero el patrón es el mismo.

### CAS

Otra vez Matlab domina a Go:

- `ppe`: +15.95
- `psce`: +1.98
- `ee`: +0.17
- `peo`: +6.58

Aquí la diferencia en `peo` ya es muy fuerte, así que el problema no está restringido a un solo tipo de escenario.

### R-10

Matlab sigue por encima:

- `ppe`: +16.26
- `psce`: +1.23
- `ee`: +0.10
- `peo`: +11.99

Este escenario refuerza la idea de que Go está cortando demasiado temprano o acumulando progreso de forma más dura.

### R+10

Matlab supera a Go:

- `ppe`: +9.68
- `psce`: +2.54
- `ee`: +0.21
- `peo`: +0.81

Aquí la brecha es más moderada en `peo`, pero Go sigue sistemáticamente por debajo.

### R-10>40

Matlab vuelve a ser más alto:

- `ppe`: +17.24
- `psce`: +1.73
- `ee`: +0.15
- `peo`: +9.44

El patrón no cambia aunque el escenario cambie.

### PF

Este es el único caso donde Matlab no supera a Go en todas las métricas:

- `ppe`: Matlab queda debajo de Go por `16.44`
- `psce`: Matlab queda debajo de Go por `1.27`
- `ee`: Matlab queda encima de Go por `0.10`
- `peo`: Matlab queda muy por encima de Go por `11.88`

Interpretación: PF es mixto en `ppe` y `psce`, pero en `peo` vuelve a aparecer la diferencia grande a favor de Matlab. Eso hace pensar que el punto débil de Go no es solo la titulación, sino sobre todo la oportunidad de egreso.

## 4. Qué diferencia parece real y qué parece ruido

Con 1000 iteraciones por motor, la brecha repetida entre Go y Matlab ya no parece producto de azar.

Lo que sí parece estable:

- Go reduce `ppe` en todos los escenarios.
- Go reduce `psce` en todos los escenarios.
- Go reduce `peo` de forma extrema en casi todos los escenarios.
- Matlab mantiene resultados más altos y más cercanos al paper en varias métricas.

Lo que parece menos estable:

- `PF` en `ppe` y `psce`, donde Go supera a Matlab.

Eso sugiere que el problema no es una sola constante mal puesta. Es más probable que haya una diferencia de lógica acumulativa, de criterio de corte o de consolidación de estado por semestre.

## 5. Conclusión técnica

Los resultados agregados confirman que la diferencia entre motores no era un caso aislado.

La lectura más fuerte es:

1. Go está sesgando el simulador hacia trayectorias más cortas.
2. Matlab conserva más permanencia y, por eso, mejora `peo` y en general también `ppe` y `psce`.
3. El error más importante no parece estar en la carga del escenario, sino en la lógica que decide cuánto dura el estudiante y cuándo se corta su trayectoria.

En términos prácticos, el patrón de Go “funcionando mal” no es random: es sistemático y visible en los promedios.

## 6. Siguiente paso recomendado

El siguiente análisis debería cruzar:

- estado final por iteración,
- semestre de corte,
- motivo de eliminación,
- y cantidad de aprobadas/reprobadas acumuladas.

Ese cruce permitiría confirmar si la brecha viene de `TAmin`, de `Opor`, o de una diferencia más profunda en el acumulado semestral.