
# Reseña y Análisis Detallado: Simulación del Desempeño de Estudiantes

[cite_start]El artículo "SIMULACIÓN DEL DESEMPEÑO DE LOS ESTUDIANTES EN EL PLAN DE ESTUDIO DE LA CARRERA DE INGENIERÍA CIVIL ELÉCTRICA" fue desarrollado por Jorge Mendoza Baeza, perteneciente a la Escuela de Ingeniería Eléctrica de la Pontificia Universidad Católica de Valparaíso (PUCV)[cite: 4, 12]. [cite_start]Este trabajo fue publicado en el *Journal of Engineering Research* en su volumen 3, número 25, correspondiente al año 2023[cite: 1, 2, 3].

## Resumen del Estudio
* [cite_start]El avance y desempeño universitario no dependen exclusivamente del alumno, sino también de la estructura del plan de estudios, los prerrequisitos, los reglamentos y la oferta de asignaturas[cite: 15, 16].
* [cite_start]Para evaluar el impacto de distintas decisiones administrativas, el autor diseñó un modelo de simulación de avance académico fundamentado en datos históricos y en el método de Montecarlo[cite: 17].
* [cite_start]La evaluación del desempeño se midió a través de cuatro indicadores principales: el porcentaje de egresados, el tiempo promedio para egresar, la eficiencia de titulación y el porcentaje de egreso oportuno[cite: 18].
* [cite_start]Al ejecutar este modelo con distintas acciones propuestas, se evidenciaron mejoras significativas en los indicadores de salida en comparación con la situación original de la carrera[cite: 19].

## Contexto Curricular e Institucional
* [cite_start]Los programas formativos universitarios se estructuran usualmente en cuatro pilares: Proyecto Formativo, Perfil de Egreso, Plan de Estudio y Programas de las asignaturas[cite: 22, 23].
* [cite_start]La carrera de Ingeniería Civil Eléctrica en Chile se extiende tradicionalmente por 12 semestres, abarcando áreas de ciencias básicas, ciencias de la ingeniería, formación profesional específica y formación general[cite: 38, 39, 40].
* [cite_start]Según datos del Servicio de Información de Educación Superior (SIES) del país, la duración real promedio de esta carrera a nivel nacional asciende a 17.48 semestres, situándola entre los programas más extensos[cite: 41].
* [cite_start]En la PUCV, la carrera se rige por el decreto DRA 92/93, exigiendo la aprobación de 62 asignaturas que suman un total de 222 créditos curriculares[cite: 43, 44].
* [cite_start]La carrera presenta una demanda que triplica sus vacantes; sin embargo, entre 2012 y 2016 la tasa de titulación oportuna fue de apenas 11%, y el tiempo de egreso promedió los 7.2 años[cite: 46, 47].
* [cite_start]Existe una dificultad académica notable: cerca del 40% de las asignaturas cuenta con tasas de aprobación por debajo del 70%, siendo las áreas de matemáticas en los primeros años las que registran mayor reprobación[cite: 48].

## Diseño del Modelo de Simulación
* [cite_start]El avance semestral está delimitado por topes mínimos y máximos de créditos, sumado a las cadenas de prerrequisitos de cada materia[cite: 51].
* [cite_start]El modelo computacional fue construido en el entorno de Matlab y se alimentó con datos institucionales de cuatro cohortes de estudiantes ingresados entre los años 2003 y 2007[cite: 216, 227].
* [cite_start]Se estableció un tope máximo de 21 créditos por semestre por estudiante, así como un máximo de 4 oportunidades para cursar una misma asignatura antes de la eliminación[cite: 230, 238].
* [cite_start]El algoritmo asignó de manera probabilística la aprobación de cada ramo usando una distribución normal ajustada al nivel de la carrera (por ejemplo, años 1 y 2 con una media de 0.48 y desviación de 0.20)[cite: 242, 246].
* [cite_start]Para asegurar la validez estadística de los resultados, la simulación de Montecarlo se ejecutó con 15.000 iteraciones[cite: 241].
* [cite_start]Los parámetros de salida definidos fueron: Porcentaje Promedio de Egresados (PPE), Promedio de Semestres Cursados para Egreso (PSCE), Eficiencia de Egreso (EE) y Porcentaje de Egresados Oportunamente (PEO)[cite: 222, 223, 224, 225].

## Análisis de los Casos Simulados
[cite_start]La simulación inicial ("Caso Actual") arrojó una base preocupante: un PPE de 37.13%, un tiempo de egreso de 15.96 semestres (PSCE) y un PEO de tan solo 4.04%[cite: 243, 244]. A partir de esto, se probaron distintas alternativas:

* [cite_start]**Asignaturas dictadas según Plan de estudios (PE):** Obligar a dictar ramos solo en el semestre que indica la malla reduce drásticamente los egresados en un 25.94%[cite: 258, 259].
* [cite_start]**Asignaturas dictadas semestralmente (CAS):** Impartir todas las asignaturas cada semestre incrementa los egresados en un 10% y mejora la eficiencia en un 3.7%[cite: 260, 261].
* [cite_start]**Mejora en aprobación general (R-10):** Si se reduce la reprobación un 10% en todas las asignaturas, los egresados saltan a un 62.21% y el egreso oportuno sube a 12.14%[cite: 266, 267].
* [cite_start]**Focalización en matemáticas (R-10Mat):** Reducir un 10% la reprobación exclusivamente en matemáticas logra un 52.89% de titulados y 7.65% de titulación oportuna[cite: 272, 273].
* [cite_start]**Focalización en ramos críticos (R-10>40):** Bajar un 10% la reprobación solo en las 11 asignaturas con más del 40% de fracaso eleva los egresados a un 58.3%[cite: 278, 279, 280].
* [cite_start]**Alteración de prerrequisitos:** Eliminar los requisitos de MAT117 subió los egresados al 51.65%, mientras que hacer lo mismo con FIS334 no generó cambios relevantes, demostrando que no todos los ramos impactan igual en la malla[cite: 281, 282, 283, 284].
* [cite_start]**Incorporación de ramos anuales (4AS):** Pasar las asignaturas EIE252, EIE351, EIE446 y ICA415 de régimen anual a semestral mejoró en un 6.33% el porcentaje de egresados[cite: 288, 289, 290].
* [cite_start]**Propuesta Final (PF):** La combinación de dictar ramos críticos semestralmente, bajar la reprobación de asignaturas de alto riesgo y ampliar la toma de créditos elevó el porcentaje de egresados al 75.11%, disminuyó el tiempo de estudio en 1.39 semestres y disparó los egresos oportunos al 24.7%[cite: 291, 292, 293, 297].

## Conclusiones Relevantes
* [cite_start]El ajuste estadístico mediante Montecarlo probó ser altamente efectivo para emular el comportamiento histórico del avance curricular de las cinco cohortes analizadas[cite: 305, 306].
* [cite_start]De implementarse la "Propuesta Final", la carrera podría prácticamente duplicar su cantidad de egresados y mejorar sus indicadores institucionales a través de medidas de gestión que el autor considera factibles[cite: 309, 310].
* [cite_start]Este modelo se erige como una herramienta de toma de decisiones sumamente útil para las escuelas de ingeniería, permitiendo anticipar los efectos de cualquier modificación en la malla antes de aplicarla a los estudiantes[cite: 311].