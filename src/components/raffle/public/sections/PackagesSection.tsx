// ============================================================================
// Packages Section - Important (Priority 6)
// ============================================================================
// Discounted ticket packages

import { Package, Percent, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { cn } from '@/lib/utils';
import type { SectionProps } from './types';

interface PackageData {
  quantity: number;
  price: number;
  discount_percent?: number;
  label?: string;
}

export function PackagesSection({ 
  raffle, 
  currency = 'MXN',
  isPreview = false 
}: SectionProps) {
  // Get packages from raffle data or use defaults for preview
  const packages: PackageData[] = isPreview 
    ? [
        { quantity: 1, price: raffle.ticket_price || 50, label: 'Individual' },
        { quantity: 5, price: (raffle.ticket_price || 50) * 4.5, discount_percent: 10, label: 'Popular' },
        { quantity: 10, price: (raffle.ticket_price || 50) * 8, discount_percent: 20, label: 'Mejor valor' },
      ]
    : [];
  
  // Don't render if no packages
  if (packages.length === 0) {
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
        <div className="text-center mb-8">
          <h2 
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ fontFamily: 'var(--template-font-title)' }}
          >
            Paquetes con Descuento
          </h2>
          <p style={{ color: 'var(--template-text-muted)' }}>
            Ahorra más comprando paquetes
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {packages.map((pkg, idx) => {
            const isPopular = pkg.label === 'Popular' || idx === 1;
            
            return (
              <div 
                key={idx}
                className={cn(
                  "relative p-6 rounded-2xl transition-all duration-200 hover:scale-[1.02] cursor-pointer",
                  isPopular && "ring-2"
                )}
                style={{
                  backgroundColor: 'var(--template-card-bg)',
                  border: '1px solid var(--template-card-border)',
                  // @ts-ignore - CSS variable for ring color
                  '--tw-ring-color': isPopular ? 'var(--template-primary)' : undefined,
                }}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                    style={{
                      background: 'var(--template-gradient)',
                      color: 'var(--template-text-on-primary)',
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    {pkg.label || 'Popular'}
                  </div>
                )}
                
                <div className="text-center">
                  {/* Package icon */}
                  <div 
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{
                      backgroundColor: isPopular 
                        ? 'var(--template-primary)' 
                        : 'var(--template-input-bg)',
                      color: isPopular 
                        ? 'var(--template-text-on-primary)' 
                        : 'var(--template-primary)',
                    }}
                  >
                    <Package className="w-7 h-7" />
                  </div>
                  
                  {/* Quantity */}
                  <p 
                    className="text-4xl font-black mb-1"
                    style={{ color: 'var(--template-text)' }}
                  >
                    {pkg.quantity}
                  </p>
                  <p 
                    className="text-sm mb-4"
                    style={{ color: 'var(--template-text-muted)' }}
                  >
                    boleto{pkg.quantity !== 1 && 's'}
                  </p>
                  
                  {/* Price */}
                  <p 
                    className="text-2xl font-bold mb-2"
                    style={{ color: 'var(--template-primary)' }}
                  >
                    {formatCurrency(pkg.price, currency)}
                  </p>
                  
                  {/* Discount badge */}
                  {pkg.discount_percent && pkg.discount_percent > 0 && (
                    <div 
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: 'var(--template-primary)',
                        color: 'var(--template-text-on-primary)',
                        opacity: 0.9,
                      }}
                    >
                      <Percent className="w-3 h-3" />
                      Ahorras {pkg.discount_percent}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
