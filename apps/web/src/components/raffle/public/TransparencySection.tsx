import { motion } from "framer-motion";
import { Shield, Eye, Video, CheckCircle2, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransparencySectionProps {
  drawMethod?: string;
  livestreamUrl?: string | null;
  className?: string;
  isLightTemplate?: boolean;
  primaryColor?: string;
}

const transparencyItems = [
  {
    icon: Award,
    title: "Sorteo Oficial",
    description: "Vinculado a Lotería Nacional o método verificable",
  },
  {
    icon: Eye,
    title: "Lista Pública",
    description: "Todos los participantes pueden ser verificados",
  },
  {
    icon: Video,
    title: "Transmisión en Vivo",
    description: "El sorteo se transmite en tiempo real",
  },
  {
    icon: CheckCircle2,
    title: "Verificador 24/7",
    description: "Consulta el estado de tu boleto en cualquier momento",
  },
];

export function TransparencySection({ 
  drawMethod,
  livestreamUrl,
  className = "",
  isLightTemplate = false,
  primaryColor = '#10b981'
}: TransparencySectionProps) {
  // Theme-aware colors
  const colors = isLightTemplate ? {
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    textSubtle: 'text-gray-400',
    cardBg: 'bg-white',
    border: 'border-gray-200',
    hoverBorder: 'hover:border-emerald-500/40',
    hoverBg: 'hover:bg-gray-50',
    hoverShadow: 'hover:shadow-lg hover:shadow-emerald-500/10',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    checkIcon: 'text-emerald-500',
    orbOpacity: '0.15',
  } : {
    text: 'text-white',
    textMuted: 'text-white/50',
    textSubtle: 'text-white/40',
    cardBg: 'bg-white/[0.03]',
    border: 'border-white/[0.08]',
    hoverBorder: 'hover:border-emerald-500/30',
    hoverBg: 'hover:bg-white/[0.05]',
    hoverShadow: 'hover:shadow-xl hover:shadow-emerald-500/10',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/20',
    checkIcon: 'text-emerald-400',
    orbOpacity: '0.08',
  };

  return (
    <section className={cn("relative py-28 lg:py-36 xl:py-44 overflow-hidden", className)}>
      {/* Premium background with orbs - adaptive to light/dark */}
      <div className={cn(
        "absolute inset-0 pointer-events-none",
        isLightTemplate 
          ? "bg-gradient-to-b from-emerald-50/50 via-transparent to-transparent"
          : "bg-gradient-to-b from-emerald-950/30 via-transparent to-transparent"
      )} />
      
      {/* Animated orbs with 120px blur */}
      <motion.div 
        className={cn(
          "absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none",
          isLightTemplate ? "bg-emerald-300/20" : "bg-emerald-500/8"
        )}
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className={cn(
          "absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none",
          isLightTemplate ? "bg-teal-300/15" : "bg-teal-500/8"
        )}
        animate={{ x: [0, -25, 0], y: [0, 25, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div 
        className={cn(
          "absolute top-1/3 right-1/3 w-[350px] h-[350px] rounded-full blur-[120px] pointer-events-none",
          isLightTemplate ? "bg-emerald-200/15" : "bg-emerald-400/5"
        )}
        animate={{ x: [0, 20, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
      
      {/* Grid pattern overlay */}
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none",
          isLightTemplate ? "opacity-[0.03]" : "opacity-[0.04]"
        )}
        style={{
          backgroundImage: isLightTemplate
            ? `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`
            : `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px'
        }}
      />
      
      <div className="relative max-w-5xl mx-auto px-5">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 lg:mb-20"
        >
          <div 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold mb-8 border shadow-lg shimmer-badge"
            style={{ 
              backgroundColor: isLightTemplate ? `${primaryColor}15` : `${primaryColor}15`,
              color: primaryColor,
              borderColor: `${primaryColor}30`,
              boxShadow: `0 10px 25px -5px ${primaryColor}20`
            }}
          >
            <Shield className="w-5 h-5" />
            Garantía de Transparencia
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black mb-6 tracking-[-0.04em] leading-[0.9]">
            <span 
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${primaryColor}cc, ${primaryColor})` }}
            >
              Sorteo 100% Verificable
            </span>
          </h2>
          <p className={cn("max-w-xl mx-auto text-lg lg:text-xl", colors.textMuted)}>
            Tu confianza es nuestra prioridad
          </p>
        </motion.div>

        {/* Items grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
          {transparencyItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className={cn(
                "group flex items-start gap-6 p-8 lg:p-10 backdrop-blur-xl rounded-2xl border transition-all duration-300",
                colors.cardBg, colors.border, colors.hoverBorder, colors.hoverBg, colors.hoverShadow
              )}
            >
              {/* Icon container */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-xl shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-shadow">
                <item.icon className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn("font-bold mb-2 text-xl lg:text-2xl tracking-tight", colors.text)}>
                  {item.title}
                </h3>
                <p className={cn("text-base lg:text-lg", colors.textMuted)}>
                  {item.description}
                </p>
              </div>
              <CheckCircle2 className={cn(
                "w-6 h-6 flex-shrink-0 mt-1 opacity-40 group-hover:opacity-100 transition-opacity",
                colors.checkIcon
              )} />
            </motion.div>
          ))}
        </div>

        {/* Draw method badge */}
        {drawMethod && (
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <span className={cn(
              "inline-flex items-center gap-4 backdrop-blur-xl px-8 py-5 rounded-2xl text-base font-medium border shadow-xl transition-shadow",
              colors.cardBg, colors.text, colors.border,
              isLightTemplate ? "hover:shadow-emerald-500/10" : "hover:shadow-emerald-500/10"
            )}>
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colors.badgeBg)}>
                <Award className={cn("w-6 h-6", colors.badgeText)} />
              </div>
              Método: {drawMethod === 'lottery_nacional' ? 'Lotería Nacional' : 
                       drawMethod === 'random_org' ? 'Random.org Certificado' : 'Sorteo Manual'}
            </span>
          </motion.div>
        )}
      </div>
    </section>
  );
}