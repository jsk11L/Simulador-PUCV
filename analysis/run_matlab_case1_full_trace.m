function run_matlab_case1_full_trace(scenario_id, iterations, seed, trace_path)
% Deep trace runner for one scenario.
% Default is Caso Actual, one iteration, JSONL trace output.

if nargin < 1 || isempty(scenario_id)
    scenario_id = 'caso_actual';
end
if nargin < 2 || isempty(iterations)
    iterations = 1;
end
if nargin < 3 || isempty(seed)
    seed = 20260416;
end
if nargin < 4 || isempty(trace_path)
    trace_path = fullfile(fileparts(mfilename('fullpath')), 'traces', 'case1_matlab.jsonl');
end

if ~strcmpi(scenario_id, 'caso_actual')
    error('This trace runner is intentionally restricted to caso_actual');
end

rng(seed, 'twister');

scriptDir = fileparts(mfilename('fullpath'));
rootDir = fileparts(scriptDir);
xlsxPath = fullfile(rootDir, 'original', 'Civilelectrica93.xlsx');
[asigSheet, progSheet, scenarioLabel] = scenario_sheets(scenario_id);
ASIGNATURAS = readmatrix(xlsxPath, 'Sheet', asigSheet);
PROGRAMACION = readmatrix(xlsxPath, 'Sheet', progSheet);

traceDir = fileparts(trace_path);
if ~exist(traceDir, 'dir')
    mkdir(traceDir);
end
fid = fopen(trace_path, 'w');
if fid < 0
    error('Unable to open trace file: %s', trace_path);
end
cleanup = onCleanup(@() fclose(fid));

emit('scenario_loaded', struct( ...
    'scenario_id', scenario_id, ...
    'scenario_label', scenarioLabel, ...
    'seed', seed, ...
    'iterations', iterations, ...
    'xlsx_path', xlsxPath, ...
    'asig_sheet', asigSheet, ...
    'prog_sheet', progSheet, ...
    'ASIGNATURAS', ASIGNATURAS, ...
    'PROGRAMACION', PROGRAMACION));

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

for rep = 1:iterations
    emit('iteration_start', struct('iteration', rep, 'seed', seed + rep - 1));
    [resultSummary] = run_trace_once(ASIGNATURAS, PROGRAMACION, NE, NCSmax, TAmin, NapTAmin, Opor, VMap1234, Delta1234, VMap5678, Delta5678, VMapM, DeltaM, rep);
    emit('iteration_end', resultSummary);
end

emit('trace_completed', struct('trace_path', trace_path));

    function [resultSummary] = run_trace_once(ASIGNATURAS, PROGRAMACION, NE, NCSmax, TAmin, NapTAmin, Opor, VMap1234, Delta1234, VMap5678, Delta5678, VMapM, DeltaM, iteration)
        [CA, ~] = size(ASIGNATURAS);
        Reprobadas = ASIGNATURAS(:,2);
        Reprobadas(1, 2 + NE) = 0;
        Resumen = [];
        for k = 1:NE
            Sem = 1;
            [a, ~] = find(ASIGNATURAS(:,1) == 1);
            l = length(a);

            emit('student_start', struct( ...
                'iteration', iteration, ...
                'student', k, ...
                'state', 'Activo', ...
                'Sem', Sem, ...
                'CA', CA, ...
                'NCSmax', NCSmax, ...
                'TAmin', TAmin, ...
                'NapTAmin', NapTAmin, ...
                'Opor', Opor, ...
                'Reprobadas', Reprobadas, ...
                'Resumen', Resumen));

            r = abs(VMap1234 + Delta1234 .* randn(l,1));
            Ap = (r >= ASIGNATURAS(a,4));
            HA = ASIGNATURAS(a,[1:2]);
            HA(:,3) = Ap;
            HA(:,4) = ASIGNATURAS(a,3);
            NAp = sum(Ap);
            Estado = 0;
            TA = zeros(1, 64);
            TA(Sem) = sum(HA(:,3) .* HA(:,4));
            if (Sem >= NapTAmin) && (TA(Sem) < TAmin)
                Estado = 1;
            end

            for i = 1:length(HA)
                if HA(i,3) == 0
                    [idx, ~] = find(Reprobadas(:,1) == HA(i,2));
                    Reprobadas(idx,2) = 1 + Reprobadas(idx,2);
                    Reprobadas(idx,k+2) = 1 + Reprobadas(idx,k+2);
                end
            end

            emit('semester_start', struct( ...
                'iteration', iteration, ...
                'student', k, ...
                'semester', Sem, ...
                'state', 'Activo', ...
                'a', a, ...
                'r', r, ...
                'Ap', Ap, ...
                'HA', HA, ...
                'Reprobadas', Reprobadas, ...
                'TA', TA, ...
                'NAp', NAp, ...
                'Estado', Estado));

            while (NAp < CA) && (Estado ~= 1)
                if Sem > 1
                    [f, ~] = find(HA(:,3) == 2);
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

                    emit('semester_iteration', struct( ...
                        'iteration', iteration, ...
                        'student', k, ...
                        'semester', Sem, ...
                        'state', 'Activo', ...
                        'f', f, ...
                        'Inscritas', Inscritas, ...
                        'PAprI', PAprI, ...
                        'r', r, ...
                        'Ap', Ap, ...
                        'HA', HA, ...
                        'Reprobadas', Reprobadas, ...
                        'TA', TA, ...
                        'Estado', Estado));
                end

                NAp = sum(HA(:,3));
                Sem = Sem + 1;
                IndP = rem(Sem,2);
                if IndP == 0
                    ProgD = PROGRAMACION(:,2);
                else
                    ProgD = PROGRAMACION(:,1);
                end
                ProgD = ProgD(~isnan(ProgD));
                l = length(ProgD);
                i = 1;
                while i <= l
                    [idx, ~] = find(HA(:,2) == ProgD(i));
                    if length(idx) > 0
                        if sum(HA(idx,3)) == 1
                            ProgD(i) = [];
                            l = l - 1;
                            i = i - 1;
                        end
                    end
                    i = i + 1;
                end

                l = length(ProgD);
                NCS = 0;
                candidateLog = [];
                for i = 1:l
                    auxA = ProgD(i);
                    candidateItem = struct('auxA', auxA, 'accepted', false, 'reason', '', 'auxNAPr', [], 'prereq_state', []);
                    if auxA ~= 0
                        [f, ~] = find(ASIGNATURAS(:,2) == auxA, 1);
                        if isempty(f)
                            candidateItem.reason = 'not_found_in_malla';
                        else
                            auxNAPr = ASIGNATURAS(f,5);
                            auxPr = 0;
                            prereqState = zeros(1, auxNAPr);
                            for j = 1:auxNAPr
                                AuxAP = ASIGNATURAS(f,5+j);
                                HAAp = HA(:,2) .* HA(:,3);
                                [ff, ~] = find(HAAp == AuxAP);
                                if length(ff) >= 1
                                    auxPr = auxPr + 1;
                                    prereqState(j) = 1;
                                else
                                    auxPr = 0;
                                end
                            end
                            if (auxPr == auxNAPr) || (auxNAPr == 0)
                                if (NCS + ASIGNATURAS(f,3)) <= NCSmax
                                    HA = [HA; [Sem auxA 2 0]];
                                    NCS = NCS + ASIGNATURAS(f,3);
                                    candidateItem.accepted = true;
                                    candidateItem.reason = 'enrolled';
                                else
                                    candidateItem.reason = 'credit_limit';
                                end
                            else
                                candidateItem.reason = 'prerequisites_not_met';
                            end
                            candidateItem.prereq_state = prereqState;
                            candidateItem.auxNAPr = auxNAPr;
                        end
                    else
                        candidateItem.reason = 'zero_candidate';
                    end
                    candidateLog = [candidateLog; candidateItem]; %#ok<AGROW>
                end

                emit('semester_programming', struct( ...
                    'iteration', iteration, ...
                    'student', k, ...
                    'semester', Sem, ...
                    'state', 'Activo', ...
                    'ProgD', ProgD, ...
                    'candidateLog', candidateLog, ...
                    'HA', HA, ...
                    'Reprobadas', Reprobadas, ...
                    'NCS', NCS, ...
                    'NAp', NAp, ...
                    'Estado', Estado));

                [E, ~] = find(HA(:,3) == 2);
                if length(E) == 0
                    if NAp == CA
                        Estado = 2;
                    else
                        NAp = CA + 1;
                        Estado = 1;
                    end
                end

                [n, ~] = find(Reprobadas(:,2+k) >= Opor);
                if isempty(n) == 0
                    NAp = CA + 1;
                    Estado = 1;
                end

                emit('semester_end', struct( ...
                    'iteration', iteration, ...
                    'student', k, ...
                    'semester', Sem, ...
                    'state', Estado, ...
                    'state_label', state_label(Estado), ...
                    'HA', HA, ...
                    'Reprobadas', Reprobadas, ...
                    'TA', TA, ...
                    'NCS', NCS, ...
                    'NAp', NAp, ...
                    'E', E, ...
                    'n', n));
            end

            AsigApro = length(find(HA(:,3) == 1));
            AsigRep = length(find(HA(:,3) == 0));
            NSem = HA(length(HA),1);
            Resumen = [Resumen; k, Estado, AsigApro, AsigRep, NSem]; %#ok<AGROW>

            emit('student_end', struct( ...
                'iteration', iteration, ...
                'student', k, ...
                'state', Estado, ...
                'state_label', state_label(Estado), ...
                'AsigApro', AsigApro, ...
                'AsigRep', AsigRep, ...
                'NSem', NSem, ...
                'HA', HA, ...
                'Reprobadas', Reprobadas, ...
                'Resumen', Resumen));
        end

        CT = sum(Resumen(:,2) == 2);
        if any(Resumen(:,2) == 2)
            a = find(Resumen(:,2) == 2);
            PSC = mean(Resumen(a,5));
        else
            PSC = 0;
        end
        x = find(Resumen(:,5) < 15);
        Aldia = 0;
        for i = 1:length(x)
            if (Resumen(x(i),2) == 2)
                Aldia = Aldia + 1;
            end
        end
        [a, ~] = find(Resumen(:,5) < 3);
        EEpA = length(a);
        [a, ~] = find(Resumen(:,5) < 7);
        EEtA = length(a);

        resultSummary = struct( ...
            'iteration', iteration, ...
            'Resumen', Resumen, ...
            'CT', CT, ...
            'PSC', PSC, ...
            'Aldia', Aldia, ...
            'EEpA', EEpA, ...
            'EEtA', EEtA, ...
            'VMap1234', VMap1234, ...
            'Delta1234', Delta1234, ...
            'VMap5678', VMap5678, ...
            'Delta5678', Delta5678, ...
            'VMapM', VMapM, ...
            'DeltaM', DeltaM, ...
            'CA', CA);
    end

    function emit(stage, payload)
        line = jsonencode(struct('stage', stage, 'payload', payload));
        fprintf(fid, '%s\n', line);
    end

    function label = state_label(state)
        switch state
            case 0
                label = 'Inicial';
            case 1
                label = 'Eliminado';
            case 2
                label = 'Terminado';
            otherwise
                label = 'Desconocido';
        end
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
end
