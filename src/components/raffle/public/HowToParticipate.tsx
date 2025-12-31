import { motion } from "framer-motion";
import { Ticket, CreditCard, Trophy } from "lucide-react";

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
}

export function HowToParticipate({ className = "" }: HowToParticipateProps) {
  return (
    <section className={`py-12 bg-gray-950/50 ${className}`}>
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
                <div className="hidden sm:block absolute top-8 left-[60%] w-full h-px bg-gradient-to-r from-emerald-500/30 to-transparent" />
              )}
              
              <div className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-3 text-left sm:text-center">
                {/* Icon with number - /pricing style */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gray-900/80 border border-white/10 flex items-center justify-center shadow-lg hover:border-emerald-500/30 transition-all">
                    <step.icon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
                    <span className="text-sm font-bold text-white">{step.number}</span>
                  </div>
                </div>
                
                {/* Text */}
                <div className="flex-1 sm:flex-initial">
                  <h3 className="font-semibold text-gray-200 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-400">
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
