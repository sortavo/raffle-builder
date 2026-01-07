import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency-utils";
import { Check, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";

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
  onOpenCheckout?: () => void;
  bestPackageId?: string;
  isLightTemplate?: boolean;
  primaryColor?: string;
}

export function PackageCards({
  packages,
  ticketPrice,
  currency,
  selectedQuantity,
  onSelect,
  onOpenCheckout,
  bestPackageId,
  isLightTemplate = false,
  primaryColor,
}: PackageCardsProps) {
  if (packages.length === 0) return null;

  // Theme-aware colors
  const colors = isLightTemplate ? {
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    textSubtle: 'text-gray-400',
    cardBg: 'bg-white',
    border: 'border-gray-200',
    hoverBorder: 'hover:border-gray-300',
    hoverBg: 'hover:bg-gray-50',
    hoverShadow: 'hover:shadow-xl hover:shadow-emerald-500/10',
    orbBg: 'bg-emerald-300/20',
  } : {
    text: 'text-white',
    textMuted: 'text-white/50',
    textSubtle: 'text-white/40',
    cardBg: 'bg-white/[0.03]',
    border: 'border-white/[0.08]',
    hoverBorder: 'hover:border-white/[0.15]',
    hoverBg: 'hover:bg-white/[0.05]',
    hoverShadow: 'hover:shadow-xl hover:shadow-emerald-500/10',
    orbBg: 'bg-emerald-500/5',
  };

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
    <div className="w-full relative">
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
      
      {/* Subtle background orb */}
      <motion.div 
        className={cn(
          "absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2",
          colors.orbBg
        )}
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="relative flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h3 className={cn("font-bold text-lg tracking-tight", colors.text)}>Paquetes con Descuento</h3>
          <p className={cn("text-sm", colors.textMuted)}>Ahorra más comprando en paquete</p>
        </div>
      </div>
      
      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="relative flex gap-4 overflow-x-auto pb-3 -mx-2 px-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:mx-0 md:px-0">
        {sortedPackages.map((pkg, index) => {
          const isSelected = selectedQuantity === pkg.quantity;
          const isBest = pkg.id === actualBestId;
          const originalPrice = pkg.quantity * ticketPrice;
          const savings = originalPrice - pkg.price;
          const hasDiscount = (pkg.discount_percent || 0) > 0;
          
          return (
            <motion.button
              key={pkg.id}
              onClick={() => {
                onSelect(pkg.quantity);
                // Show toast with quick checkout action
                toast.success(`${pkg.quantity} boletos seleccionados`, {
                  description: `Total: ${formatCurrency(pkg.price, currency)}`,
                  action: onOpenCheckout ? {
                    label: 'Ir a pagar',
                    onClick: onOpenCheckout,
                  } : undefined,
                });
              }}
              whileHover={{ scale: 1.04, y: -6 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex-shrink-0 w-[180px] md:w-full snap-center",
                "rounded-2xl p-8 lg:p-10 text-left transition-all duration-300",
                "border backdrop-blur-xl touch-active",
                // Default state
                !isSelected && !isBest && cn(colors.cardBg, colors.border, colors.hoverBorder, colors.hoverBg, colors.hoverShadow),
                // Best value (not selected)
                !isSelected && isBest && "border-emerald-500/40 bg-emerald-500/5 gradient-border-animated hover:shadow-xl hover:shadow-emerald-500/25",
                // Selected state - use custom primary color if available
                isSelected && "shadow-xl"
              )}
              style={isSelected && primaryColor ? {
                backgroundColor: `${primaryColor}20`,
                borderColor: primaryColor,
                boxShadow: `0 20px 25px -5px ${primaryColor}40`,
              } : isSelected ? {
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: '#10b981',
                boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.3)',
              } : undefined}
            >
              {/* Best value badge */}
              {isBest && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
                >
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 shimmer-badge border border-emerald-500/30">
                    <Star className="w-3 h-3 fill-current" />
                    Mejor Valor
                  </span>
                </motion.div>
              )}
              
              {/* Selected checkmark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
              
              {/* Content */}
              <div className="space-y-5">
                {/* Quantity */}
                <div className="text-center">
                  <motion.span
                    key={pkg.quantity}
                    className={cn(
                      "text-5xl lg:text-6xl font-black tracking-[-0.05em]",
                      isSelected ? "text-emerald-400" : colors.text
                    )}
                  >
                    {pkg.quantity}
                  </motion.span>
                  <p className={cn("text-sm mt-1.5", colors.textMuted)}>
                    boletos
                  </p>
                </div>
                
                {/* Price */}
                <div className="text-center space-y-2">
                  <p className={cn(
                    "text-2xl lg:text-3xl font-bold tracking-tight",
                    isSelected ? "text-emerald-400" : colors.text
                  )}>
                    {formatCurrency(pkg.price, currency)}
                  </p>
                  
                  {hasDiscount && (
                    <p className={cn("text-sm line-through", colors.textSubtle)}>
                      {formatCurrency(originalPrice, currency)}
                    </p>
                  )}
                </div>
                
                {/* Discount badge */}
                {hasDiscount && (
                  <div className="flex justify-center">
                    <span 
                      className={cn(
                        "inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold text-emerald-400",
                        isSelected ? "bg-emerald-500/25" : "bg-emerald-500/15"
                      )}
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
                    className="text-center text-sm font-semibold text-emerald-400"
                  >
                    Ahorras {formatCurrency(savings, currency)}
                  </motion.p>
                )}
                
                {/* Label */}
                {pkg.label && (
                  <p className={cn("text-center text-xs truncate", colors.textSubtle)}>
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