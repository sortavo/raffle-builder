import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Phone, Copy, Check, ExternalLink, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency-utils";

interface WhatsAppContactButtonProps {
  organizationPhone?: string | null;
  organizationName?: string;
  organizationLogo?: string | null;
  raffleTitle: string;
  ticketNumbers: string[];
  totalAmount: number;
  currencyCode: string;
  buyerName?: string;
  variant?: 'button' | 'card' | 'expanded';
  className?: string;
}

export function WhatsAppContactButton({
  organizationPhone,
  organizationName,
  organizationLogo,
  raffleTitle,
  ticketNumbers,
  totalAmount,
  currencyCode,
  buyerName,
  variant = 'button',
  className,
}: WhatsAppContactButtonProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(variant === 'expanded');

  if (!organizationPhone) return null;

  // Clean phone number (remove non-digits)
  const cleanPhone = organizationPhone.replace(/\D/g, '');
  
  // Format phone for display
  const formattedPhone = organizationPhone;

  // Create WhatsApp message
  const message = buyerName
    ? `¡Hola! Soy ${buyerName} y acabo de reservar ${ticketNumbers.length} boleto(s) para "${raffleTitle}".

📋 *Números:* ${ticketNumbers.join(', ')}
💰 *Total:* ${formatCurrency(totalAmount, currencyCode)}

¿Me pueden confirmar los datos para realizar el pago?`
    : `¡Hola! Acabo de reservar ${ticketNumbers.length} boleto(s) para "${raffleTitle}".

📋 *Números:* ${ticketNumbers.join(', ')}
💰 *Total:* ${formatCurrency(totalAmount, currencyCode)}

¿Me pueden confirmar los datos para realizar el pago?`;

  const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  const handleCopyPhone = async () => {
    await navigator.clipboard.writeText(formattedPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'button') {
    return (
      <Button
        asChild
        size="lg"
        className={cn(
          "w-full bg-[#25D366] hover:bg-[#128C7E] text-white",
          "shadow-lg shadow-green-500/30",
          "transition-all duration-200",
          className
        )}
      >
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-5 w-5 mr-2" />
          Contactar por WhatsApp
        </a>
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="overflow-hidden border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-4 bg-[#25D366] text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">Confirma tu compra por WhatsApp</h3>
                <p className="text-white/80 text-sm">Respuesta inmediata del organizador</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Organization info */}
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              {organizationLogo ? (
                <img 
                  src={organizationLogo} 
                  alt={organizationName} 
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-foreground">{organizationName || 'Organizador'}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  {formattedPhone}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyPhone}
                className="h-8 w-8"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Message preview */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Vista previa del mensaje:</p>
                    <div className="bg-[#DCF8C6] dark:bg-green-900/50 p-3 rounded-lg text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
                      {message.replace(/\*/g, '')}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {variant === 'card' && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? 'Ocultar mensaje' : 'Ver mensaje que se enviará'}
              </button>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                asChild
                size="lg"
                className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg"
              >
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Abrir WhatsApp
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>

            {/* Trust indicator */}
            <p className="text-xs text-center text-muted-foreground">
              🔒 Conversación directa y segura con el organizador
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
