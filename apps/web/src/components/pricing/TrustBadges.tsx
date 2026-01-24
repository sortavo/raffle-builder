import { motion } from 'framer-motion';
import { Shield, Lock, BadgeCheck, Headphones, CreditCard, Globe } from 'lucide-react';

const badges = [
  { 
    icon: Shield, 
    title: 'Pagos 100% Seguros', 
    description: 'Transacciones encriptadas con Stripe',
    gradient: 'from-primary to-emerald-400'
  },
  { 
    icon: Lock, 
    title: 'Datos Protegidos', 
    description: 'Cumplimiento GDPR y SSL',
    gradient: 'from-blue-500 to-cyan-400'
  },
  { 
    icon: BadgeCheck, 
    title: 'Sin Comisiones', 
    description: 'Recibe el 100% de tus ventas',
    gradient: 'from-amber-500 to-yellow-400'
  },
  { 
    icon: Headphones, 
    title: 'Soporte Humano', 
    description: 'Respuesta en menos de 24h',
    gradient: 'from-purple-500 to-violet-400'
  },
  { 
    icon: CreditCard, 
    title: 'Cancela Cuando Quieras', 
    description: 'Sin contratos ni penalizaciones',
    gradient: 'from-rose-500 to-pink-400'
  },
  { 
    icon: Globe, 
    title: 'Disponible 24/7', 
    description: '99.9% de tiempo en línea',
    gradient: 'from-teal-500 to-green-400'
  },
];

export function TrustBadges() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {badges.map((badge, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              whileHover={{ y: -4 }}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-card/50 border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${badge.gradient} flex items-center justify-center shadow-lg mb-3`}>
                <badge.icon className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-semibold text-sm text-foreground mb-1">{badge.title}</h4>
              <p className="text-xs text-muted-foreground leading-snug">{badge.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
