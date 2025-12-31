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
    <section className={`py-20 bg-gray-950/50 ${className}`}>
      <div className="max-w-5xl mx-auto px-5">
        {/* Header - /pricing style */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-emerald-500/30">
            <Shield className="w-4 h-4" />
            Garantía de Transparencia
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Sorteo 100% Verificable
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Tu confianza es nuestra prioridad
          </p>
        </motion.div>

        {/* Items grid - /pricing card style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {transparencyItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="flex items-start gap-4 p-6 bg-gray-900/80 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-200 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-400">
                  {item.description}
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
            </motion.div>
          ))}
        </div>

        {/* Draw method badge */}
        {drawMethod && (
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-10 text-center"
          >
            <span className="inline-flex items-center gap-2 bg-gray-900/80 text-gray-200 px-5 py-3 rounded-full text-sm font-medium border border-white/10">
              <Award className="w-4 h-4 text-emerald-400" />
              Método: {drawMethod === 'lottery_nacional' ? 'Lotería Nacional' : 
                       drawMethod === 'random_org' ? 'Random.org Certificado' : 'Sorteo Manual'}
            </span>
          </motion.div>
        )}
      </div>
    </section>
  );
}
