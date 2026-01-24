import { useMemo, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import type { Prize } from '@/types/prize';

export interface ValidationError {
  field: string;
  message: string;
}

export interface StepValidation {
  step: number;
  title: string;
  isValid: boolean;
  errors: ValidationError[];
}

export type StepStatus = 'complete' | 'incomplete' | 'current';

interface ValidationConfig {
  field: string;
  label: string;
  validate: (value: unknown) => boolean;
  message: string;
}

// Export required fields for use in step components
export const REQUIRED_FIELDS: Record<string, { step: number; label: string; message: string }> = {
  title: { step: 1, label: 'Título del sorteo', message: 'El título debe tener al menos 3 caracteres' },
  prizes: { step: 2, label: 'Premios', message: 'Debes agregar al menos un premio con nombre' },
  ticket_price: { step: 3, label: 'Precio por boleto', message: 'El precio debe ser mayor a 0' },
  total_tickets: { step: 3, label: 'Total de boletos', message: 'Debes seleccionar la cantidad de boletos' },
  draw_date: { step: 4, label: 'Fecha del sorteo', message: 'La fecha del sorteo es requerida y debe ser en el futuro' },
};

const validatePrizes = (value: unknown): boolean => {
  if (!Array.isArray(value) || value.length === 0) return false;
  const prizes = value as Prize[];
  // At least the first prize must have a name
  return prizes[0]?.name?.trim().length > 0;
};

const STEP_VALIDATIONS: Record<number, ValidationConfig[]> = {
  1: [
    {
      field: 'title',
      label: 'Título del sorteo',
      validate: (value) => typeof value === 'string' && value.trim().length >= 3,
      message: 'El título debe tener al menos 3 caracteres'
    }
  ],
  2: [
    {
      field: 'prizes',
      label: 'Premios',
      validate: validatePrizes,
      message: 'Debes agregar al menos un premio con nombre'
    }
  ],
  3: [
    {
      field: 'ticket_price',
      label: 'Precio por boleto',
      validate: (value) => typeof value === 'number' && value > 0,
      message: 'El precio debe ser mayor a 0'
    },
    {
      field: 'total_tickets',
      label: 'Total de boletos',
      validate: (value) => typeof value === 'number' && value > 0,
      message: 'Debes seleccionar la cantidad de boletos'
    }
  ],
  4: [
    {
      field: 'draw_date',
      label: 'Fecha del sorteo',
      validate: (value) => {
        if (!value) return false;
        const date = new Date(value as string);
        return !isNaN(date.getTime()) && date > new Date();
      },
      message: 'La fecha del sorteo es requerida y debe ser en el futuro'
    }
  ],
  5: [] // Paso 5 no tiene campos requeridos adicionales
};

const STEP_TITLES: Record<number, string> = {
  1: 'Información Básica',
  2: 'Premio',
  3: 'Boletos',
  4: 'Sorteo',
  5: 'Diseño'
};

export function useWizardValidation(form: UseFormReturn<any>, currentStep: number) {
  const values = form.watch();

  const validateStep = useMemo(() => {
    return (stepNumber: number): ValidationError[] => {
      const configs = STEP_VALIDATIONS[stepNumber] || [];
      const errors: ValidationError[] = [];

      configs.forEach(config => {
        const value = values[config.field];
        if (!config.validate(value)) {
          errors.push({
            field: config.field,
            message: config.message
          });
        }
      });

      // Validación adicional: fechas
      if (stepNumber === 4) {
        const startDate = values.start_date;
        const drawDate = values.draw_date;
        
        if (startDate && drawDate) {
          if (new Date(startDate) >= new Date(drawDate)) {
            errors.push({
              field: 'start_date',
              message: 'La fecha de inicio debe ser anterior a la fecha del sorteo'
            });
          }
        }
      }

      return errors;
    };
  }, [values]);

  const stepValidations = useMemo((): StepValidation[] => {
    return [1, 2, 3, 4, 5].map(step => {
      const errors = validateStep(step);
      return {
        step,
        title: STEP_TITLES[step],
        isValid: errors.length === 0,
        errors
      };
    });
  }, [validateStep]);

  const getStepStatus = useMemo(() => {
    return (stepNumber: number): StepStatus => {
      if (stepNumber === currentStep) return 'current';
      const errors = validateStep(stepNumber);
      return errors.length === 0 ? 'complete' : 'incomplete';
    };
  }, [validateStep, currentStep]);

  const canPublish = useMemo((): boolean => {
    // Verificar todos los pasos tienen validación correcta
    for (let step = 1; step <= 4; step++) {
      const errors = validateStep(step);
      if (errors.length > 0) return false;
    }
    return true;
  }, [validateStep]);

  const allErrors = useMemo((): StepValidation[] => {
    return stepValidations.filter(sv => !sv.isValid);
  }, [stepValidations]);

  const getFieldLabel = (field: string): string => {
    for (const step of Object.values(STEP_VALIDATIONS)) {
      const config = step.find(c => c.field === field);
      if (config) return config.label;
    }
    return field;
  };

  const isFieldRequired = (field: string): boolean => {
    for (const step of Object.values(STEP_VALIDATIONS)) {
      if (step.some(c => c.field === field)) return true;
    }
    return false;
  };

  const getFieldError = (field: string): string | null => {
    for (const step of Object.values(STEP_VALIDATIONS)) {
      const config = step.find(c => c.field === field);
      if (config && !config.validate(values[field])) {
        return config.message;
      }
    }
    return null;
  };

  return {
    validateStep,
    stepValidations,
    getStepStatus,
    canPublish,
    allErrors,
    getFieldLabel,
    isFieldRequired,
    getFieldError
  };
}
