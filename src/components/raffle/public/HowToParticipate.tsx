import { motion } from "framer-motion";
import { Ticket, CreditCard, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Ticket,
    number: "1",
    title: "Elige tus boletos",
    description: "Selecciona tus números favoritos o deja que la suerte decida",
  },
  {
    icon: CreditCard,
    number: "2",
    title: "Realiza tu pago",
    description: "Paga por OXXO, transferencia o tu método preferido",
  },
  {
    icon: Trophy,
    number: "3",
    title: "¡Espera el sorteo!",
    description: "Recibe confirmación y espera el día del sorteo",
  },
];

interface HowToParticipateProps {
  className?: string;
  isLightTemplate?: boolean;
  primaryColor?: string;
}

export function HowToParticipate({ className = "", isLightTemplate = false, primaryColor = '#10b981' }: HowToParticipateProps) {
  // Theme-aware colors
  const colors = isLightTemplate ? {
    sectionBg: 'bg-gray-50/80',
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    cardBg: 'bg-white',
    cardBorder: 'border-gray-200',
    iconBg: 'bg-gray-100',
    iconBorder: 'border-gray-200',
  } : {
    sectionBg: 'bg-gray-950/50',
    text: 'text-gray-200',
    textMuted: 'text-gray-400',
    cardBg: 'bg-gray-900/80',
    cardBorder: 'border-white/10',
    iconBg: 'bg-gray-900/80',
    iconBorder: 'border-white/10',
  };

  return (
    <section className={cn("py-12", colors.sectionBg, className)}>
      <div className="max-w-5xl mx-auto px-5">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              viewport={{ once: true }}
              className="flex-1 relative"
            >
              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div 
                  className="hidden sm:block absolute top-8 left-[60%] w-full h-px bg-gradient-to-r to-transparent"
                  style={{ background: `linear-gradient(to right, ${primaryColor}50, transparent)` }}
                />
              )}
              
              <div className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-3 text-left sm:text-center">
                {/* Icon with number */}
                <div className="relative flex-shrink-0">
                  <div 
                    className={cn(
                      "w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg transition-all",
                      colors.iconBg, colors.iconBorder
                    )}
                    style={{ 
                      borderColor: isLightTemplate ? `${primaryColor}30` : `${primaryColor}20`,
                    }}
                  >
                    <step.icon className="w-8 h-8" style={{ color: primaryColor }} />
                  </div>
                  <div 
                    className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}dd)` }}
                  >
                    <span className="text-sm font-bold text-white">{step.number}</span>
                  </div>
                </div>
                
                {/* Text */}
                <div className="flex-1 sm:flex-initial">
                  <h3 className={cn("font-semibold mb-1", colors.text)}>
                    {step.title}
                  </h3>
                  <p className={cn("text-sm", colors.textMuted)}>
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}