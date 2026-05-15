💿
📅
---

# Análisis de Conjuntos de Datos: Simulador de Malla Curricular (Ingeniería Civil Eléctrica DRA 92/93)

Los archivos CSV proporcionados conforman la base de datos estructural y paramétrica que alimenta el modelo de simulación de Montecarlo para el avance académico de los estudiantes. Cada archivo representa una matriz de datos específica, ya sea la malla curricular base, la programación académica de asignaturas o las alteraciones probabilísticas para cada uno de los escenarios de estudio.

Dado el contexto del estudio y la nomenclatura de los archivos, a continuación se detalla exhaustivamente el contenido, propósito y las variables que estructuran cada uno de estos documentos.

## 1. Archivos Base del Modelo (Situación Actual)

Estos archivos establecen las condiciones iniciales de la simulación, reflejando el comportamiento histórico real de los estudiantes y las reglas de docencia vigentes.

* **`Civilelectrica93.xlsx - Malla.csv` (Malla Curricular Base)**
    * **Descripción:** Contiene la estructura oficial del plan de estudios (DRA 92/93).
    * **Valores y Variables Clave:**
        * `Código de Asignatura` (ej. MAT-113, EIE-140).
        * `Créditos` (peso académico de la asignatura).
        * `Semestre Teórico` (del 1 al 12).
        * `Prerrequisitos` (códigos de asignaturas que bloquean el avance).
        * `Tasa de Aprobación Histórica (Media)` y `Desviación Estándar` (valores base entre 48% y 65% dependiendo del año de la carrera).
* **`Civilelectrica93.xlsx - ProgramacionB.csv` (Programación Base)**
    * **Descripción:** Define en qué semestres del año académico se dicta realmente cada asignatura.
    * **Valores y Variables Clave:**
        * Matriz booleana o categórica (ej. Semestre Impar, Semestre Par, Ambos).
        * Refleja que, en el caso actual, solo 37 asignaturas se dictan de manera semestral (en ambos semestres del año), mientras que el resto son anuales.

## 2. Archivos de Modificación de Tasas de Aprobación (Escenarios Académicos)

Estos documentos alteran los porcentajes de aprobación de la `Malla.csv` original para simular impactos en el rendimiento estudiantil (metodologías de enseñanza, dificultad, etc.).

* **`Civilelectrica93.xlsx - Mallaideal.csv` (Escenario CI)**
    * **Descripción:** Representa el escenario de control ideal.
    * **Valores:** La variable `Tasa de Aprobación Histórica` de todas las asignaturas está fijada en `1.0` (100%), con desviación estándar `0`.
* **`Civilelectrica93.xlsx - Malla10me.csv` (Escenario R-10)**
    * **Descripción:** Simula una mejora general en el rendimiento.
    * **Valores:** La tasa de reprobación de **todas** las asignaturas se reduce en un 10% (es decir, la tasa de aprobación media aumenta de forma generalizada).
* **`Civilelectrica93.xlsx - Malla10ma.csv` (Escenario R+10)**
    * **Descripción:** Simula un empeoramiento en el rendimiento general.
    * **Valores:** La tasa de reprobación de todas las asignaturas se incrementa en un 10% respecto a los datos históricos.
* **`Civilelectrica93.xlsx - MallaMat.csv` (Escenario R-10Mat)**
    * **Descripción:** Focaliza la mejora académica solo en ciencias básicas.
    * **Valores:** Únicamente las asignaturas del área de matemáticas (ej. MAT-113, MAT-117, MAT-215) presentan una reducción del 10% en su tasa de reprobación. El resto mantiene los valores de `Malla.csv`.
* **`Civilelectrica93.xlsx - MallaR1050.csv` (Escenario R-10>40)**
    * **Descripción:** Focaliza la mejora en los "ramos críticos".
    * **Valores:** Identifica las 11 asignaturas que históricamente tienen una tasa de reprobación superior al 40% y les aplica una mejora (reducción de reprobación) del 10%.

## 3. Archivos de Modificación de Oferta Académica (Escenarios de Gestión)

Estos archivos alteran la disponibilidad temporal de las asignaturas, probando diferentes decisiones de la Unidad de Docencia.

* **`Civilelectrica93.xlsx - ProgramacionPE.csv` (Escenario PE)**
    * **Descripción:** Una oferta académica rígida.
    * **Valores:** Las asignaturas se habilitan para ser cursadas **estrictamente** en el semestre impar o par que dicta la malla teórica, eliminando la flexibilidad.
* **`Civilelectrica93.xlsx - ProgramacionS.csv` (Escenario CAS)**
    * **Descripción:** Flexibilidad máxima.
    * **Valores:** Todas las asignaturas de la malla cambian su estado a "dictación semestral" (disponibles en ambos semestres del año).
* **`Civilelectrica93.xlsx - ProgramacionP.csv` (Escenario 4AS)**
    * **Descripción:** Intervención estratégica de docencia.
    * **Valores:** Toma la `ProgramacionB.csv` y modifica específicamente 4 asignaturas críticas que son prerrequisitos fuertes (EIE252, EIE351, EIE446 y ICA415), pasando su disponibilidad de anual a semestral.

## 4. Archivo del Escenario Óptimo

* **`Civilelectrica93.xlsx - MallaPF.csv` (Propuesta Final - Escenario PF)**
    * **Descripción:** Es el conjunto de datos definitivo que integra las mejores medidas descubiertas por la simulación para maximizar el egreso.
    * **Valores y Variables Clave Integradas:**
        * Toma las tasas de aprobación de `MallaR1050.csv` (mejora en ramos críticos).
        * Adopta la matriz de disponibilidad de `ProgramacionP.csv` (4 asignaturas extra dictadas semestralmente).
        * Considera un ajuste en la variable de "límite de créditos por semestre" (típicamente evaluado en el algoritmo central), aumentando la carga máxima permitida para los estudiantes.