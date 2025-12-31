import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency-utils";
import { Check, Sparkles, Star } from "lucide-react";

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
    <div className="w-full relative">
      {/* TIER S: Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
      
      {/* Subtle background orb */}
      <motion.div 
        className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2"
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="relative flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-bold text-white text-lg tracking-tight">Paquetes con Descuento</h3>
          <p className="text-sm text-white/50">Ahorra más comprando en paquete</p>
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
              onClick={() => onSelect(pkg.quantity)}
              whileHover={{ scale: 1.04, y: -6 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex-shrink-0 w-[180px] md:w-full snap-center",
                "rounded-2xl p-8 lg:p-10 text-left transition-all duration-300",
                "border backdrop-blur-xl touch-active",
                // Default state - TIER S glassmorphism with hover glow
                !isSelected && !isBest && "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.05] hover:shadow-xl hover:shadow-emerald-500/10",
                // Best value (not selected) - TIER S animated border glow
                !isSelected && isBest && "border-emerald-500/40 bg-emerald-500/5 gradient-border-animated hover:shadow-xl hover:shadow-emerald-500/25",
                // Selected state - TIER S emerald solid with glow
                isSelected && "bg-emerald-500/10 border-emerald-500 shadow-xl shadow-emerald-500/30"
              )}
            >
              {/* Best value badge with shimmer - TIER S */}
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
              
              {/* Selected checkmark - TIER S */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
              
              {/* Content - TIER S typography */}
              <div className="space-y-5">
                {/* Quantity - Dramatic TIER S */}
                <div className="text-center">
                  <motion.span
                    key={pkg.quantity}
                    className={cn(
                      "text-5xl lg:text-6xl font-black tracking-[-0.05em]",
                      isSelected ? "text-emerald-400" : "text-white"
                    )}
                  >
                    {pkg.quantity}
                  </motion.span>
                  <p className="text-sm text-white/50 mt-1.5">
                    boletos
                  </p>
                </div>
                
                {/* Price - TIER S enhanced */}
                <div className="text-center space-y-2">
                  <p className={cn(
                    "text-2xl lg:text-3xl font-bold tracking-tight",
                    isSelected ? "text-emerald-400" : "text-white"
                  )}>
                    {formatCurrency(pkg.price, currency)}
                  </p>
                  
                  {hasDiscount && (
                    <p className="text-sm line-through text-white/30">
                      {formatCurrency(originalPrice, currency)}
                    </p>
                  )}
                </div>
                
                {/* Discount badge - TIER S with glow */}
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
                
                {/* Savings - TIER S */}
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
                  <p className="text-center text-xs truncate text-white/40">
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
