import Papa from 'papaparse';
import type { Asignatura, MallaGuardada } from '../types';
import { MAX_SEMESTRES } from '../constants/wizard';

interface UseMallaPersistenceParams {
  apiUrl: (path: string) => string;
  nombreMalla: string;
  nombreGuardarInput: string;
  currentMallaId: string | null;
  malla: Asignatura[];
  totalSemestres: number;
  fetchMallasGuardadas: () => Promise<void>;
  setNombreGuardarInput: (value: string) => void;
  setShowGuardarMallaModal: (show: boolean) => void;
  setMalla: (malla: Asignatura[]) => void;
  setTotalSemestres: (semestres: number) => void;
  setNombreMalla: (nombre: string) => void;
  setCurrentMallaId: (id: string | null) => void;
  setEstadoGuardado: (estado: 'SIN GUARDAR' | 'GUARDADO') => void;
  setMallaSetupMode: (mode: string | null) => void;
  setShowMallasGuardadasModal: (show: boolean) => void;
}

export default function useMallaPersistence({
  apiUrl,
  nombreMalla,
  nombreGuardarInput,
  currentMallaId,
  malla,
  totalSemestres,
  fetchMallasGuardadas,
  setNombreGuardarInput,
  setShowGuardarMallaModal,
  setMalla,
  setTotalSemestres,
  setNombreMalla,
  setCurrentMallaId,
  setEstadoGuardado,
  setMallaSetupMode,
  setShowMallasGuardadasModal,
}: UseMallaPersistenceParams) {
  const handleGuardarMallaClick = () => {
    setNombreGuardarInput(nombreMalla === 'Plan de Estudios (Base)' ? 'Nueva Malla 1' : nombreMalla);
    setShowGuardarMallaModal(true);
  };

  const confirmGuardarMalla = async (tipoAccion: 'nueva' | 'sobrescribir') => {
    if (!nombreGuardarInput.trim()) return;
    const token = localStorage.getItem('simula_token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    try {
      if (tipoAccion === 'sobrescribir' && currentMallaId) {
        await fetch(apiUrl(`/api/mallas/${currentMallaId}`), {
          method: 'PUT',
          headers,
          body: JSON.stringify({ nombre: nombreGuardarInput, asignaturas: malla, total_semestres: totalSemestres }),
        });
      } else {
        const res = await fetch(apiUrl('/api/mallas'), {
          method: 'POST',
          headers,
          body: JSON.stringify({ nombre: nombreGuardarInput, asignaturas: malla, total_semestres: totalSemestres }),
        });
        const data = await res.json();
        if (data.id) setCurrentMallaId(data.id);
      }
      setNombreMalla(nombreGuardarInput);
      setEstadoGuardado('GUARDADO');
      setShowGuardarMallaModal(false);
      await fetchMallasGuardadas();
    } catch (err) {
      console.error('Error al guardar malla:', err);
    }
  };

  const loadMallaGuardada = (mg: MallaGuardada) => {
    if (mg.totalSemestres > MAX_SEMESTRES || mg.asignaturas.some((a) => a.semestre > MAX_SEMESTRES)) {
      alert(`La malla guardada excede el maximo permitido de ${MAX_SEMESTRES} semestres.`);
      return;
    }

    setMalla(JSON.parse(JSON.stringify(mg.asignaturas)));
    setTotalSemestres(mg.totalSemestres);
    setNombreMalla(mg.nombre);
    setCurrentMallaId(mg.id);
    setEstadoGuardado('GUARDADO');
    setMallaSetupMode('guardada');
    setShowMallasGuardadasModal(false);
  };

  const processCSVFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const asignaturas: Asignatura[] = [];
          const rows = results.data as Record<string, string>[];

          if (rows.length === 0) {
            alert('El archivo CSV esta vacio.');
            return;
          }

          const headers = Object.keys(rows[0]);
          const findCol = (keywords: string[]) =>
            headers.find((h) => keywords.some((k) => h.toLowerCase().includes(k.toLowerCase()))) || '';

          const colId = findCol(['codigo', 'codigo', 'id', 'sigla', 'asignatura']);
          const colCred = findCol(['credito', 'credito', 'cred', 'SCT']);
          const colSem = findCol(['semestre', 'sem', 'nivel']);
          const colRep = findCol(['reprobacion', 'reprobacion', 'rep', 'tasa']);
          const colReqs = findCol(['prerequisito', 'prerrequisito', 'prereq', 'req']);
          const colDict = findCol(['dictacion', 'dictacion', 'dict', 'oferta']);

          if (!colId || !colSem) {
            alert(
              `No se encontraron las columnas obligatorias.\nSe requiere al menos: ID/Codigo y Semestre.\nColumnas encontradas: ${headers.join(', ')}`,
            );
            return;
          }

          for (const row of rows) {
            const id = (row[colId] || '').trim();
            if (!id) continue;

            const semestre = parseInt(row[colSem] || '1', 10);
            const creditos = parseInt(row[colCred] || '4', 10);
            const rep = parseFloat(row[colRep] || '0.5');
            const reqsRaw = (row[colReqs] || '').trim();
            const reqs = reqsRaw ? reqsRaw.split(/[;,|]/).map((r) => r.trim()).filter((r) => r) : [];

            let dictacion: 'anual' | 'semestral' = 'anual';
            if (colDict) {
              const val = (row[colDict] || '').toLowerCase().trim();
              if (val.includes('semestral') || val === 's' || val === 'ambos' || val === 'both') {
                dictacion = 'semestral';
              }
            }

            if (semestre < 1 || Number.isNaN(semestre)) {
              continue;
            }

            asignaturas.push({ id, cred: creditos, rep, reqs, semestre, dictacion });
          }

          if (asignaturas.length === 0) {
            alert('No se pudieron extraer asignaturas del archivo. Verifica las columnas.');
            return;
          }

          const maxSem = Math.max(...asignaturas.map((a) => a.semestre));
          if (maxSem > MAX_SEMESTRES) {
            alert(`El CSV contiene ${maxSem} semestres. El maximo permitido es ${MAX_SEMESTRES}.`);
            return;
          }

          setMalla(asignaturas);
          setTotalSemestres(maxSem);
          setMallaSetupMode('csv');
          setEstadoGuardado('SIN GUARDAR');
          setCurrentMallaId(null);
          setNombreMalla(file.name.replace(/\.csv$/i, ''));

          alert(`Importacion exitosa: ${asignaturas.length} asignaturas en ${maxSem} semestres.`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Error desconocido';
          alert('Error al procesar el CSV: ' + message);
        }
      },
      error: (err) => {
        alert('Error al leer el archivo: ' + err.message);
      },
    });
  };

  return {
    handleGuardarMallaClick,
    confirmGuardarMalla,
    loadMallaGuardada,
    processCSVFile,
  };
}
