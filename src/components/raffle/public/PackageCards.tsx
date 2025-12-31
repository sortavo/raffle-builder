import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency-utils";
import { Check, Sparkles } from "lucide-react";
import { PREMIUM_COLORS } from "./design-tokens";

interface Package {
  id: string;
  quantity: number;
  price: number;
  discount_percent: number | null;
  label: string | null;
}

interface PackageCardsProps {
  packages: Package[];
  ticketPrice: number;
  currency: string;
  selectedQuantity: number;
  onSelect: (quantity: number) => void;
  bestPackageId?: string;
}

export function PackageCards({
  packages,
  ticketPrice,
  currency,
  selectedQuantity,
  onSelect,
  bestPackageId,
}: PackageCardsProps) {
  if (packages.length === 0) return null;

  // Sort packages by quantity
  const sortedPackages = [...packages].sort((a, b) => a.quantity - b.quantity);
  
  // Find best value if not provided
  const actualBestId = bestPackageId || sortedPackages.reduce((best, pkg) => {
    if (!best || (pkg.discount_percent || 0) > (packages.find(p => p.id === best)?.discount_percent || 0)) {
      return pkg.id;
    }
    return best;
  }, sortedPackages[0]?.id);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4" style={{ color: PREMIUM_COLORS.accent.emerald }} />
        <h3 className="font-semibold text-white text-sm tracking-tight">Paquetes con Descuento</h3>
      </div>
      
      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:mx-0 md:px-0">
        {sortedPackages.map((pkg, index) => {
          const isSelected = selectedQuantity === pkg.quantity;
          const isBest = pkg.id === actualBestId;
          const originalPrice = pkg.quantity * ticketPrice;
          const savings = originalPrice - pkg.price;
          const hasDiscount = (pkg.discount_percent || 0) > 0;
          
          return (
            <motion.button
              key={pkg.id}
              onClick={() => onSelect(pkg.quantity)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex-shrink-0 w-[150px] md:w-full snap-center",
                "rounded-xl p-4 text-left transition-all duration-200",
                "border backdrop-blur-sm",
                // Default state - dark glassmorphism
                !isSelected && !isBest && [
                  "border-white/[0.06]",
                ],
                // Best value (not selected) - subtle emerald
                !isSelected && isBest && [
                  "border-emerald-500/30",
                ],
                // Selected state - emerald solid
                isSelected && [
                  "bg-emerald-500/10 border-emerald-500",
                ]
              )}
              style={{
                backgroundColor: isSelected 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : isBest 
                    ? 'rgba(16, 185, 129, 0.05)' 
                    : PREMIUM_COLORS.bg.card
              }}
            >
              {/* Best value badge */}
              {isBest && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10"
                >
                  <span 
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                    style={{ 
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: PREMIUM_COLORS.accent.emerald
                    }}
                  >
                    Mejor Valor
                  </span>
                </motion.div>
              )}
              
              {/* Selected checkmark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
              
              {/* Content */}
              <div className="space-y-3">
                {/* Quantity */}
                <div className="text-center">
                  <motion.span
                    key={pkg.quantity}
                    className={cn(
                      "text-3xl font-black tracking-tight",
                      isSelected ? "text-emerald-400" : "text-white"
                    )}
                  >
                    {pkg.quantity}
                  </motion.span>
                  <p 
                    className="text-xs"
                    style={{ color: PREMIUM_COLORS.text.muted }}
                  >
                    boletos
                  </p>
                </div>
                
                {/* Price */}
                <div className="text-center space-y-1">
                  <p className={cn(
                    "text-lg font-bold",
                    isSelected ? "text-emerald-400" : "text-white"
                  )}>
                    {formatCurrency(pkg.price, currency)}
                  </p>
                  
                  {hasDiscount && (
                    <p 
                      className="text-xs line-through"
                      style={{ color: PREMIUM_COLORS.text.dimmed }}
                    >
                      {formatCurrency(originalPrice, currency)}
                    </p>
                  )}
                </div>
                
                {/* Discount badge */}
                {hasDiscount && (
                  <div className="flex justify-center">
                    <span 
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                      style={{
                        backgroundColor: isSelected 
                          ? 'rgba(16, 185, 129, 0.2)' 
                          : 'rgba(16, 185, 129, 0.1)',
                        color: PREMIUM_COLORS.accent.emerald
                      }}
                    >
                      -{pkg.discount_percent}%
                    </span>
                  </div>
                )}
                
                {/* Savings */}
                {savings > 0 && (
                  <motion.p
                    key={savings}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-[11px] font-medium"
                    style={{ color: PREMIUM_COLORS.accent.emerald }}
                  >
                    Ahorras {formatCurrency(savings, currency)}
                  </motion.p>
                )}
                
                {/* Label */}
                {pkg.label && (
                  <p 
                    className="text-center text-[10px] truncate"
                    style={{ color: PREMIUM_COLORS.text.muted }}
                  >
                    {pkg.label}
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
