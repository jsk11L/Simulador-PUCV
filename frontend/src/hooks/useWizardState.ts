import { useState } from 'react';
import type { Asignatura, ModeloCalificaciones, SimulacionResponse, VariablesSimulacion } from '../types';
import { MIN_SEMESTRES } from '../constants/wizard';

const DEFAULT_MALLA_NOMBRE = 'Plan de Estudios (Base)';

const DEFAULT_VARIABLES: VariablesSimulacion = {
  ne: 150,
  ncsmax: 21,
  tamin: 12.3,
  naptamin: 10,
  opor: 6,
};

const DEFAULT_MODELO_CALIF: ModeloCalificaciones = {
  vmap1234: 0.48,
  delta1234: 0.2,
  vmap5678: 0.55,
  delta5678: 0.2,
  vmapm: 0.65,
  deltam: 0.25,
};

export default function useWizardState() {
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResults, setSimResults] = useState<SimulacionResponse | null>(null);

  const [mallaSetupMode, setMallaSetupMode] = useState<string | null>(null);
  const [malla, setMalla] = useState<Asignatura[]>([]);
  const [totalSemestres, setTotalSemestres] = useState<number>(MIN_SEMESTRES);
  const [nombreMalla, setNombreMalla] = useState<string>(DEFAULT_MALLA_NOMBRE);
  const [estadoGuardado, setEstadoGuardado] = useState<'SIN GUARDAR' | 'GUARDADO'>('SIN GUARDAR');
  const [selectedSubject, setSelectedSubject] = useState<Asignatura | null>(null);
  const [drawerSubject, setDrawerSubject] = useState<Asignatura | null>(null);
  const [mallaErrorMsg, setMallaErrorMsg] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [currentMallaId, setCurrentMallaId] = useState<string | null>(null);

  const [variables, setVariables] = useState<VariablesSimulacion>(DEFAULT_VARIABLES);
  const [modeloCalif, setModeloCalif] = useState<ModeloCalificaciones>(DEFAULT_MODELO_CALIF);

  const resetWizardDraft = () => {
    setWizardStep(1);
    setMallaSetupMode(null);
    setSelectedSubject(null);
    setDrawerSubject(null);
    setMallaErrorMsg('');
    setValidationErrors([]);
    setMalla([]);
    setCurrentMallaId(null);
    setTotalSemestres(MIN_SEMESTRES);
    setNombreMalla(DEFAULT_MALLA_NOMBRE);
    setEstadoGuardado('SIN GUARDAR');
    setSimResults(null);
    setIsSimulating(false);
  };

  return {
    wizardStep,
    setWizardStep,
    isSimulating,
    setIsSimulating,
    simResults,
    setSimResults,
    mallaSetupMode,
    setMallaSetupMode,
    malla,
    setMalla,
    totalSemestres,
    setTotalSemestres,
    nombreMalla,
    setNombreMalla,
    estadoGuardado,
    setEstadoGuardado,
    selectedSubject,
    setSelectedSubject,
    drawerSubject,
    setDrawerSubject,
    mallaErrorMsg,
    setMallaErrorMsg,
    validationErrors,
    setValidationErrors,
    currentMallaId,
    setCurrentMallaId,
    variables,
    setVariables,
    modeloCalif,
    setModeloCalif,
    resetWizardDraft,
  };
}
