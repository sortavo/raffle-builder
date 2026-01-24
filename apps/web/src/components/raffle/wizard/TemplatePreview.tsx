import { motion, AnimatePresence } from 'framer-motion';
import { getTemplateById, RaffleTemplate } from '@/lib/raffle-utils';
import { 
  Calendar, 
  Ticket, 
  Share2, 
  Zap,
  Users,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplatePreviewProps {
  templateId: string;
  prizeName?: string;
  prizeImage?: string;
  organizationName?: string;
  organizationLogo?: string | null;
}

export function TemplatePreview({
  templateId,
  prizeName = "Premio Principal",
  prizeImage,
  organizationName = "Tu Organización",
  organizationLogo,
}: TemplatePreviewProps) {
  const template = getTemplateById(templateId);
  const { colors, fonts, effects, layout } = template;

  // Generate initials for org logo fallback
  const initials = organizationName.substring(0, 2).toUpperCase();

  // Common ticket grid preview
  const TicketGrid = () => (
    <div className="grid grid-cols-6 gap-0.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div 
          key={i}
          className={cn(
            "aspect-square rounded-sm text-[5px] font-medium flex items-center justify-center",
            i < 4 ? "bg-gray-300 text-gray-500" : "text-white"
          )}
          style={{ 
            backgroundColor: i >= 4 ? `${colors.primary}30` : undefined,
            color: i >= 4 ? colors.primary : undefined,
          }}
        >
          {String(i + 1).padStart(2, '0')}
        </div>
      ))}
    </div>
  );

  // Render different layouts based on template
  const renderLayout = () => {
    switch (layout.heroStyle) {
      case 'centered':
        return (
          <div className="flex flex-col items-center text-center gap-2">
            {/* Centered Image */}
            <div 
              className="w-full aspect-[16/9] bg-gray-200 overflow-hidden"
              style={{ borderRadius: effects.borderRadius }}
            >
              {prizeImage ? (
                <img src={prizeImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Centered Info */}
            <div className="space-y-1.5 w-full">
              <div 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[6px] text-white"
                style={{ background: effects.gradient }}
              >
                <Zap className="w-2 h-2" />
                Activo
              </div>
              <h3 
                className="text-[10px] font-bold leading-tight"
                style={{ fontFamily: `"${fonts.title}", sans-serif`, color: colors.text }}
              >
                {prizeName}
              </h3>
              
              <div className="flex gap-1.5 justify-center">
                <div 
                  className="px-2 py-1 rounded text-[6px]"
                  style={{ backgroundColor: colors.cardBg, borderRadius: effects.borderRadius }}
                >
                  <Ticket className="w-2 h-2 inline mr-0.5" style={{ color: colors.primary }} />
                  $100
                </div>
                <div 
                  className="px-2 py-1 rounded text-[6px]"
                  style={{ backgroundColor: colors.cardBg, borderRadius: effects.borderRadius }}
                >
                  <Calendar className="w-2 h-2 inline mr-0.5" style={{ color: colors.primary }} />
                  15 Ene
                </div>
              </div>
              
              <button 
                className="w-full py-1 rounded text-[7px] font-medium text-white"
                style={{ background: effects.gradient, borderRadius: effects.borderRadius }}
              >
                Comprar Boletos
              </button>
            </div>
          </div>
        );

      case 'full-width':
        return (
          <div className="space-y-2">
            {/* Full width hero */}
            <div className="relative -mx-2 -mt-2">
              <div className="aspect-[16/9] bg-gray-200 overflow-hidden">
                {prizeImage ? (
                  <img src={prizeImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                    <Trophy className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Overlay badge */}
              <div 
                className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[5px] text-white font-medium"
                style={{ background: effects.gradient }}
              >
                $50,000 MXN
              </div>
              
              {/* Gradient overlay */}
              <div 
                className="absolute inset-x-0 bottom-0 h-1/2"
                style={{ background: `linear-gradient(to top, ${colors.background}, transparent)` }}
              />
            </div>
            
            {/* Floating card */}
            <div 
              className="-mt-6 relative z-10 mx-1 p-2 rounded-lg shadow-lg text-center space-y-1.5"
              style={{ backgroundColor: colors.cardBg, borderRadius: effects.borderRadius }}
            >
              <div 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[6px] text-white"
                style={{ background: effects.gradient }}
              >
                <Zap className="w-2 h-2" />
                ¡En Vivo!
              </div>
              <h3 
                className="text-[10px] font-bold leading-tight"
                style={{ fontFamily: `"${fonts.title}", sans-serif`, color: colors.text }}
              >
                {prizeName}
              </h3>
              <button 
                className="w-full py-1 rounded text-[7px] font-medium text-white"
                style={{ background: effects.gradient, borderRadius: effects.borderRadius }}
              >
                Ver Boletos
              </button>
            </div>
            
            {/* Confetti decoration for festive */}
            {layout.decorations.includes('confetti') && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full"
                    style={{
                      backgroundColor: i % 2 === 0 ? colors.primary : colors.accent,
                      left: `${10 + i * 12}%`,
                      top: -4,
                    }}
                    animate={{ y: [0, 100], opacity: [1, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'asymmetric':
        return (
          <div className="grid grid-cols-5 gap-2">
            {/* Left info column */}
            <div className="col-span-2 space-y-1.5 flex flex-col justify-center">
              <div 
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[5px] text-white w-fit"
                style={{ background: effects.gradient }}
              >
                <Zap className="w-1.5 h-1.5" />
                Activo
              </div>
              <h3 
                className="text-[9px] font-bold leading-tight"
                style={{ fontFamily: `"${fonts.title}", sans-serif`, color: colors.text }}
              >
                {prizeName}
              </h3>
              <p className="text-[5px]" style={{ color: colors.textMuted }}>
                Gran oportunidad
              </p>
              
              {/* Side price display for asymmetric */}
              {layout.pricePosition === 'side' && (
                <div 
                  className="p-1.5 rounded mt-1"
                  style={{ backgroundColor: colors.cardBg, borderRadius: effects.borderRadius }}
                >
                  <p className="text-[5px]" style={{ color: colors.textMuted }}>Valor</p>
                  <p 
                    className="text-[9px] font-bold"
                    style={{ color: colors.primary, fontFamily: `"${fonts.title}", sans-serif` }}
                  >
                    $50,000
                  </p>
                </div>
              )}
              
              <button 
                className="w-full py-1 rounded text-[6px] font-medium text-white mt-1"
                style={{ background: effects.gradient, borderRadius: effects.borderRadius }}
              >
                Comprar
              </button>
            </div>
            
            {/* Right gallery column */}
            <div className="col-span-3">
              {layout.galleryStyle === 'masonry' ? (
                <div className="grid grid-cols-3 gap-0.5">
                  <div 
                    className="col-span-2 row-span-2 aspect-square bg-gray-200 overflow-hidden"
                    style={{ borderRadius: effects.borderRadius }}
                  >
                    {prizeImage ? (
                      <img src={prizeImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div 
                    className="aspect-square bg-gray-300 rounded"
                    style={{ borderRadius: effects.borderRadius }}
                  />
                  <div 
                    className="aspect-square bg-gray-300 rounded"
                    style={{ borderRadius: effects.borderRadius }}
                  />
                </div>
              ) : (
                <div 
                  className="aspect-[3/4] bg-gray-200 overflow-hidden"
                  style={{ borderRadius: effects.borderRadius }}
                >
                  {prizeImage ? (
                    <img src={prizeImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'side-by-side':
      default:
        return (
          <div className="grid grid-cols-2 gap-2">
            {/* Left: Image */}
            <div className="relative">
              <div 
                className="aspect-[4/5] bg-gray-200 overflow-hidden"
                style={{ borderRadius: effects.borderRadius }}
              >
                {prizeImage ? (
                  <img src={prizeImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Overlay price for modern */}
              {layout.pricePosition === 'overlay' && (
                <div 
                  className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[5px] text-white"
                  style={{ background: effects.gradient, borderRadius: effects.borderRadius }}
                >
                  $50,000 MXN
                </div>
              )}
              
              {/* Thumbnails for carousel style */}
              {layout.galleryStyle === 'carousel' && (
                <div className="flex gap-0.5 mt-1">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-4 h-4 bg-gray-200 rounded border"
                      style={{ 
                        borderColor: i === 0 ? colors.primary : 'transparent',
                        borderRadius: effects.borderRadius 
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Right: Info */}
            <div className="space-y-1.5 flex flex-col">
              <div 
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[5px] text-white w-fit"
                style={{ background: effects.gradient }}
              >
                <Zap className="w-1.5 h-1.5" />
                Activo
              </div>
              <h3 
                className="text-[9px] font-bold leading-tight"
                style={{ fontFamily: `"${fonts.title}", sans-serif`, color: colors.text }}
              >
                {prizeName}
              </h3>
              
              <div className="grid grid-cols-2 gap-1">
                <div 
                  className="p-1 rounded text-center"
                  style={{ backgroundColor: colors.cardBg, borderRadius: effects.borderRadius }}
                >
                  <Ticket className="w-2 h-2 mx-auto mb-0.5" style={{ color: colors.primary }} />
                  <p className="text-[5px]" style={{ color: colors.textMuted }}>Precio</p>
                  <p className="text-[7px] font-bold" style={{ color: colors.text }}>$100</p>
                </div>
                <div 
                  className="p-1 rounded text-center"
                  style={{ backgroundColor: colors.cardBg, borderRadius: effects.borderRadius }}
                >
                  <Calendar className="w-2 h-2 mx-auto mb-0.5" style={{ color: colors.primary }} />
                  <p className="text-[5px]" style={{ color: colors.textMuted }}>Sorteo</p>
                  <p className="text-[7px] font-bold" style={{ color: colors.text }}>15 Ene</p>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="space-y-0.5 flex-1">
                <div className="flex justify-between text-[5px]" style={{ color: colors.textMuted }}>
                  <span>35% vendido</span>
                </div>
                <div 
                  className="h-1 rounded-full overflow-hidden"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  <div 
                    className="h-full w-[35%] rounded-full"
                    style={{ background: effects.gradient }}
                  />
                </div>
              </div>
              
              <button 
                className="w-full py-1 rounded text-[6px] font-medium text-white mt-auto"
                style={{ background: effects.gradient, borderRadius: effects.borderRadius }}
              >
                Comprar
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={templateId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-lg shadow-lg"
        style={{ 
          backgroundColor: colors.background,
          fontFamily: `"${fonts.body}", sans-serif`,
        }}
      >
        {/* Pattern overlay */}
        {layout.decorations.includes('patterns') && effects.pattern && (
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ backgroundImage: effects.pattern, backgroundSize: '10px 10px' }}
          />
        )}
        
        {/* Mini header */}
        <div 
          className="flex items-center justify-between px-2 py-1.5 border-b"
          style={{ borderBottomColor: `${colors.primary}20`, backgroundColor: colors.cardBg }}
        >
          <div className="flex items-center gap-1.5">
            <div 
              className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] text-white font-bold"
              style={{ backgroundColor: colors.primary }}
            >
              {organizationLogo ? (
                <img src={organizationLogo} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <span 
              className="text-[7px] font-medium"
              style={{ color: colors.text, fontFamily: `"${fonts.title}", sans-serif` }}
            >
              {organizationName}
            </span>
          </div>
          <Share2 className="w-2.5 h-2.5" style={{ color: colors.textMuted }} />
        </div>
        
        {/* Content */}
        <div className="p-2 relative">
          {renderLayout()}
        </div>
        
        {/* Ticket grid section */}
        <div 
          className="px-2 pb-2 pt-1 space-y-1"
          style={{ backgroundColor: colors.background }}
        >
          <p 
            className="text-[6px] font-medium flex items-center gap-0.5"
            style={{ color: colors.text, fontFamily: `"${fonts.title}", sans-serif` }}
          >
            <Trophy className="w-2 h-2" style={{ color: colors.primary }} />
            Boletos
          </p>
          <TicketGrid />
        </div>
        
        {/* Glow effect */}
        {layout.decorations.includes('glow') && (
          <div 
            className="absolute -inset-1 blur-xl opacity-20 pointer-events-none -z-10"
            style={{ backgroundColor: colors.primary }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
