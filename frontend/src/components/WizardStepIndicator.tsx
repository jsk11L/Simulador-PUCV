import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Step {
  num: number;
  label: string;
}

interface WizardStepIndicatorProps {
  wizardStep: 1 | 2 | 3 | 4 | 5;
}

const steps: Step[] = [
  { num: 1, label: 'Diseño de Malla' },
  { num: 2, label: 'Variables de Simulación' },
  { num: 3, label: 'Modelo de Calificaciones' },
  { num: 4, label: 'Resumen y Verificación' },
];

export default function WizardStepIndicator({ wizardStep }: WizardStepIndicatorProps) {
  if (wizardStep === 5) return null;

  return (
    <div className="flex items-center justify-center w-full max-w-4xl mx-auto py-4 sm:py-6 mb-8 sm:mb-12">
      {steps.map((step, index) => (
        <React.Fragment key={step.num}>
          <div className="flex flex-col items-center relative z-10">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm border-2 transition-colors ${
              wizardStep === step.num
                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                : wizardStep > step.num
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-slate-300 text-slate-400'
            }`}>
              {wizardStep > step.num ? <CheckCircle2 size={16} /> : step.num}
            </div>
            <span className={`absolute top-10 sm:top-12 text-[9px] sm:text-[11px] uppercase tracking-wider font-bold w-max max-w-[80px] sm:max-w-[140px] text-center hidden sm:block ${
              wizardStep === step.num
                ? 'text-blue-700'
                : wizardStep > step.num
                  ? 'text-slate-700'
                  : 'text-slate-400'
            }`}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-1 mx-1 sm:mx-2 rounded transition-colors ${
              wizardStep > step.num ? 'bg-green-500' : 'bg-slate-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
