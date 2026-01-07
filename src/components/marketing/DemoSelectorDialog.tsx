import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Car, Home, Castle, Watch, Bike, Plane, Gamepad2, 
  Gift, Laptop, Banknote, Palmtree, ArrowRight, Sparkles, Ticket 
} from "lucide-react";

interface DemoSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEMOS = [
  // Demo1 - Sorteos El Dorado
  {
    id: 'demo1-1',
    title: 'Mercedes-Benz Año Nuevo 2027',
    organization: 'Sorteos El Dorado',
    tickets: 500000,
    price: 150,
    url: '/demo1/demo1-sorteo-1-1767822815416',
    Icon: Car,
    gradient: 'from-amber-500 to-orange-500',
    isMega: false,
  },
  {
    id: 'demo1-2',
    title: 'Tech Gamer Festival',
    organization: 'Sorteos El Dorado',
    tickets: 1000000,
    price: 80,
    url: '/demo1/demo1-sorteo-2-1767822815841',
    Icon: Gamepad2,
    gradient: 'from-purple-500 to-pink-500',
    isMega: false,
  },
  {
    id: 'demo1-3',
    title: 'Viaje Europa 2027',
    organization: 'Sorteos El Dorado',
    tickets: 300000,
    price: 200,
    url: '/demo1/demo1-sorteo-3-1767822816216',
    Icon: Plane,
    gradient: 'from-sky-500 to-blue-500',
    isMega: false,
  },
  {
    id: 'demo1-4',
    title: 'Canasta Navideña Premium',
    organization: 'Sorteos El Dorado',
    tickets: 5000,
    price: 35,
    url: '/demo1/demo1-sorteo-4-1767822816586',
    Icon: Gift,
    gradient: 'from-red-500 to-rose-500',
    isMega: false,
  },
  // Demo2 - Fundación Esperanza
  {
    id: 'demo2-1',
    title: 'Casa de Playa',
    organization: 'Fundación Esperanza',
    tickets: 3000000,
    price: 50,
    url: '/demo2/demo2-sorteo-1-1767822815365',
    Icon: Home,
    gradient: 'from-blue-500 to-cyan-500',
    isMega: true,
  },
  {
    id: 'demo2-2',
    title: 'Harley-Davidson',
    organization: 'Fundación Esperanza',
    tickets: 500000,
    price: 120,
    url: '/demo2/demo2-sorteo-2-1767822815831',
    Icon: Bike,
    gradient: 'from-orange-600 to-amber-500',
    isMega: false,
  },
  {
    id: 'demo2-3',
    title: 'Un Millón en Efectivo',
    organization: 'Fundación Esperanza',
    tickets: 2000000,
    price: 100,
    url: '/demo2/demo2-sorteo-3-1767822816212',
    Icon: Banknote,
    gradient: 'from-green-500 to-emerald-500',
    isMega: false,
  },
  {
    id: 'demo2-4',
    title: 'Laptop Gamer ASUS',
    organization: 'Fundación Esperanza',
    tickets: 25000,
    price: 45,
    url: '/demo2/demo2-sorteo-4-1767822816545',
    Icon: Laptop,
    gradient: 'from-violet-500 to-purple-500',
    isMega: false,
  },
  // Demo3 - Loterías Nacionales Premium
  {
    id: 'demo3-1',
    title: 'MEGA Mansión Los Cabos',
    organization: 'Loterías Premium',
    tickets: 10000000,
    price: 20,
    url: '/demo3/demo3-sorteo-1-1767822816298',
    Icon: Castle,
    gradient: 'from-violet-600 to-purple-600',
    isMega: true,
  },
  {
    id: 'demo3-2',
    title: 'Ferrari 296 GTB',
    organization: 'Loterías Premium',
    tickets: 7000000,
    price: 30,
    url: '/demo3/demo3-sorteo-2-1767822816807',
    Icon: Car,
    gradient: 'from-red-600 to-red-500',
    isMega: true,
  },
  {
    id: 'demo3-3',
    title: 'Relojes de Lujo',
    organization: 'Loterías Premium',
    tickets: 5000000,
    price: 35,
    url: '/demo3/demo3-sorteo-3-1767822817245',
    Icon: Watch,
    gradient: 'from-yellow-500 to-amber-400',
    isMega: true,
  },
  {
    id: 'demo3-4',
    title: 'Viaje Cancún',
    organization: 'Loterías Premium',
    tickets: 50000,
    price: 60,
    url: '/demo3/demo3-sorteo-4-1767822817645',
    Icon: Palmtree,
    gradient: 'from-teal-500 to-cyan-400',
    isMega: false,
  },
];

function formatTickets(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(count % 1000000 === 0 ? 0 : 1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}K`;
  }
  return count.toLocaleString();
}

export function DemoSelectorDialog({ open, onOpenChange }: DemoSelectorDialogProps) {
  const navigate = useNavigate();

  const handleDemoClick = (url: string) => {
    onOpenChange(false);
    navigate(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl bg-ultra-dark border-white/10 p-0 overflow-hidden max-h-[90vh]"
        hideCloseButton={false}
      >
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-transparent to-violet-950/20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="relative p-4 sm:p-6 overflow-y-auto max-h-[85vh]">
          {/* Header */}
          <DialogHeader className="mb-4 sm:mb-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mb-2"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  12 Demos en Vivo
                </span>
              </div>
            </motion.div>
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
              Explora Sortavo en Acción
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Elige cualquier rifa demo para ver la experiencia completa
            </DialogDescription>
          </DialogHeader>

          {/* Demo Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            <AnimatePresence>
              {DEMOS.map((demo, index) => (
                <motion.div
                  key={demo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className={`
                    relative group cursor-pointer
                    bg-white/[0.03] backdrop-blur-xl rounded-lg
                    border border-white/[0.08] hover:border-white/[0.2]
                    transition-all duration-300 overflow-hidden
                    ${demo.isMega ? 'ring-1 ring-violet-500/40' : ''}
                  `}
                  onClick={() => handleDemoClick(demo.url)}
                >
                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${demo.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  
                  <div className="relative p-3 flex items-center gap-3">
                    {/* Icon */}
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      bg-gradient-to-br ${demo.gradient} shadow-lg
                    `}>
                      <demo.Icon className="w-5 h-5 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-sm truncate">
                          {demo.title}
                        </h3>
                        {demo.isMega && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded text-[9px] font-bold text-white uppercase">
                            MEGA
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {demo.organization}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-xs">
                          <Ticket className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">
                            {formatTickets(demo.tickets)}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ${demo.price}
                        </span>
                      </div>
                    </div>

                    {/* Arrow indicator */}
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400 transition-colors flex-shrink-0" />
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
            className="text-center text-xs text-muted-foreground mt-4"
          >
            Explora libremente • No se requiere cuenta
          </motion.p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
