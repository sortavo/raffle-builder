// ============================================================================
// Hero Section - Critical (Priority 1)
// ============================================================================
// Main header section with title, badges, description and hero image

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, Ticket, Award, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import type { SectionProps } from './types';

export function HeroSection({ 
  raffle, 
  organization, 
  currency = 'MXN',
  isPreview = false 
}: SectionProps) {
  const title = raffle.title || 'Título del Sorteo';
  const prizeName = raffle.prize_name || 'Premio Principal';
  const description = raffle.description || '';
  const prizeValue = raffle.prize_value;
  const ticketPrice = raffle.ticket_price || 0;
  const totalTickets = raffle.total_tickets || 100;
  
  // Get first image or placeholder
  const heroImage = raffle.prize_images?.[0] || '/placeholder.svg';
  
  return (
    <section 
      className="relative py-8 lg:py-16"
      style={{
        backgroundColor: 'var(--template-bg)',
        color: 'var(--template-text)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content */}
          <div className="order-2 lg:order-1 space-y-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {organization?.verified && (
                <Badge 
                  className="gap-1.5"
                  style={{
                    backgroundColor: 'var(--template-primary)',
                    color: 'var(--template-text-on-primary)',
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verificado
                </Badge>
              )}
              <Badge 
                variant="outline"
                className="gap-1.5"
                style={{
                  borderColor: 'var(--template-card-border)',
                  color: 'var(--template-text-muted)',
                }}
              >
                <Ticket className="w-3.5 h-3.5" />
                {totalTickets.toLocaleString()} boletos
              </Badge>
            </div>
            
            {/* Title */}
            <h1 
              className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight"
              style={{ fontFamily: 'var(--template-font-title)' }}
            >
              {title}
            </h1>
            
            {/* Prize name with gradient */}
            <p 
              className="text-xl md:text-2xl font-bold"
              style={{ color: 'var(--template-primary)' }}
            >
              🏆 {prizeName}
            </p>
            
            {/* Description */}
            {description && (
              <p 
                className="text-base md:text-lg leading-relaxed max-w-xl"
                style={{ color: 'var(--template-text-muted)' }}
              >
                {description}
              </p>
            )}
            
            {/* Price highlight */}
            <div 
              className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl"
              style={{
                backgroundColor: 'var(--template-card-bg)',
                border: '1px solid var(--template-card-border)',
              }}
            >
              <span 
                className="text-sm font-medium"
                style={{ color: 'var(--template-text-muted)' }}
              >
                Desde
              </span>
              <span 
                className="text-3xl md:text-4xl font-black"
                style={{ color: 'var(--template-primary)' }}
              >
                {formatCurrency(ticketPrice, currency)}
              </span>
              <span 
                className="text-sm"
                style={{ color: 'var(--template-text-muted)' }}
              >
                /boleto
              </span>
            </div>
          </div>
          
          {/* Hero Image */}
          <div className="order-1 lg:order-2 relative">
            <div 
              className="relative aspect-[4/3] rounded-3xl overflow-hidden"
              style={{
                boxShadow: 'var(--template-shadow)',
              }}
            >
              <img 
                src={heroImage}
                alt={prizeName}
                className="w-full h-full object-cover"
              />
              
              {/* Prize value badge */}
              {prizeValue && prizeValue > 0 && (
                <div 
                  className="absolute top-4 right-4 px-4 py-2 rounded-full backdrop-blur-xl"
                  style={{
                    background: 'var(--template-gradient)',
                    color: 'var(--template-text-on-primary)',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span className="font-bold">
                      {formatCurrency(prizeValue, currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
