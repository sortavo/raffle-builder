import { motion } from 'framer-motion';
import { AnimatedCounter } from './AnimatedCounter';
import { Star, Users, Trophy, TrendingUp } from 'lucide-react';

const stats = [
  { icon: Users, value: 500, suffix: '+', label: 'Organizadores activos' },
  { icon: Trophy, value: 12000, suffix: '+', label: 'Sorteos realizados' },
  { icon: TrendingUp, value: 2.5, suffix: 'M+', label: 'Boletos vendidos', decimals: 1 },
  { icon: Star, value: 98, suffix: '%', label: 'Satisfacción' },
];

const testimonials = [
  {
    quote: 'Sortavo transformó la forma en que organizamos nuestras rifas. Las ventas aumentaron un 40% desde que lo usamos.',
    author: 'María García',
    role: 'Directora de Fundación Esperanza',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
  },
  {
    quote: 'La integración con Lotería Nacional y el bot de Telegram nos ahorra horas de trabajo cada semana.',
    author: 'Carlos Mendoza',
    role: 'Club Deportivo Los Tigres',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
  },
];

export function SocialProofSection() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-16">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="text-center p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                <stat.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-foreground mb-1">
                <AnimatedCounter 
                  end={stat.value} 
                  suffix={stat.suffix} 
                  decimals={stat.decimals}
                />
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-center text-xl font-semibold text-muted-foreground mb-8">
            Lo que dicen nuestros clientes
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-foreground mb-4 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.author}
                    className="w-10 h-10 rounded-full bg-muted"
                  />
                  <div>
                    <p className="font-semibold text-sm text-foreground">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
