import { motion } from "framer-motion";
import { Shield, Eye, Video, CheckCircle2, Award } from "lucide-react";

interface TransparencySectionProps {
  drawMethod?: string;
  livestreamUrl?: string | null;
  className?: string;
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
  className = "" 
}: TransparencySectionProps) {
  return (
    <section className={`py-16 border-y border-border/50 ${className}`}>
      <div className="max-w-4xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-emerald-500/20">
            <Shield className="w-4 h-4" />
            Garantía de Transparencia
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Sorteo 100% Verificable
          </h2>
          <p className="text-muted-foreground mt-2">
            Tu confianza es nuestra prioridad
          </p>
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {transparencyItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="flex items-start gap-4 p-5 bg-card/50 rounded-xl border border-border/50"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <item.icon className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-1" />
            </motion.div>
          ))}
        </div>

        {/* Draw method badge */}
        {drawMethod && (
          <div className="mt-8 text-center">
            <span className="inline-flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-full text-sm font-medium border border-border/50">
              <Award className="w-4 h-4 text-emerald-400" />
              Método: {drawMethod === 'lottery_nacional' ? 'Lotería Nacional' : 
                       drawMethod === 'random_org' ? 'Random.org Certificado' : 'Sorteo Manual'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
