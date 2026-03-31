% PROGRAMA DE SIMULACIÓN DE CARRERAS
% JORGE MENDOZA BAEZA
% FECHA 03 JULIO 2018
% 20 JULIO 2023

clear 
%clc
% LECTURA DE LA MALLA
%eval('Civilelectrica93'), 
ASIGNATURAS=xlsread('Civilelectrica93','Malla');  % Lectura de asignaturas
PROGRAMACION=xlsread('Civilelectrica93','ProgramacionB'); %Lectura de programacion de docencia semestral
  
% VARIABLES DE SIMULACIÓN
NE=2;      %Numero de estudiantes
NCSmax=21;  % Número de créditos semestrales máximos
TAmin=12.3; % Tasa de avance mínima
NapTAmin=10; % Semestre aplicación de tasa de avance 
Opor=6;     % Numero maximo de oportunidades para reprobar un ramo

% MODELO DE CALIFICACIONES
VMap1234=0.48;   % Valor medio de aprobación  r=VMap1+Delta1.*randn(l,1) por semestre
Delta1234=0.2;  %Variacion de la aprobación por semestre
VMap5678=0.55;   % Valor medio de aprobación  r=VMap1+Delta1.*randn(l,1) por semestre
Delta5678=0.2;  %Variacion de la aprobación por semestre
VMapM=0.65;   % Valor medio de aprobación  r=VMap1+Delta1.*randn(l,1) por semestre
DeltaM=0.25;  %Variacion de la aprobación por semestre

%INICIALIZACIÓN DE VARIABLES
Resumen=[];         
[CA,T]=size(ASIGNATURAS);           % Cantidad de asignaturas
Reprobadas=ASIGNATURAS(:,2);        % Guardar el nombre de las  asignaturas para reprobación
Reprobadas(1,2+NE)=0;                  % Ajuste para crear matriz

% CICLO PARA EL NÚMERO DE ESTUDIANTES

for k=1:NE

    % EVOLUCIÓN DEL PRIMER SEMESTRE
    Sem=1;                              % Indicador de semestre
    [a,b]=find(ASIGNATURAS(:,1)==1);   % DETECTAR ASIGNATURAS DEL PRIMER SEMESTRE
    l=length(a);                        %detectar cuantas son las asignaturas del primer semestre

    r=abs(VMap1234+Delta1234.*randn(l,1));    %crear vector aleatorio para comprobar aprobación del primer semestre
    Ap=(r>=ASIGNATURAS(a,4));           % Revisar cuales asignaturas aprobó
    CAp=find(Ap==1);                    % Detectar las asignaturas aprobadas
    HA=ASIGNATURAS(a,[1:2]);             % creo la matriz% de Historial de asignaturas del alumno
    HA(:,3)=Ap;                         % asigno tercera columna con el resultado de aprobacion
    HA(:,4)=ASIGNATURAS(a,3);           % Guaradr el número de créditos
    NAp=sum(Ap);                        % Cuantas asignaturas están aprobadas
    Estado=0;                           % Estado alumno 0:Inicial, 1:Eliminado, 2:Terminado
    TA(Sem)=sum(HA(:,3).*HA(:,4));      % Calculo de la tasa de avance TA por semestre    
    if (Sem>=NapTAmin)&&(TA(Sem)<TAmin) % SEmestre de aplicación de la tasa de avance
        Estado=1;
    end
    % Pro¡cedimiento para contabilizar las asignaturas reprobadas
        d=length(HA);
        for i=1:d
            if HA(i,3)==0
                [a,b]=find(Reprobadas(:,1)==HA(i,2));
                Reprobadas(a,2)=1+Reprobadas(a,2);
                Reprobadas(a,k+2)=1+Reprobadas(a,k+2);
            end
        end

    % EVOLUCIÓN DE LOS SEMESTRES POR ALUMNO
    while (NAp<CA)&&(Estado~=1)
        if Sem>1
            [f,c]=find(HA(:,3)==2);      % Determinar los cursos tomados el semestre
            l=length(f);                 % Saber cuantos cursos tomó
                Inscritas=0;             %Inicializar variable
                for i=1:l
                    Inscritas(i)=find(ASIGNATURAS(:,2)==HA(f(i),2));     % revisar cuales de las asignaturas fueron tomadas
                end
                PAprI=ASIGNATURAS(Inscritas,4);       % Determinar los porcentajes de aprobación de las asignaturas inscritas
                if (Sem==2||Sem==3||Sem==4)
                    r=abs(VMap1234+Delta1234.*randn(l,1));              %crear vector aleatorio para comprobar aprobación del semestre
                elseif (Sem==5||Sem==6||Sem==7||Sem==8)
                    r=abs(VMap5678+Delta5678.*randn(l,1));
                else
                    r=abs(VMapM+DeltaM.*randn(l,1));
                end
                %r=rand(l,1);
                Ap=(r>=PAprI);                        % Revisar cuales asignaturas aprobó
                HA(f,3)=Ap;                           %Cambiar el estado de las asignaturas tomadas a aprobadas o reprobadas
                HA(f,4)=ASIGNATURAS(Inscritas,3);     % Guardar el numero de créditos
                TA(Sem)=sum(HA(:,3).*HA(:,4))/Sem;      % Calculo de la tasa de avance TA por semestre 
                    if (Sem>=NapTAmin)&&(TA(Sem)<TAmin)
                        Estado=1;
                    end
                %detectar asignaturas reprobadas y almacenar los valores
                J=Inscritas.*(~Ap');     % detecto las reprobadas
                for w=1:l
                    if J(w)~=0
                        Reprobadas(J(w),2)=Reprobadas(J(w),2)+1;
                        Reprobadas(J(w),2+k)=Reprobadas(J(w),2+k)+1;
                    end
                end
        end
       
        NAp=sum(HA(:,3));               % numero de asignaturas aprobadas
        Sem=Sem+1;                      % Incremento del semestre
        IndP=rem(Sem,2);                % es par si IndP==0
        if IndP==0
            ProgD=PROGRAMACION(:,2);    % asigno la programacion de docencia
        else
            ProgD=PROGRAMACION(:,1);    % asigno la programacion de docencia
        end
        l=length(ProgD);                % Número de asignaturas posibles de tomar
        i=1;
        while i<=l                      %procedimiento para aliminar del vector de programación las asignaturas aprobadas
            [a,b]=find(HA(:,2)==ProgD(i));
            if length(a)>0
                if sum(HA(a,3))==1
                    ProgD(i)=[];
                    l=l-1;
                    i=i-1;
                end
            end
            i=1+i;
        end
           
        
        l=length(ProgD);
        NCS=0;              % Numero de creditos semestrales
        for i=1:l                       % Ciclo para revisar las asignaturas que tomará 
            auxA=ProgD(i);               % Asigno la primera asignatura candidata
            if auxA~=0
                [f,c]=find(ASIGNATURAS(:,2)==auxA);  % Encuentro la fila de la asignatura
                auxNAPr=ASIGNATURAS(f,5);            % Leo cuantos prerequsitos tiene
                auxPr=0;                             % auxiliar para saber si cumple todos los prerequisitos
                for j=1:auxNAPr
                    AuxAP=ASIGNATURAS(f,5+j);        % determino cual es la asignatura prereqy¿uisito
                    HAAp=HA(:,2).*HA(:,3);           % auxiliar para saber que asignaturas estan aprobadas
                    [ff,c]=find(HAAp==AuxAP);
                    if length(ff)>=1, auxPr=auxPr+1; else auxPr=0; end    % asigno un 1 an auxPr
                end
                if (auxPr==auxNAPr)||(auxNAPr==0);   % si cumple los requisitos inscribo la asignatura en el historial o no tiene prerequisitos
                    if (NCS+ASIGNATURAS(f,3))<=NCSmax
                        HA=[HA;[Sem auxA 2 0]];
                        NCS=NCS+ASIGNATURAS(f,3);
                    end
                end
            end

        end
        % se revisará su pudo tomar algo
        
        [E,c]=find(HA(:,3)==2);      % Determinar existen cursos inscritos el semestre
        % Estado alumno 0:Inicial, 1:Eliminado, 2:Terminado
        if length(E)==0,
            if NAp==CA
%                 HA;
%                 'Carrera terminada';
                Estado=2;

            else
%                 HA;
%                 'eliminado';
                NAp=CA+1;
                Estado=1;
            end                % Saber cuantos cursos tomó
        end
        [n,m]=find(Reprobadas(:,2+k)>=Opor);
        if isempty(n)==0
            NAp=CA+1;
            'Eliminado por oportunidades';
            Estado=1;
        end
        
        
    end

    % valores estadisticos de los estudiantes
    Estado;
    AsigApro=length(find(HA(:,3)==1));
    AsigRep=length(find(HA(:,3)==0));
    NSem=HA(length(HA),1);

    Resumen=[Resumen; k, Estado, AsigApro AsigRep NSem];
end

% CALCULO DE VARIABLES DE SALIDA
CT=sum(Resumen(:,2)==2);     % Promedio de egresados
[a,b]=find(Resumen(:,2)==2);
PSC=mean(Resumen(a,5));
[x,y]=find(Resumen(:,5)<15);    % Encontrar los que terminan al día
Aldia=0;
for i=1:length(x)
    if (Resumen(x(i),2)==2)
        Aldia=Aldia+1;
    end
end
% Calculo de los porcentajes de retención
aux=0;
[a,b]=find(Resumen(:,5)<3);
EEpA=length(a);
[a,b]=find(Resumen(:,5)<7);
EEtA=length(a);

Resumen;
fprintf('ANÁLISIS DE LOS RESULTADOS \n')
fprintf(' Promedio: %3.2f %3.2f %3.2f Desviación: %3.2f %3.2f %3.2f\n',VMap1234,VMap5678,VMapM, Delta1234,Delta5678,DeltaM)
% fprintf(' Promedio: %3.2f Desviación: %3.2f\n',VMap5678, Delta5678)
% fprintf(' Promedio: %3.2f Desviación: %3.2f\n',VMapM, DeltaM)
fprintf(' Promedio de Egresados: %3.2f %%\n',CT*100/k)
fprintf(' Promedio de asignaturas reprobadas: %3.2f \n',sum(Resumen(:,4))/k)
fprintf(' Promedio de semestres cursados: %3.2f \n',PSC)
fprintf(' Eficiencia de egreso: %3.2f \n',PSC/ASIGNATURAS(CA,1))
fprintf(' Alumnos Egresados oportunamente: %3.2f %% (%3.2f)\n',Aldia*100/NE,  Aldia)
fprintf(' Alumnos Eliminados al 1er año: %3.2f %% de Retencion (%3.2f)\n', (NE-EEpA)*100/NE, EEpA)
fprintf(' Alumnos Eliminados al 3er año: %3.2f %% de Retencion (%3.2f)\n', (NE-EEtA)*100/NE, EEtA)