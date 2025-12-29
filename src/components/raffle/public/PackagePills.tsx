import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";

interface Package {
  id: string;
  quantity: number;
  price: number;
  discount_percent: number | null;
  label: string | null;
}

interface PackagePillsProps {
  packages: Package[];
  selectedQuantity: number;
  onSelect: (quantity: number) => void;
  currency: string;
  bestPackageId?: string;
}

export function PackagePills({
  packages,
  selectedQuantity,
  onSelect,
  currency,
  bestPackageId,
}: PackagePillsProps) {
  if (packages.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground px-1">
        Paquetes con descuento:
      </p>
      <div className="flex flex-wrap gap-2">
        {packages.map((pkg) => {
          const isSelected = selectedQuantity === pkg.quantity;
          const isBest = pkg.id === bestPackageId;
          
          return (
            <motion.button
              key={pkg.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(pkg.quantity)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-medium",
                isSelected
                  ? "bg-gradient-to-r from-primary to-accent border-transparent text-white shadow-lg"
                  : "bg-white border-border hover:border-primary/50"
              )}
            >
              {/* Popular badge */}
              {isBest && !isSelected && (
                <Badge className="absolute -top-2 -right-2 bg-amber-500 text-amber-950 text-[10px] px-1.5 py-0.5">
                  🔥 Popular
                </Badge>
              )}
              
              <span className="text-lg font-bold">{pkg.quantity}</span>
              <span className={cn(
                "text-sm",
                isSelected ? "text-white/90" : "text-muted-foreground"
              )}>
                {formatCurrency(pkg.price, currency)}
              </span>
              
              {pkg.discount_percent && pkg.discount_percent > 0 && (
                <Badge 
                  variant={isSelected ? "secondary" : "outline"}
                  className={cn(
                    "text-xs font-bold",
                    isSelected 
                      ? "bg-white/20 text-white border-white/30" 
                      : "bg-green-100 text-green-700 border-green-200"
                  )}
                >
                  -{pkg.discount_percent}%
                </Badge>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
