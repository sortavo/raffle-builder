import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface PricingToggleProps {
  isAnnual: boolean;
  onToggle: (value: boolean) => void;
}

export function PricingToggle({ isAnnual, onToggle }: PricingToggleProps) {
  return (
    <div className="relative inline-flex items-center gap-2 p-1.5 rounded-full bg-muted/80 backdrop-blur-sm border border-border shadow-lg">
      <button
        onClick={() => onToggle(false)}
        className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 ${
          !isAnnual ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Mensual
      </button>
      
      <button
        onClick={() => onToggle(true)}
        className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 ${
          isAnnual ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Anual
      </button>
      
      {/* Sliding background */}
      <motion.div
        className="absolute top-1.5 bottom-1.5 rounded-full bg-gradient-to-r from-primary to-primary/90 shadow-lg"
        initial={false}
        animate={{
          left: isAnnual ? '50%' : '6px',
          right: isAnnual ? '6px' : '50%',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
      
      {/* Savings badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -10 }}
        animate={{ 
          opacity: isAnnual ? 1 : 0, 
          scale: isAnnual ? 1 : 0.8,
          y: isAnnual ? 0 : -10 
        }}
        transition={{ duration: 0.3 }}
        className="absolute -top-3 -right-2"
      >
        <Badge className="bg-gradient-to-r from-success to-success/80 text-success-foreground border-0 shadow-lg shadow-success/30 px-2 py-0.5 text-xs font-bold">
          <Sparkles className="w-3 h-3 mr-1" />
          2 meses gratis
        </Badge>
      </motion.div>
    </div>
  );
}
