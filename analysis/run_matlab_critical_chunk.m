function run_matlab_critical_chunk(scenario_id, iterations, seed)
% MATLAB chunk runner for one critical scenario.
% Prints one machine-readable line:
% RESULT,<scenario_label>,<ppe>,<psce>,<ee>,<peo>

if nargin < 1 || isempty(scenario_id)
    error('scenario_id is required');
end
if nargin < 2 || isempty(iterations)
    iterations = 1000;
end
if nargin < 3 || isempty(seed)
    seed = 20260416;
end

rng(seed, 'twister');

scriptDir = fileparts(mfilename('fullpath'));
rootDir = fileparts(scriptDir);
xlsxPath = fullfile(rootDir, 'original', 'Civilelectrica93.xlsx');

[asigSheet, progSheet, scenarioLabel] = scenario_sheets(scenario_id);
ASIGNATURAS = readmatrix(xlsxPath, 'Sheet', asigSheet);
PROGRAMACION = readmatrix(xlsxPath, 'Sheet', progSheet);

% Same baseline parameters used in original model.
NE = 2;
NCSmax = 21;
TAmin = 12.3;
NapTAmin = 10;
Opor = 6;

VMap1234 = 0.48;
Delta1234 = 0.2;
VMap5678 = 0.55;
Delta5678 = 0.2;
VMapM = 0.65;
DeltaM = 0.25;

ppeSum = 0;
psceSum = 0;
eeSum = 0;
peoSum = 0;

for rep = 1:iterations
    [ppe, psce, ee, peo] = run_once(ASIGNATURAS, PROGRAMACION, NE, NCSmax, TAmin, NapTAmin, Opor, VMap1234, Delta1234, VMap5678, Delta5678, VMapM, DeltaM);
    ppeSum = ppeSum + ppe;
    psceSum = psceSum + psce;
    eeSum = eeSum + ee;
    peoSum = peoSum + peo;
end

ppeAvg = ppeSum / iterations;
psceAvg = psceSum / iterations;
eeAvg = eeSum / iterations;
peoAvg = peoSum / iterations;

fprintf('RESULT,%s,%.6f,%.6f,%.6f,%.6f\n', scenarioLabel, ppeAvg, psceAvg, eeAvg, peoAvg);
end

function [asigSheet, progSheet, label] = scenario_sheets(scenario_id)
sid = lower(string(scenario_id));

switch sid
    case "caso_actual"
        asigSheet = 'Malla';
        progSheet = 'ProgramacionB';
        label = 'Caso Actual';
    case "pe"
        asigSheet = 'Malla';
        progSheet = 'ProgramacionPE';
        label = 'PE';
    case "cas"
        asigSheet = 'Malla';
        progSheet = 'ProgramacionS';
        label = 'CAS';
    case "r_10"
        asigSheet = 'Malla10me';
        progSheet = 'ProgramacionB';
        label = 'R-10';
    case "r_mas_10"
        asigSheet = 'Malla10ma';
        progSheet = 'ProgramacionB';
        label = 'R+10';
    case "r_10_gt_40"
        asigSheet = 'MallaR1050';
        progSheet = 'ProgramacionB';
        label = 'R-10>40';
    case "pf"
        asigSheet = 'MallaPF';
        progSheet = 'ProgramacionB';
        label = 'PF';
    otherwise
        error('Unknown scenario_id: %s', scenario_id);
end
end

function [ppe, psce, ee, peo] = run_once(ASIGNATURAS, PROGRAMACION, NE, NCSmax, TAmin, NapTAmin, Opor, VMap1234, Delta1234, VMap5678, Delta5678, VMapM, DeltaM)
Resumen = [];
[CA, ~] = size(ASIGNATURAS);
Reprobadas = ASIGNATURAS(:,2);
Reprobadas(1,2+NE) = 0;

for k = 1:NE
    Sem = 1;
    a = find(ASIGNATURAS(:,1) == 1);
    l = length(a);

    r = abs(VMap1234 + Delta1234 .* randn(l,1));
    Ap = (r >= ASIGNATURAS(a,4));

    HA = ASIGNATURAS(a,[1 2]);
    HA(:,3) = Ap;
    HA(:,4) = ASIGNATURAS(a,3);
    NAp = sum(Ap);
    Estado = 0;

    TA = zeros(1, 64);
    TA(Sem) = sum(HA(:,3) .* HA(:,4));
    if (Sem >= NapTAmin) && (TA(Sem) < TAmin)
        Estado = 1;
    end

    d = length(HA);
    for i = 1:d
        if HA(i,3) == 0
            idx = find(Reprobadas(:,1) == HA(i,2), 1);
            if ~isempty(idx)
                Reprobadas(idx,2) = 1 + Reprobadas(idx,2);
                Reprobadas(idx,k+2) = 1 + Reprobadas(idx,k+2);
            end
        end
    end

    while (NAp < CA) && (Estado ~= 1)
        if Sem > 1
            f = find(HA(:,3) == 2);
            l = length(f);
            Inscritas = zeros(1, l);
            for i = 1:l
                Inscritas(i) = find(ASIGNATURAS(:,2) == HA(f(i),2), 1);
            end

            PAprI = ASIGNATURAS(Inscritas,4);
            if (Sem == 2 || Sem == 3 || Sem == 4)
                r = abs(VMap1234 + Delta1234 .* randn(l,1));
            elseif (Sem == 5 || Sem == 6 || Sem == 7 || Sem == 8)
                r = abs(VMap5678 + Delta5678 .* randn(l,1));
            else
                r = abs(VMapM + DeltaM .* randn(l,1));
            end

            Ap = (r >= PAprI);
            HA(f,3) = Ap;
            HA(f,4) = ASIGNATURAS(Inscritas,3);

            TA(Sem) = sum(HA(:,3) .* HA(:,4)) / Sem;
            if (Sem >= NapTAmin) && (TA(Sem) < TAmin)
                Estado = 1;
            end

            J = Inscritas .* (~Ap');
            for w = 1:l
                if J(w) ~= 0
                    Reprobadas(J(w),2) = Reprobadas(J(w),2) + 1;
                    Reprobadas(J(w),2+k) = Reprobadas(J(w),2+k) + 1;
                end
            end
        end

        NAp = sum(HA(:,3));
        Sem = Sem + 1;

        if rem(Sem,2) == 0
            ProgD = PROGRAMACION(:,2);
        else
            ProgD = PROGRAMACION(:,1);
        end

        ProgD = ProgD(~isnan(ProgD));
        l = length(ProgD);
        i = 1;
        while i <= l
            a = find(HA(:,2) == ProgD(i));
            if ~isempty(a) && sum(HA(a,3)) == 1
                ProgD(i) = [];
                l = l - 1;
                i = i - 1;
            end
            i = i + 1;
        end

        l = length(ProgD);
        NCS = 0;
        for i = 1:l
            auxA = ProgD(i);
            if auxA ~= 0
                f = find(ASIGNATURAS(:,2) == auxA, 1);
                if isempty(f)
                    continue;
                end

                auxNAPr = ASIGNATURAS(f,5);
                auxPr = 0;
                for j = 1:auxNAPr
                    AuxAP = ASIGNATURAS(f,5+j);
                    HAAp = HA(:,2) .* HA(:,3);
                    ff = find(HAAp == AuxAP);
                    if length(ff) >= 1
                        auxPr = auxPr + 1;
                    else
                        auxPr = 0;
                    end
                end

                if (auxPr == auxNAPr) || (auxNAPr == 0)
                    if (NCS + ASIGNATURAS(f,3)) <= NCSmax
                        HA = [HA; [Sem auxA 2 0]];
                        NCS = NCS + ASIGNATURAS(f,3);
                    end
                end
            end
        end

        E = find(HA(:,3) == 2);
        if isempty(E)
            if NAp == CA
                Estado = 2;
            else
                NAp = CA + 1;
                Estado = 1;
            end
        end

        n = find(Reprobadas(:,2+k) >= Opor);
        if ~isempty(n)
            NAp = CA + 1;
            Estado = 1;
        end
    end

    AsigApro = length(find(HA(:,3) == 1));
    AsigRep = length(find(HA(:,3) == 0));
    NSem = HA(length(HA),1);
    Resumen = [Resumen; k, Estado, AsigApro, AsigRep, NSem];
end

CT = sum(Resumen(:,2) == 2);
a = find(Resumen(:,2) == 2);
if isempty(a)
    PSC = 0;
else
    PSC = mean(Resumen(a,5));
end

x = find(Resumen(:,5) < 15);
Aldia = 0;
for i = 1:length(x)
    if Resumen(x(i),2) == 2
        Aldia = Aldia + 1;
    end
end

if NE > 0
    ppe = CT * 100 / NE;
    peo = Aldia * 100 / NE;
else
    ppe = 0;
    peo = 0;
end

psce = PSC;
if CA > 0
    ee = PSC / ASIGNATURAS(CA,1);
else
    ee = 0;
end
end
