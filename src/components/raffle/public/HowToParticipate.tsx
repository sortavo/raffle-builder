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
    <section className={`py-10 ${className}`}>
      <div className="max-w-4xl mx-auto px-5">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
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
                <div className="hidden sm:block absolute top-8 left-[60%] w-full h-px bg-border/50" />
              )}
              
              <div className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-3 text-left sm:text-center">
                {/* Icon with number */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted border border-border/50 flex items-center justify-center">
                    <step.icon className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{step.number}</span>
                  </div>
                </div>
                
                {/* Text */}
                <div className="flex-1 sm:flex-initial">
                  <h3 className="font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
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
