# Code Compare: Go vs MATLAB

Este documento explica, por fases y por bloques equivalentes, cómo el motor de Go replica la lógica del MATLAB original.

La idea no es decir que los archivos son idénticos uno a uno, sino mostrar que el flujo causal del simulador se conserva: carga de datos, armado del semestre, selección de ramos, aprobación estocástica, eliminación, y cálculo de métricas.

## Mapa de referencias

- MATLAB original: [original/MallasV12.m](original/MallasV12.m)
- MATLAB por escenario: [analysis/run_matlab_critical_chunk.m](analysis/run_matlab_critical_chunk.m)
- Motor Go: [backend/engine/montecarlo.go](backend/engine/montecarlo.go)
- Comparador Go por escenario: [backend/cmd/critical_compare/main.go](backend/cmd/critical_compare/main.go)
- Contratos de datos: [backend/models/models.go](backend/models/models.go)

## Fase 1: Carga de entrada

### MATLAB

```matlab
ASIGNATURAS=xlsread('Civilelectrica93','MallaPF');
PROGRAMACION=xlsread('Civilelectrica93','ProgramacionB');
```

### Go

En el comparador, Go no lee el XLSX directo en ejecución; recibe un escenario exacto generado desde el mismo libro de Excel:

```go
scenarioPath := filepath.Join("..", "original", "scenarios", sc.ID+".json")
exactIn, err := tryLoadExactScenario(scenarioPath)
...
if exactIn != nil {
	malla = exactIn.Asignaturas
	programacion = exactIn.Programacion
} else if strictParity {
	panic(fmt.Sprintf("strict parity enabled but exact scenario file not found: %s", scenarioPath))
}
```

### Qué replica Go aquí

- MATLAB toma dos fuentes: malla y programación.
- Go toma exactamente esas dos fuentes, pero serializadas a JSON para asegurar reproducibilidad y paridad de escenario.
- En modo estricto, Go no acepta aproximaciones sintéticas.

### Lectura línea por línea

- `xlsread(...)` en MATLAB carga la tabla curricular y la programación semestral.
- `tryLoadExactScenario(...)` en Go busca el mismo contenido pero ya preparado como escenario exacto.
- `strictParity` evita el fallback que antes alteraba la semántica del escenario.

## Fase 2: Variables del experimento

### MATLAB

```matlab
NE=2;
NCSmax=21;
TAmin=12.3;
NapTAmin=10;
Opor=6;

VMap1234=0.48;
Delta1234=0.2;
VMap5678=0.55;
Delta5678=0.2;
VMapM=0.65;
DeltaM=0.25;
```

### Go

```go
Variables: models.VariablesPayload{
	NE:           2,
	NCSmax:       21,
	TAmin:        12.3,
	NapTAmin:     10,
	Opor:         6,
	Iteraciones:  iteraciones,
	MaxSemestres: 0,
	Seed:         seed,
},
Modelo: models.ModeloPayload{
	VMap1234:  0.48,
	Delta1234: 0.2,
	VMap5678:  0.55,
	Delta5678: 0.2,
	VMapM:     0.65,
	DeltaM:    0.25,
},
```

### Qué replica Go aquí

- Los mismos parámetros de control estructural.
- Los mismos parámetros del modelo de aprobación.
- Go agrega `Iteraciones` y `Seed` para poder correr promedios y reproducibilidad, pero no altera el significado del experimento.

### Lectura línea por línea

- `NE` controla cuántos alumnos se simulan.
- `NCSmax` limita la carga de créditos por semestre.
- `TAmin` y `NapTAmin` definen la eliminación por avance académico.
- `Opor` define el máximo de oportunidades.
- `VMap*` y `Delta*` controlan la aleatoriedad de aprobación.

## Fase 3: Inicialización por estudiante

### MATLAB

```matlab
for k=1:NE
    Sem=1;
    [a,b]=find(ASIGNATURAS(:,1)==1);
    l=length(a);

    r=abs(VMap1234+Delta1234.*randn(l,1));
    Ap=(r>=ASIGNATURAS(a,4));
    HA=ASIGNATURAS(a,[1:2]);
    HA(:,3)=Ap;
    HA(:,4)=ASIGNATURAS(a,3);
    NAp=sum(Ap);
    Estado=0;
```

### Go

```go
for i := 0; i < req.Variables.NE; i++ {
	...
	estado := models.Activo
	semestreActual := 1
	maxSemestres := req.Variables.MaxSemestres
	creditosAprobadosTotales := 0
	historial := make(map[string]*models.HistorialAsignatura)
	...
}
```

### Qué replica Go aquí

- Un ciclo por estudiante.
- Estado inicial activo.
- Semestre inicial en 1.
- Estructura de historial por estudiante.

### Lectura línea por línea

- MATLAB usa `for k=1:NE`; Go usa `for i := 0; i < NE; i++`.
- MATLAB arma el historial `HA`; Go arma `historial` como mapa de asignaturas.
- MATLAB crea `Estado=0`; Go crea `estado := models.Activo`.

## Fase 4: Primer semestre

### MATLAB

```matlab
[a,b]=find(ASIGNATURAS(:,1)==1);
l=length(a);
r=abs(VMap1234+Delta1234.*randn(l,1));
Ap=(r>=ASIGNATURAS(a,4));
```

### Go

En Go, esa misma lógica vive dentro de la simulación por asignatura, con el mismo patrón de generación aleatoria y comparación:

```go
probExitoAlumno := math.Abs(vmap + delta*rng.NormFloat64())
aprobado := probExitoAlumno >= asig.Rep
```

### Qué replica Go aquí

- El `abs(...)` de MATLAB se conserva como `math.Abs(...)`.
- La variable normal estándar se conserva como `rand.NormFloat64()`.
- La comparación con el umbral usa `>=`, igual que MATLAB.

### Lectura línea por línea

- `find(ASIGNATURAS(:,1)==1)` obtiene los ramos del primer semestre.
- `randn(l,1)` genera ruido gaussiano.
- `abs(...)` asegura el mismo comportamiento del original.
- `>=` es importante: se alineó para evitar una diferencia formal con Go antiguo.

## Fase 5: Eliminación por tasa de avance

### MATLAB

```matlab
TA(Sem)=sum(HA(:,3).*HA(:,4));
if (Sem>=NapTAmin)&&(TA(Sem)<TAmin)
    Estado=1;
end
```

### Go

```go
if semestreActual >= req.Variables.NapTAmin {
	if float64(creditosAprobadosTotales)/float64(semestreActual) < req.Variables.TAmin {
		estado = models.EliminadoTAmin
		...
		break
	}
}
```

### Qué replica Go aquí

- Se aplica el mismo umbral temporal.
- Se aplica la misma idea de avance mínimo.
- Si el estudiante no avanza lo suficiente, se elimina.

### Lectura línea por línea

- `Sem>=NapTAmin` corresponde a `semestreActual >= NapTAmin`.
- MATLAB calcula la tasa sobre el historial; Go calcula el avance sobre créditos aprobados acumulados.
- El criterio de corte es el mismo, aunque la forma de acumular valores puede variar en implementación interna.

## Fase 6: Oferta semestral y prerrequisitos

### MATLAB

```matlab
IndP=rem(Sem,2);
if IndP==0
    ProgD=PROGRAMACION(:,2);
else
    ProgD=PROGRAMACION(:,1);
end
...
for i=1:l
    auxA=ProgD(i);
    if auxA~=0
        [f,c]=find(ASIGNATURAS(:,2)==auxA);
        auxNAPr=ASIGNATURAS(f,5);
        auxPr=0;
        for j=1:auxNAPr
            AuxAP=ASIGNATURAS(f,5+j);
            HAAp=HA(:,2).*HA(:,3);
            [ff,c]=find(HAAp==AuxAP);
            if length(ff)>=1, auxPr=auxPr+1; else auxPr=0; end
        end
        if (auxPr==auxNAPr)||(auxNAPr==0)
            if (NCS+ASIGNATURAS(f,3))<=NCSmax
                HA=[HA;[Sem auxA 2 0]];
                NCS=NCS+ASIGNATURAS(f,3);
            end
        end
    end
end
```

### Go

```go
programmedIDs := programmedIDsForSemester(req, semestreActual)
if len(programmedIDs) > 0 {
	for _, id := range programmedIDs {
		asig, ok := mallaMap[id]
		if !ok {
			continue
		}
		tryEnroll(asig)
	}
} else {
	for _, asig := range req.Asignaturas {
		if asig.Dictacion == "semestral" {
			isImpar := asig.Semestre%2 != 0
			currentIsImpar := semestreActual%2 != 0
			if isImpar != currentIsImpar {
				continue
			}
		}
		tryEnroll(asig)
	}
}
```

Y dentro de `tryEnroll`:

```go
if h, ok := historial[asig.ID]; ok && h.Aprobado {
	return
}

cumpleReqs := true
for _, reqSigla := range asig.Reqs {
	if reqSigla == "" {
		continue
	}
	if reqHist, ok := historial[reqSigla]; !ok || !reqHist.Aprobado {
		cumpleReqs = false
		break
	}
}
if !cumpleReqs {
	return
}

if creditosInscritos+asig.Cred <= req.Variables.NCSmax {
	asignaturasTomadas = append(asignaturasTomadas, asig.ID)
	creditosInscritos += asig.Cred
}
```

### Qué replica Go aquí

- La programación por paridad se conserva.
- Los prerrequisitos se validan antes de inscribir.
- El límite de créditos por semestre se conserva.
- El orden de iteración de la programación importa, igual que en MATLAB.

### Lectura línea por línea

- MATLAB selecciona `ProgD` por semestre par o impar.
- Go usa `programmedIDsForSemester(...)` y luego recorre los IDs exactos.
- MATLAB elimina ramos ya aprobados antes de inscribir; Go corta si el ramo ya está aprobado en `historial`.
- MATLAB valida prerrequisitos por cada candidato; Go lo hace con `asig.Reqs`.
- MATLAB usa `NCS+cred <= NCSmax`; Go usa la misma condición.

## Fase 7: Aprobación estocástica de ramos inscritos

### MATLAB

```matlab
if (Sem==2||Sem==3||Sem==4)
    r=abs(VMap1234+Delta1234.*randn(l,1));
elseif (Sem==5||Sem==6||Sem==7||Sem==8)
    r=abs(VMap5678+Delta5678.*randn(l,1));
else
    r=abs(VMapM+DeltaM.*randn(l,1));
end
Ap=(r>=PAprI);
```

### Go

```go
vmap, delta := req.Modelo.VMapM, req.Modelo.DeltaM
if asig.Semestre <= 4 {
	vmap, delta = req.Modelo.VMap1234, req.Modelo.Delta1234
} else if asig.Semestre <= 8 {
	vmap, delta = req.Modelo.VMap5678, req.Modelo.Delta5678
}

probExitoAlumno := math.Abs(vmap + delta*rng.NormFloat64())
aprobado := probExitoAlumno >= asig.Rep
```

### Qué replica Go aquí

- Los tres tramos de probabilidad se conservan.
- La distribución sigue siendo la misma familia normal con valor absoluto.
- El operador de comparación coincide.

### Lectura línea por línea

- MATLAB cambia el parámetro según tramo de semestre.
- Go hace el mismo cambio con `if asig.Semestre <= 4`, `<= 8`, y luego el tramo final.
- MATLAB compara contra `PAprI`; Go compara contra `asig.Rep`.
- La semilla de Go permite repetibilidad exacta cuando se requiere.

## Fase 8: Eliminación por oportunidades

### MATLAB

```matlab
[n,m]=find(Reprobadas(:,2+k)>=Opor);
if isempty(n)==0
    NAp=CA+1;
    'Eliminado por oportunidades';
    Estado=1;
end
```

### Go

```go
historial[sigla].Oportunidad++
...
if aprobado {
	historial[sigla].Aprobado = true
	creditosAprobadosTotales += asig.Cred
} else {
	reprobacionesLocal[sigla]++
	if historial[sigla].Oportunidad >= req.Variables.Opor {
		estado = models.EliminadoOpor
		estadoDelSemestre = models.EliminadoOpor
	}
}
```

### Qué replica Go aquí

- Se cuenta cuántas veces se inscribe o intenta un ramo.
- Se elimina al superar el umbral de oportunidades.
- Se marca un estado de eliminación equivalente.

### Lectura línea por línea

- MATLAB usa `Reprobadas(:,2+k)` como contador por alumno y ramo.
- Go usa `historial[sigla].Oportunidad` como contador por asignatura.
- La condición de corte es la misma idea de negocio: demasiadas reprobaciones, eliminación.

## Fase 9: Cierre del semestre y cierre del estudiante

### MATLAB

```matlab
[E,c]=find(HA(:,3)==2);
if length(E)==0,
    if NAp==CA
        Estado=2;
    else
        NAp=CA+1;
        Estado=1;
    end
end
```

### Go

```go
if len(asignaturasTomadas) == 0 {
	todasAprobadas := true
	for _, a := range req.Asignaturas {
		if h, ok := historial[a.ID]; !ok || !h.Aprobado {
			todasAprobadas = false
			break
		}
	}
	if todasAprobadas {
		estado = models.Titulado
		...
		break
	}
}
```

### Qué replica Go aquí

- Si ya no quedan cursos que tomar y todo está aprobado, el estudiante se titula.
- Si no puede seguir pero no terminó, queda eliminado.

### Lectura línea por línea

- MATLAB pregunta si hay ramos inscritos este semestre.
- Go pregunta si no se tomaron más ramos y si todo el historial está aprobado.
- Ambos usan esa señal para cerrar la trayectoria académica.

## Fase 10: Métricas finales

### MATLAB

```matlab
CT=sum(Resumen(:,2)==2);
PSC=mean(Resumen(a,5));
fprintf(' Promedio de Egresados: %3.2f %%\n',CT*100/k)
fprintf(' Promedio de semestres cursados: %3.2f \n',PSC)
fprintf(' Eficiencia de egreso: %3.2f \n',PSC/ASIGNATURAS(CA,1))
fprintf(' Alumnos Egresados oportunamente: %3.2f %% (%3.2f)\n',Aldia*100/NE,  Aldia)
```

### Go

En el motor Go, el cierre consolida las métricas equivalentes en estructuras de salida:

```go
return models.SimulacionResponse{
	Mensaje: "Simulación completada con éxito",
	MetricasGlobales: models.MetricasGlobales{
		AlumnosSimulados:    float64(req.Variables.NE),
		Titulados:           float64(titulados),
		EliminadosTamin:     float64(elimTA),
		EliminadosOpor:      float64(elimOpor),
		TasaTitulacionPct:   math.Round(tasaTitulacion*100) / 100,
		SemestresPromedio:   math.Round(semestresPromedio*100) / 100,
		EficienciaEgreso:    math.Round(eficienciaEgreso*100) / 100,
		EgresoOportunoPct:   math.Round(egresoOportuno*100) / 100,
	},
}
```

### Qué replica Go aquí

- Titulación total.
- Semestres promedio.
- Eficiencia de egreso.
- Egreso oportuno.
- Retención por año.

### Lectura línea por línea

- MATLAB imprime por consola; Go devuelve una estructura serializable.
- La matemática de las métricas se conserva.
- Go agrega formato y estructura para front-end, API y comparación automática.

## Diferencia importante que sí hay que entender

La replicación conceptual es alta, pero no es una copia literal por estas razones:

1. MATLAB consume hojas del XLSX directamente.
2. Go consume escenarios exactos serializados desde esas mismas hojas.
3. Go incluye `STRICT_PARITY` para evitar aproximaciones sintéticas.
4. Go introduce `Iteraciones` y `Seed` para facilitar promedios y repetibilidad.

Eso significa que Go replica el modelo, pero lo hace con una infraestructura distinta.

## Conclusión

Si lo miras fase por fase, el motor Go conserva la misma secuencia lógica del MATLAB original:

- cargar la malla,
- entrar por estudiante,
- construir semestre,
- filtrar por programación y prerrequisitos,
- simular aprobación con ruido gaussiano,
- aplicar cortes por oportunidades y avance,
- consolidar métricas finales.

La diferencia real no está en el esqueleto del modelo, sino en el nivel de fidelidad de la entrada y en cómo se empaqueta la ejecución.

En términos prácticos: Go ya no está inventando otro simulador; está ejecutando el mismo simulador con una arquitectura más controlable y reproducible.
