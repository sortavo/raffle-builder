// ============================================================================
// How To Participate Section - Important (Priority 7)
// ============================================================================
// Step-by-step participation guide

import { Ticket, CreditCard, Trophy, CheckCircle } from 'lucide-react';
import type { SectionProps } from './types';

const STEPS = [
  {
    icon: Ticket,
    title: 'Elige tus boletos',
    description: 'Selecciona uno o más números de la suerte del catálogo disponible.',
  },
  {
    icon: CreditCard,
    title: 'Realiza tu pago',
    description: 'Completa el pago con tu método preferido de forma segura.',
  },
  {
    icon: CheckCircle,
    title: 'Confirma tu compra',
    description: 'Recibe tu confirmación y boletos digitales por correo y WhatsApp.',
  },
  {
    icon: Trophy,
    title: '¡Espera el sorteo!',
    description: 'El día del sorteo, si tu número sale ganador, te contactaremos.',
  },
];

export function HowToParticipateSection({ 
  raffle, 
  isPreview = false 
}: SectionProps) {
  return (
    <section 
      className="py-8 lg:py-12"
      style={{
        backgroundColor: 'var(--template-bg)',
        color: 'var(--template-text)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ fontFamily: 'var(--template-font-title)' }}
          >
            ¿Cómo Participar?
          </h2>
          <p style={{ color: 'var(--template-text-muted)' }}>
            Participar es muy fácil, sigue estos simples pasos
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            
            return (
              <div 
                key={idx}
                className="relative text-center p-6 rounded-2xl transition-all duration-200 hover:scale-[1.02]"
                style={{
                  backgroundColor: 'var(--template-card-bg)',
                  border: '1px solid var(--template-card-border)',
                }}
              >
                {/* Step number */}
                <div 
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: 'var(--template-gradient)',
                    color: 'var(--template-text-on-primary)',
                  }}
                >
                  {idx + 1}
                </div>
                
                {/* Icon */}
                <div 
                  className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--template-primary)',
                    color: 'var(--template-text-on-primary)',
                    opacity: 0.9,
                  }}
                >
                  <Icon className="w-7 h-7" />
                </div>
                
                {/* Title */}
                <h3 
                  className="text-lg font-bold mb-2"
                  style={{ color: 'var(--template-text)' }}
                >
                  {step.title}
                </h3>
                
                {/* Description */}
                <p 
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--template-text-muted)' }}
                >
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
