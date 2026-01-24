// ============================================================================
// Stats Section - Important (Priority 4)
// ============================================================================
// Price, draw date, tickets sold, and progress

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Ticket, Calendar, Target, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import type { SectionProps } from './types';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}

function StatCard({ icon, label, value, subValue }: StatCardProps) {
  return (
    <div 
      className="p-5 rounded-2xl transition-all duration-200 hover:scale-[1.02]"
      style={{
        backgroundColor: 'var(--template-card-bg)',
        border: '1px solid var(--template-card-border)',
      }}
    >
      <div className="flex items-start gap-4">
        <div 
          className="p-3 rounded-xl"
          style={{
            backgroundColor: 'var(--template-primary)',
            color: 'var(--template-text-on-primary)',
            opacity: 0.9,
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p 
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--template-text-muted)' }}
          >
            {label}
          </p>
          <p 
            className="text-2xl font-black truncate"
            style={{ color: 'var(--template-text)' }}
          >
            {value}
          </p>
          {subValue && (
            <p 
              className="text-xs mt-1"
              style={{ color: 'var(--template-text-muted)' }}
            >
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatsSection({ 
  raffle, 
  currency = 'MXN',
  isPreview = false 
}: SectionProps) {
  const ticketPrice = raffle.ticket_price || 0;
  const totalTickets = raffle.total_tickets || 100;
  const drawDate = raffle.draw_date ? new Date(raffle.draw_date) : null;
  
  // Calculate sold tickets (placeholder for preview)
  const soldTickets = isPreview ? Math.floor(totalTickets * 0.35) : 0;
  const progress = (soldTickets / totalTickets) * 100;
  
  return (
    <section 
      className="py-8 lg:py-12"
      style={{
        backgroundColor: 'var(--template-bg)',
        color: 'var(--template-text)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            icon={<Ticket className="w-5 h-5" />}
            label="Precio por boleto"
            value={formatCurrency(ticketPrice, currency)}
          />
          
          <StatCard 
            icon={<Calendar className="w-5 h-5" />}
            label="Fecha del sorteo"
            value={drawDate ? drawDate.toLocaleDateString('es-MX', { 
              day: 'numeric', 
              month: 'short' 
            }) : 'Por definir'}
            subValue={drawDate ? drawDate.toLocaleTimeString('es-MX', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : undefined}
          />
          
          <StatCard 
            icon={<Target className="w-5 h-5" />}
            label="Total boletos"
            value={totalTickets.toLocaleString()}
          />
          
          <StatCard 
            icon={<TrendingUp className="w-5 h-5" />}
            label="Vendidos"
            value={`${soldTickets.toLocaleString()}`}
            subValue={`${progress.toFixed(1)}% del total`}
          />
        </div>
        
        {/* Progress bar */}
        <div 
          className="mt-6 p-4 rounded-2xl"
          style={{
            backgroundColor: 'var(--template-card-bg)',
            border: '1px solid var(--template-card-border)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span 
              className="text-sm font-medium"
              style={{ color: 'var(--template-text-muted)' }}
            >
              Progreso de ventas
            </span>
            <span 
              className="text-sm font-bold"
              style={{ color: 'var(--template-primary)' }}
            >
              {progress.toFixed(1)}%
            </span>
          </div>
          <div 
            className="h-3 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--template-input-bg)' }}
          >
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'var(--template-gradient)',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
