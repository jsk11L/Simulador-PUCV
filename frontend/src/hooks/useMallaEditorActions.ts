import type React from 'react';
import type { Asignatura } from '../types';

type UseMallaEditorActionsParams = {
  malla: Asignatura[];
  totalSemestres: number;
  selectedSubject: Asignatura | null;
  drawerSubject: Asignatura | null;
  minSemestres: number;
  maxSemestres: number;
  setMalla: React.Dispatch<React.SetStateAction<Asignatura[]>>;
  setTotalSemestres: React.Dispatch<React.SetStateAction<number>>;
  setEstadoGuardado: React.Dispatch<React.SetStateAction<'SIN GUARDAR' | 'GUARDADO'>>;
  setSelectedSubject: React.Dispatch<React.SetStateAction<Asignatura | null>>;
  setDrawerSubject: React.Dispatch<React.SetStateAction<Asignatura | null>>;
  setMallaErrorMsg: React.Dispatch<React.SetStateAction<string>>;
};

export default function useMallaEditorActions({
  malla,
  totalSemestres,
  selectedSubject,
  drawerSubject,
  minSemestres,
  maxSemestres,
  setMalla,
  setTotalSemestres,
  setEstadoGuardado,
  setSelectedSubject,
  setDrawerSubject,
  setMallaErrorMsg,
}: UseMallaEditorActionsParams) {
  const markDirty = () => setEstadoGuardado('SIN GUARDAR');

  const handleAddSemestre = () => {
    if (totalSemestres >= maxSemestres) {
      alert(`No puedes superar ${maxSemestres} semestres en una malla.`);
      return;
    }
    setTotalSemestres((prev) => prev + 1);
    markDirty();
  };

  const handleRemoveSemestre = (semToRemove: number) => {
    if (semToRemove === totalSemestres && semToRemove > minSemestres) {
      setMalla((prev) => prev.filter((a) => a.semestre !== semToRemove));
      setTotalSemestres((prev) => prev - 1);
      markDirty();
    }
  };

  const handleAddAsignatura = (sem: number) => {
    let yy = 0;
    let newId = `${sem}${String(yy).padStart(2, '0')}`;
    while (malla.some((a) => a.id === newId)) {
      yy++;
      newId = `${sem}${String(yy).padStart(2, '0')}`;
    }
    const newAsig: Asignatura = { id: newId, cred: 0, rep: 0, reqs: [], semestre: sem };
    setMalla([...malla, newAsig]);
    markDirty();
  };

  const openDrawer = (asig: Asignatura) => {
    setSelectedSubject(asig);
    setDrawerSubject(JSON.parse(JSON.stringify(asig)));
    setMallaErrorMsg('');
  };

  const handleDrawerReqChange = (index: number, value: string) => {
    if (!drawerSubject) return;
    const newReqs = [...drawerSubject.reqs];
    newReqs[index] = value;
    setDrawerSubject({ ...drawerSubject, reqs: newReqs });
  };

  const handleAddReq = () => {
    if (!drawerSubject) return;
    setDrawerSubject({ ...drawerSubject, reqs: [...drawerSubject.reqs, ''] });
  };

  const handleRemoveReq = (index: number) => {
    if (!drawerSubject) return;
    const newReqs = drawerSubject.reqs.filter((_, i) => i !== index);
    setDrawerSubject({ ...drawerSubject, reqs: newReqs });
  };

  const handleSaveDrawer = () => {
    if (!drawerSubject || !selectedSubject) return;

    if (!drawerSubject.id.trim()) {
      setMallaErrorMsg('La sigla no puede estar vacia.');
      return;
    }

    if (!drawerSubject.dictacion) {
      setMallaErrorMsg('Debes seleccionar una opcion de Dictacion (Anual o Semestral).');
      return;
    }

    const isDuplicate = malla.some((a) => a.id === drawerSubject.id && a.id !== selectedSubject.id);
    if (isDuplicate) {
      setMallaErrorMsg(`La sigla "${drawerSubject.id}" ya existe en la malla.`);
      return;
    }

    const newMalla = malla.map((a) => (a.id === selectedSubject.id ? drawerSubject : a));

    if (drawerSubject.id !== selectedSubject.id) {
      newMalla.forEach((asig) => {
        asig.reqs = asig.reqs.map((r) => (r === selectedSubject.id ? drawerSubject.id : r));
      });
    }

    setMalla(newMalla);
    markDirty();
    setSelectedSubject(null);
    setDrawerSubject(null);
  };

  const handleDeleteAsignatura = () => {
    if (!selectedSubject) return;
    const newMalla = malla.filter((a) => a.id !== selectedSubject.id);
    newMalla.forEach((asig) => {
      asig.reqs = asig.reqs.filter((r) => r !== selectedSubject.id);
    });

    setMalla(newMalla);
    markDirty();
    setSelectedSubject(null);
    setDrawerSubject(null);
  };

  const validateMallaIntegrity = () => {
    const errors: string[] = [];

    for (let s = 1; s <= totalSemestres; s++) {
      const asignaturasDelSemestre = malla.filter((a) => a.semestre === s);
      if (asignaturasDelSemestre.length === 0) {
        errors.push(
          `Semestre ${s}: Esta vacio. Debes anadir asignaturas o eliminar el semestre (si es el ultimo y > ${minSemestres}).`
        );
      }
    }

    for (const asig of malla) {
      if (asig.cred <= 0) {
        errors.push(`Asignatura '${asig.id}' (Semestre ${asig.semestre}): Debe tener mas de 0 creditos.`);
      }
      if (asig.rep <= 0) {
        errors.push(`Asignatura '${asig.id}' (Semestre ${asig.semestre}): Debe tener una tasa de reprobacion mayor a 0.`);
      }
      if (!asig.dictacion) {
        errors.push(
          `Asignatura '${asig.id}' (Semestre ${asig.semestre}): Falta seleccionar la opcion de Dictacion (OBLIGATORIO).`
        );
      }
      for (const req of asig.reqs) {
        if (!req.trim()) continue;
        const reqParent = malla.find((a) => a.id === req);
        if (!reqParent) {
          errors.push(`Asignatura '${asig.id}': El prerrequisito '${req}' NO EXISTE en la malla.`);
        } else if (reqParent.semestre >= asig.semestre) {
          errors.push(
            `Asignatura '${asig.id}': El prerrequisito '${req}' esta en el semestre ${reqParent.semestre}. Debe cursarse en un semestre estrictamente anterior.`
          );
        }
      }
    }

    return errors;
  };

  return {
    handleAddSemestre,
    handleRemoveSemestre,
    handleAddAsignatura,
    openDrawer,
    handleDrawerReqChange,
    handleAddReq,
    handleRemoveReq,
    handleSaveDrawer,
    handleDeleteAsignatura,
    validateMallaIntegrity,
  };
}
