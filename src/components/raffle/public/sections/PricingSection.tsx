// ============================================================================
// Pricing Section - Price per ticket and discount packages
// ============================================================================
// Displays prominently BEFORE the countdown for maximum visibility

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency-utils";
import { PackageCards } from "../PackageCards";

interface Package {
  id: string;
  quantity: number;
  price: number;
  discount_percent: number | null;
  label: string | null;
}

interface PricingSectionProps {
  ticketPrice: number;
  packages: Package[];
  currencyCode: string;
  isLightTemplate?: boolean;
  primaryColor?: string;
  onPackageSelect?: (quantity: number) => void;
  useOpportunitiesLanguage?: boolean;
  opportunitiesMultiplier?: number; // For display: "4 OPORTUNIDADES" badge
}

export function PricingSection({
  ticketPrice,
  packages,
  currencyCode,
  isLightTemplate = false,
  primaryColor,
  onPackageSelect,
  useOpportunitiesLanguage = false,
  opportunitiesMultiplier,
}: PricingSectionProps) {
  // Theme-aware colors
  const colors = isLightTemplate ? {
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    cardBg: 'bg-white',
    border: 'border-gray-200',
    sectionBg: 'bg-gray-50/50',
  } : {
    text: 'text-white',
    textMuted: 'text-gray-400',
    cardBg: 'bg-white/[0.03]',
    border: 'border-white/[0.08]',
    sectionBg: 'bg-ultra-dark',
  };

  // Find best package (highest discount)
  const bestPackage = packages.length > 0 
    ? packages.reduce((best, pkg) => 
        (pkg.discount_percent || 0) > (best.discount_percent || 0) ? pkg : best
      , packages[0])
    : null;

  return (
    <section className={cn("py-12 lg:py-16", colors.sectionBg)}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Precio por boleto - prominente */}
        <div className={cn(
          "text-center p-6 sm:p-8 rounded-2xl border backdrop-blur-xl",
          colors.cardBg, colors.border
        )}>
          <p className={cn("text-sm font-medium mb-2", colors.textMuted)}>
            {useOpportunitiesLanguage ? 'Precio por oportunidad' : 'Precio por boleto'}
          </p>
          <p 
            className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight"
            style={{ color: primaryColor || '#10b981' }}
          >
            {formatCurrency(ticketPrice, currencyCode)}
          </p>
          
          {/* Badge de oportunidades cuando hay multiplicador */}
          {useOpportunitiesLanguage && opportunitiesMultiplier && opportunitiesMultiplier > 1 && (
            <div className="mt-4">
              <span 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold text-white animate-pulse"
                style={{ background: `linear-gradient(135deg, ${primaryColor || '#10b981'}, ${primaryColor ? `${primaryColor}cc` : '#059669'})` }}
              >
                <Sparkles className="w-5 h-5" />
                ×{opportunitiesMultiplier} OPORTUNIDADES
              </span>
            </div>
          )}
        </div>

        {/* Paquetes de descuento - debajo del precio */}
        {packages.length > 0 && (
          <div className="space-y-4 mt-8">
            <div className="text-center">
              <p className={cn("text-sm font-medium flex items-center justify-center gap-2", colors.textMuted)}>
                <Sparkles className="w-4 h-4 text-amber-500" />
                Ahorra con nuestros paquetes
              </p>
            </div>
            <PackageCards
              packages={packages}
              ticketPrice={ticketPrice}
              currency={currencyCode}
              selectedQuantity={0}
              onSelect={(qty) => onPackageSelect?.(qty)}
              onOpenCheckout={() => {
                // Will scroll to tickets after selection
              }}
              bestPackageId={bestPackage?.id}
              isLightTemplate={isLightTemplate}
              primaryColor={primaryColor}
            />
          </div>
        )}
      </div>
    </section>
  );
}
