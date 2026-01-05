import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Car, Home, Building, ArrowRight, Sparkles, Ticket } from "lucide-react";

interface DemoSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEMOS = [
  {
    id: 'demo1',
    title: 'Toyota Corolla 2027',
    organization: 'Sorteos El Dorado',
    tickets: 50000,
    price: 100,
    currency: 'MXN',
    url: '/demo1/demo1-sorteo-1767565405438',
    Icon: Car,
    description: 'Ideal para sorteos pequeños y medianos',
    gradient: 'from-amber-500 to-orange-500',
    bgGlow: 'bg-amber-500/20',
  },
  {
    id: 'demo2',
    title: 'Casa en Playa del Carmen',
    organization: 'Fundación Esperanza',
    tickets: 400000,
    price: 50,
    currency: 'MXN',
    url: '/demo2/demo2-sorteo-1767565422739',
    Icon: Home,
    description: 'Ideal para sorteos benéficos de gran escala',
    gradient: 'from-blue-500 to-cyan-500',
    bgGlow: 'bg-blue-500/20',
  },
  {
    id: 'demo3',
    title: 'Residencia en Los Cabos',
    organization: 'Loterías Nacionales Premium',
    tickets: 5000000,
    price: 20,
    currency: 'MXN',
    url: '/demo3/demo3-sorteo-1767565423031',
    Icon: Building,
    description: 'Ideal para mega sorteos nacionales',
    gradient: 'from-violet-500 to-purple-500',
    bgGlow: 'bg-violet-500/20',
    isMega: true,
  },
];

export function DemoSelectorDialog({ open, onOpenChange }: DemoSelectorDialogProps) {
  const navigate = useNavigate();

  const handleDemoClick = (url: string) => {
    onOpenChange(false);
    navigate(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl bg-ultra-dark border-white/10 p-0 overflow-hidden"
        hideCloseButton={false}
      >
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-transparent to-violet-950/20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="relative p-6 sm:p-8">
          {/* Header */}
          <DialogHeader className="mb-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mb-3"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Demos en Vivo
                </span>
              </div>
            </motion.div>
            <DialogTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
              Explora Sortavo en Acción
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              Elige la escala que mejor represente tu próximo sorteo
            </DialogDescription>
          </DialogHeader>

          {/* Demo Cards */}
          <div className="space-y-3">
            <AnimatePresence>
              {DEMOS.map((demo, index) => (
                <motion.div
                  key={demo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative group cursor-pointer
                    bg-white/[0.03] backdrop-blur-xl rounded-xl
                    border border-white/[0.08] hover:border-white/[0.15]
                    transition-all duration-300 overflow-hidden
                    ${demo.isMega ? 'ring-1 ring-violet-500/30' : ''}
                  `}
                  onClick={() => handleDemoClick(demo.url)}
                >
                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 ${demo.bgGlow} opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300`} />
                  
                  {/* MEGA badge */}
                  {demo.isMega && (
                    <div className="absolute top-3 right-3">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="px-2 py-1 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shadow-lg shadow-violet-500/30"
                      >
                        ⭐ MEGA
                      </motion.div>
                    </div>
                  )}

                  <div className="relative p-4 sm:p-5 flex items-center gap-4">
                    {/* Icon */}
                    <div className={`
                      w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0
                      bg-gradient-to-br ${demo.gradient} shadow-lg
                    `}>
                      <demo.Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-base sm:text-lg truncate pr-16 sm:pr-0">
                        {demo.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {demo.organization}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <span className="flex items-center gap-1.5 text-sm">
                          <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-white font-medium">
                            {demo.tickets.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground">boletos</span>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ${demo.price} {demo.currency} c/u
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 hidden sm:block">
                        {demo.description}
                      </p>
                    </div>

                    {/* CTA */}
                    <div className="flex-shrink-0 hidden sm:block">
                      <Button
                        size="sm"
                        variant="gradient"
                        className="shadow-lg shadow-emerald-600/20 group-hover:shadow-emerald-500/30 transition-shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDemoClick(demo.url);
                        }}
                      >
                        Ver Demo
                        <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile CTA overlay */}
                  <div className="sm:hidden absolute inset-y-0 right-0 flex items-center pr-4">
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Footer hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-xs text-muted-foreground mt-6"
          >
            Explora libremente • No se requiere cuenta
          </motion.p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
