# Paper Results - Baseline para validacion MATLAB vs Go

Fecha: 2026-04-15

Fuentes analizadas:
- PDF: simulacion-del-desempeno-de-los-estudiantes-en-el-plan-de-estudio-de-la-carrera-de-ingenieria-civil-electrica (1).pdf
- XLSX: Civilelectrica93.xlsx
- Script original: MallasV12.m

## 1) Malla ICE en formato SimulaPUCV (referencia)

La malla completa en formato SimulaPUCV se mantiene en:
- original/_malla_simulapucv_base.json

Resumen de esa malla:
- 62 asignaturas
- 12 semestres
- Incluye `dictacion` inferida desde ProgramacionB (semestral/anual)
- Conserva asignaturas con `rep = 0` cuando corresponde (ramos sin reprobacion historica)

## 2) Malla por defecto real y validacion de consistencia con escenarios

Validacion de malla por defecto usando MallasV12.m:
- El script carga por defecto:
  - `ASIGNATURAS = xlsread('Civilelectrica93','Malla')`
  - `PROGRAMACION = xlsread('Civilelectrica93','ProgramacionB')`
- Por lo tanto, el escenario base/default del modelo original es:
  - `Malla` + `ProgramacionB` = `Caso Actual`

Chequeo por patron de reprobacion para asegurar mapeo de hojas:
- `Mallaideal`: todas las tasas de reprobacion en 0 (escenario ideal CI)
- `Malla10me`: reprobacion global menor que `Malla` (R-10)
- `Malla10ma`: reprobacion global mayor que `Malla` (R+10)
- `MallaMat`: ajuste focalizado de matematicas (R-10Mat)
- `MallaR1050`: ajuste focalizado en ramos de alta reprobacion (R-10>40)
- `MallaPF`: combinacion final de intervenciones (PF)

Conclusión:
- La malla default correcta para comparar contra el paper es la hoja `Malla` (no PF, no Malla10me, etc.).

## 3) Parametros utilizados en el paper y sus valores

Estos valores aparecen en `MallasV12.m` y coinciden con la descripcion metodologica del paper.

### 3.1 Parametros globales de simulacion

| Parametro | Valor | Observacion |
|---|---:|---|
| `NE` | 2 | Numero de estudiantes usado en el script de referencia |
| `NCSmax` | 21 | Tope maximo de creditos semestrales |
| `TAmin` | 12.3 | Tasa minima de avance |
| `NapTAmin` | 10 | Semestre a partir del cual se aplica `TAmin` |
| `Opor` | 6 | Maximo de oportunidades para reprobar un ramo |

### 3.2 Parametros del modelo de calificaciones

| Parametro | Valor | Rango / uso |
|---|---:|---|
| `VMap1234` | 0.48 | Media de aprobacion para semestres 1 a 4 |
| `Delta1234` | 0.20 | Desviacion para semestres 1 a 4 |
| `VMap5678` | 0.55 | Media de aprobacion para semestres 5 a 8 |
| `Delta5678` | 0.20 | Desviacion para semestres 5 a 8 |
| `VMapM` | 0.65 | Media de aprobacion para semestres superiores |
| `DeltaM` | 0.25 | Desviacion para semestres superiores |

### 3.3 Parametros de corrida y metricas objetivo

| Parametro | Valor | Observacion |
|---|---:|---|
| Iteraciones Montecarlo | 15.000 | Valor indicado en el paper para asegurar validez estadistica |
| `PPE` | 37.13% | Caso actual, porcentaje promedio de egresados |
| `PSCE` | 15.96 semestres | Caso actual, promedio de semestres cursados para egreso |
| `EE` | 1.33 | Caso actual, eficiencia de egreso |
| `PEO` | 4.04% | Caso actual, egreso oportuno |

### 3.4 Reglas operativas relevantes del modelo

| Regla | Valor |
|---|---|
| Periodicidad del avance | Semestral |
| Criterio de aprobacion por ramo | `abs(media + delta * randn)` comparado con la tasa de reprobacion del ramo |
| Regla de eliminacion por avance | Se evalua desde el semestre `NapTAmin` si `TA < TAmin` |
| Regla de eliminacion por oportunidades | Se elimina al superar `Opor` reprobaciones en un mismo ramo |

## 3) Cruce XLSX -> Escenario paper -> Resultados paper

### 3.1 Hojas Malla*

| Hoja XLSX | Escenario paper equivalente | PPE | PSCE | EE | PEO |
|---|---:|---:|---:|---:|---:|
| Malla | Caso Actual | 37.13 | 15.96 | 1.33 | 4.04 |
| Mallaideal | CI - Asignaturas con 100% de aprobacion | 100.00 | 12.00 | 1.00 | 100.00 |
| Malla10me | R-10 - Reducir 10% reprobacion global | 62.21 | 15.65 | 1.30 | 12.14 |
| Malla10ma | R+10 - Aumentar 10% reprobacion global | 16.56 | 16.25 | 1.35 | 0.89 |
| MallaMat | R-10Mat - Reducir 10% reprobacion en matematicas | 52.89 | 15.83 | 1.32 | 7.65 |
| MallaR1050 | R-10>40 - Reducir 10% en ramos > 40% reprobacion | 58.30 | 15.73 | 1.31 | 10.06 |
| MallaPF | PF - Propuesta Final | 75.11 | 14.57 | 1.21 | 24.70 |

### 3.2 Hojas Programacion*

| Hoja XLSX | Escenario paper equivalente | PPE | PSCE | EE | PEO |
|---|---:|---:|---:|---:|---:|
| ProgramacionB | Caso Actual (base de oferta) | 37.13 | 15.96 | 1.33 | 4.04 |
| ProgramacionPE | PE - Dictacion segun plan estricto | 11.19 | 16.51 | 1.38 | 1.09 |
| ProgramacionS | CAS - Dictacion semestral completa | 47.46 | 15.32 | 1.28 | 7.95 |
| ProgramacionP | 4AS - 4 asignaturas adicionales semestrales | 43.46 | 15.80 | 1.32 | 4.79 |

Notas:
- Las metricas son de la Tabla 5 del paper.
- Hay escenarios del paper que modifican logica/parametros y no tienen hoja XLSX propia (por ejemplo NOp6, eliminar prerrequisitos de MAT117/FIS334).

## 4) Replica de la tabla de resultados del paper (Tabla 5)

| Caso | PPE | PSCE | EE | PEO |
|---|---:|---:|---:|---:|
| Caso Actual | 37.13 | 15.96 | 1.33 | 4.04 |
| Asignaturas con 100% de aprobacion (CI) | 100.00 | 12.00 | 1.00 | 100.00 |
| Asignaturas con 100% de aprobacion y 25 creditos maximos semestrales (CI2) | 100.00 | 11.00 | 1.00 | 100.00 |
| Asignaturas dictadas segun plan de estudios (PE) | 11.19 | 16.51 | 1.38 | 1.09 |
| Asignaturas del plan de estudios dictadas semestralmente (CAS) | 47.46 | 15.32 | 1.28 | 7.95 |
| Aumento del numero maximo de oportunidades por asignatura (NOp6) | 39.32 | 15.99 | 1.33 | 4.15 |
| Reduccion de la tasa de reprobacion en 10% de todas las asignaturas (R-10) | 62.21 | 15.65 | 1.30 | 12.14 |
| Aumento de la tasa de reprobacion de las asignaturas en 10% (R+10) | 16.56 | 16.25 | 1.35 | 0.89 |
| Reduccion en 10% de la tasa de reprobacion de matematicas (R-10Mat) | 52.89 | 15.83 | 1.32 | 7.65 |
| Reduccion en 10% de la tasa de reprobacion en asignaturas con >40% (R-10>40) | 58.30 | 15.73 | 1.31 | 10.06 |
| Eliminar prerrequisitos de MAT117 | 51.65 | 15.86 | 1.32 | 6.90 |
| Eliminar prerrequisitos de FIS334 | 38.15 | 15.99 | 1.33 | 4.10 |
| Reducir 10% repro. en EIE252 y EIE459 | 40.47 | 15.96 | 1.33 | 4.39 |
| Incorporar 4 asignaturas a la programacion semestral (4AS) | 43.46 | 15.80 | 1.32 | 4.79 |
| Propuesta Final (PF) | 75.11 | 14.57 | 1.21 | 24.70 |

## 5) Criterio de comparacion para proxima etapa (MATLAB vs Go)

- Delta PPE = PPE_go - PPE_paper
- Delta PSCE = PSCE_go - PSCE_paper
- Delta EE = EE_go - EE_paper
- Delta PEO = PEO_go - PEO_paper
