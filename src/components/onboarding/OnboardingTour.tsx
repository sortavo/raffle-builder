import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, Gift, Settings, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetPath?: string;
  position?: 'center' | 'bottom-right' | 'top-left';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: '¡Bienvenido a Sortavo!',
    description: 'Te guiaremos por las funciones principales para que puedas crear tu primer sorteo en minutos.',
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    position: 'center',
  },
  {
    id: 'dashboard',
    title: 'Tu Panel de Control',
    description: 'Aquí verás un resumen de todos tus sorteos activos, ventas recientes y estadísticas importantes.',
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
    targetPath: '/dashboard',
    position: 'center',
  },
  {
    id: 'create-raffle',
    title: 'Crear un Sorteo',
    description: 'Haz clic en "Crear Sorteo" para configurar tu rifa. Define el premio, precio de boletos y fecha del sorteo.',
    icon: <Gift className="h-8 w-8 text-primary" />,
    targetPath: '/dashboard/raffles',
    position: 'center',
  },
  {
    id: 'settings',
    title: 'Configura tu Organización',
    description: 'Personaliza tu marca, agrega métodos de pago y configura notificaciones para tus compradores.',
    icon: <Settings className="h-8 w-8 text-primary" />,
    targetPath: '/dashboard/settings',
    position: 'center',
  },
];

const TOUR_STORAGE_KEY = 'sortavo-onboarding-tour-completed';

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if tour should be shown
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed && location.pathname === '/dashboard') {
      // Delay to let dashboard load first
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStep = TOUR_STEPS[currentStep + 1];
      if (nextStep.targetPath && location.pathname !== nextStep.targetPath) {
        navigate(nextStep.targetPath);
      }
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = TOUR_STEPS[currentStep - 1];
      if (prevStep.targetPath && location.pathname !== prevStep.targetPath) {
        navigate(prevStep.targetPath);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Tour Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "fixed z-50",
              step.position === 'center' && "inset-0 flex items-center justify-center p-4",
              step.position === 'bottom-right' && "bottom-6 right-6",
              step.position === 'top-left' && "top-20 left-6"
            )}
          >
            <Card className="w-full max-w-md shadow-2xl border-primary/20">
              <CardHeader className="relative pb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={handleSkip}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    {step.icon}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Paso {currentStep + 1} de {TOUR_STEPS.length}
                    </p>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pb-4">
                <p className="text-muted-foreground">{step.description}</p>
                <Progress value={progress} className="mt-4 h-1.5" />
              </CardContent>

              <CardFooter className="flex justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  Omitir tour
                </Button>
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button variant="outline" size="sm" onClick={handlePrev}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                  )}
                  <Button size="sm" onClick={handleNext}>
                    {currentStep === TOUR_STEPS.length - 1 ? (
                      '¡Empezar!'
                    ) : (
                      <>
                        Siguiente
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to manually trigger tour
export function useOnboardingTour() {
  const resetTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    window.location.reload();
  };

  const isTourCompleted = () => {
    return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
  };

  return { resetTour, isTourCompleted };
}
