import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

interface FloatingWhatsAppButtonProps {
  whatsappNumber: string;
  organizationName: string;
  raffleTitle: string;
}

export function FloatingWhatsAppButton({ 
  whatsappNumber, 
  organizationName,
  raffleTitle 
}: FloatingWhatsAppButtonProps) {
  // Clean phone number
  const cleanPhone = whatsappNumber.replace(/\D/g, '');
  
  // Pre-filled message
  const message = `¡Hola ${organizationName}! Tengo una pregunta sobre el sorteo "${raffleTitle}".`;
  const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  return (
    <motion.a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-24 sm:bottom-6 right-6 z-50 w-14 h-14 sm:w-16 sm:h-16 bg-[#25D366] hover:bg-[#128C7E] rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 transition-colors"
      title="Contactar por WhatsApp"
    >
      <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
      
      {/* Pulse animation */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25" />
    </motion.a>
  );
}