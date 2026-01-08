// ============================================================================
// Ticket Selector Section - Critical (Priority 2)
// ============================================================================
// Ticket selection grid and purchase controls

import { TicketSelector } from '../TicketSelector';
import type { SectionProps } from './types';

export function TicketSelectorSection({ 
  raffle, 
  organization,
  currency = 'MXN',
  isPreview = false,
  onTicketSelect,
  selectedTickets = [],
  onCheckout
}: SectionProps) {
  // In preview mode, show a simplified version
  if (isPreview) {
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
              Selecciona tus Boletos
            </h2>
            <p style={{ color: 'var(--template-text-muted)' }}>
              Elige tus números de la suerte
            </p>
          </div>
          
          {/* Preview grid placeholder */}
          <div 
            className="grid grid-cols-10 gap-1 max-w-md mx-auto p-4 rounded-2xl"
            style={{
              backgroundColor: 'var(--template-card-bg)',
              border: '1px solid var(--template-card-border)',
            }}
          >
            {Array.from({ length: 50 }, (_, i) => (
              <div 
                key={i}
                className="aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-colors"
                style={{
                  backgroundColor: i % 7 === 0 
                    ? 'var(--template-primary)' 
                    : 'var(--template-input-bg)',
                  color: i % 7 === 0 
                    ? 'var(--template-text-on-primary)' 
                    : 'var(--template-text)',
                  border: '1px solid var(--template-input-border)',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  
  // Full ticket selector for live page
  return (
    <section 
      id="tickets"
      className="py-8 lg:py-12"
      style={{
        backgroundColor: 'var(--template-bg)',
        color: 'var(--template-text)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TicketSelector 
          raffleId={raffle.id || ''}
          totalTickets={raffle.total_tickets || 100}
          ticketPrice={raffle.ticket_price || 0}
          maxPerPurchase={raffle.max_tickets_per_purchase}
          minPerPurchase={raffle.min_tickets_per_purchase}
          luckyNumbersEnabled={raffle.lucky_numbers_enabled}
          luckyNumbersConfig={raffle.lucky_numbers_config as any}
          selectedTickets={selectedTickets}
          onSelectionChange={onTicketSelect}
        />
      </div>
    </section>
  );
}
