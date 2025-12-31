import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency-utils";
import { Check, Sparkles, Flame } from "lucide-react";

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
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-foreground">Paquetes con Descuento</h3>
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
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex-shrink-0 w-[160px] md:w-full snap-center",
                "rounded-2xl p-4 text-left transition-all duration-300",
                "border-2 backdrop-blur-sm",
                // Default state
                !isSelected && !isBest && [
                  "bg-card/80 border-border/50",
                  "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
                ],
                // Best value (not selected)
                !isSelected && isBest && [
                  "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
                  "border-amber-400 shadow-lg shadow-amber-500/20",
                ],
                // Selected state
                isSelected && [
                  "bg-gradient-to-br from-primary/10 to-accent/10",
                  "border-primary shadow-xl shadow-primary/30",
                  "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
                ]
              )}
            >
              {/* Best value badge */}
              {isBest && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
                >
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                    <Flame className="w-3 h-3" />
                    Mejor Valor
                  </span>
                </motion.div>
              )}
              
              {/* Selected checkmark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg"
                >
                  <Check className="w-4 h-4 text-primary-foreground" />
                </motion.div>
              )}
              
              {/* Content */}
              <div className="space-y-3">
                {/* Quantity */}
                <div className="text-center">
                  <motion.span
                    key={pkg.quantity}
                    className={cn(
                      "text-4xl font-black",
                      isSelected ? "text-primary" : isBest ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                    )}
                  >
                    {pkg.quantity}
                  </motion.span>
                  <p className="text-sm text-muted-foreground">boletos</p>
                </div>
                
                {/* Price */}
                <div className="text-center space-y-1">
                  <p className={cn(
                    "text-xl font-bold",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {formatCurrency(pkg.price, currency)}
                  </p>
                  
                  {hasDiscount && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatCurrency(originalPrice, currency)}
                    </p>
                  )}
                </div>
                
                {/* Discount badge */}
                {hasDiscount && (
                  <div className="flex justify-center">
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold",
                      isSelected 
                        ? "bg-primary/20 text-primary"
                        : isBest 
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          : "bg-success/20 text-success"
                    )}>
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
                    className={cn(
                      "text-center text-xs font-medium",
                      isSelected ? "text-primary" : "text-success"
                    )}
                  >
                    Ahorras {formatCurrency(savings, currency)}
                  </motion.p>
                )}
                
                {/* Label */}
                {pkg.label && (
                  <p className="text-center text-xs text-muted-foreground truncate">
                    {pkg.label}
                  </p>
                )}
              </div>
              
              {/* Animated glow for best value */}
              {isBest && !isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(245, 158, 11, 0)",
                      "0 0 20px 4px rgba(245, 158, 11, 0.3)",
                      "0 0 0 0 rgba(245, 158, 11, 0)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "loop",
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
