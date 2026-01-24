// ============================================================================
// Countdown Section - Critical (Priority 3)
// ============================================================================
// Timer showing time remaining until draw

import { CountdownTimer } from '../CountdownTimer';
import { Clock } from 'lucide-react';
import type { SectionProps } from './types';

export function CountdownSection({ 
  raffle, 
  currency,
  isPreview = false 
}: SectionProps) {
  const drawDate = raffle.draw_date ? new Date(raffle.draw_date) : null;
  
  // Don't render if no draw date
  if (!drawDate) {
    return null;
  }
  
  return (
    <section 
      className="py-8 lg:py-12"
      style={{
        backgroundColor: 'var(--template-bg)',
        color: 'var(--template-text)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{
              backgroundColor: 'var(--template-card-bg)',
              border: '1px solid var(--template-card-border)',
            }}
          >
            <Clock 
              className="w-4 h-4" 
              style={{ color: 'var(--template-primary)' }}
            />
            <span 
              className="text-sm font-medium"
              style={{ color: 'var(--template-text-muted)' }}
            >
              Tiempo restante para el sorteo
            </span>
          </div>
        </div>
        
        <CountdownTimer 
          targetDate={drawDate}
          variant="lottery"
          showLabels={true}
          primaryColor="var(--template-primary)"
          isLightTemplate={true} // Will use CSS variable check
        />
        
        {/* Draw date label */}
        <p 
          className="text-center mt-6 text-sm"
          style={{ color: 'var(--template-text-muted)' }}
        >
          Sorteo: {drawDate.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </section>
  );
}
