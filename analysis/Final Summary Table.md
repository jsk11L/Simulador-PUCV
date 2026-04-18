# Final Summary Table

Resumen consolidado de los cruces de `case1` con 1000 iteraciones por motor.

## 1. Resumen global por estudiante

| Estudiante | Motor | Estado dominante | Semestre medio | Aprobadas medias | Reprobadas medias |
| --- | --- | --- | ---: | ---: | ---: |
| 1 | Go | `EliminadoTAmin` | 11.37 | 32.78 | 0.60 |
| 1 | Matlab | `Eliminado` / `Terminado` | 12.94 | 41.14 | 8.19 |
| 2 | Go | `EliminadoTAmin` | 11.47 | 33.38 | 0.60 |
| 2 | Matlab | `Eliminado` / `Terminado` | 12.98 | 41.04 | 8.38 |

## 2. Resumen por motivo de salida

### Go

| Estudiante | Motivo | Casos | Semestre medio | Aprobadas medias | Reprobadas medias |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | `EliminadoOpor` | 117 | 7.09 | 13.29 | 1.21 |
| 1 | `EliminadoTAmin` | 663 | 10.21 | 26.53 | 0.68 |
| 1 | `Titulado` | 220 | 17.14 | 62.00 | 0.00 |
| 2 | `EliminadoOpor` | 140 | 7.19 | 14.17 | 1.29 |
| 2 | `EliminadoTAmin` | 617 | 10.28 | 26.46 | 0.68 |
| 2 | `Titulado` | 243 | 16.99 | 62.00 | 0.00 |

### Matlab

| Estudiante | Motivo | Casos | Semestre medio | Aprobadas medias | Reprobadas medias |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | `Eliminado` | 586 | 10.77 | 26.41 | 9.02 |
| 1 | `Terminado` | 414 | 16.00 | 62.00 | 7.02 |
| 2 | `Eliminado` | 596 | 10.90 | 26.84 | 9.17 |
| 2 | `Terminado` | 404 | 16.06 | 62.00 | 7.21 |

## 3. Semestre dominante de cada ruta

| Motor | Ruta | Semestre dominante | Observación |
| --- | --- | ---: | --- |
| Go | `EliminadoTAmin` | 10 | La masa principal de eliminación se concentra aquí. |
| Go | `EliminadoOpor` | 6 a 8 | Salida temprana por oportunidades. |
| Go | `Titulado` | 17 a 18 | Término más tardío y escaso. |
| Matlab | `Eliminado` | 11 | Eliminación desplazada un semestre más tarde. |
| Matlab | `Terminado` | 16 a 17 | Término con trayectoria más larga. |

## 4. Lectura final

- Go corta antes y con muy pocas reprobaciones acumuladas.
- Matlab sostiene más semestres y acumula muchas más reprobaciones antes de eliminar.
- La brecha principal está en `EliminadoTAmin`, que en Go domina y aparece un semestre antes que la eliminación principal de Matlab.

## 5. Archivos fuente

- [Combined Cross Analysis.md](Combined%20Cross%20Analysis.md)
- [Specific Data Analysis.md](Specific%20Data%20Analysis.md)
- [Exit Reason Analysis.md](Exit%20Reason%20Analysis.md)
- [Semester Split Analysis.md](Semester%20Split%20Analysis.md)

## 6. Micro-Test trazable (2026-04-17)

Comparación determinística pedida: Estudiante 1, Semestre 3, `scenario=caso_actual`, `iterations=1`, `seed=20260416`.

| Motor | Asignaturas inscritas S3 (Est. 1) |
| --- | --- |
| Go | `215,205,217,300,344,400` |
| Matlab | `140,215,233,205` |

Hallazgo clave: la divergencia no nace en S3, nace en S1.

- Go S1 aprueba `115,140,116,100`.
- Matlab S1 aprueba `115,116,100` y reprueba `140`.

Evidencia de traza (S1, ramo `140`):

- Go: `abs=0.280790 >= rep(0.18)` -> aprobado.
- Matlab: `r=0.094290 < rep(0.18)` -> reprobado.

Conclusión técnica: usar el mismo `seed` NO garantiza la misma trayectoria alumno-a-alumno entre MATLAB y Go porque los generadores normales (`randn` vs `NormFloat64`) no producen la misma secuencia. Por eso, el micro-test de igualdad exacta por estudiante solo es válido si ambos motores consumen una misma secuencia de aleatorios pregrabada o un RNG común.

## 7. Caso 1 completo (1000 iteraciones)

Ejecución completa realizada en ambos motores con `scenario=caso_actual`, `iterations=1000`, `seed=20260416`.

| Métrica | Go | Matlab | Delta (Go-Matlab) |
| --- | ---: | ---: | ---: |
| PPE | 23.15 | 40.90 | -17.75 |
| PSCE | 17.06 | 16.03 | +1.03 |
| EE | 1.42 | 1.34 | +0.09 |
| PEO | 0.05 | 3.85 | -3.80 |

Lectura rápida:

- Go sigue muy por debajo de Matlab en `PPE` y `PEO`.
- Go muestra `PSCE` y `EE` mayores, consistente con una cohorte de titulados más pequeña y más tardía.
- La brecha principal que sigue abierta para convergencia con el original está en la tasa de titulación y el egreso oportuno.
