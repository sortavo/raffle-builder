import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  HelpCircle, 
  DollarSign, 
  Calendar, 
  Ticket, 
  Trophy, 
  CreditCard, 
  Shuffle,
  Package,
  User,
  MessageCircle,
  Truck,
  ShieldCheck
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatCurrency } from '@/lib/currency-utils';
import { cn } from '@/lib/utils';

interface FAQSectionProps {
  raffle: {
    ticket_price: number;
    currency_code?: string | null;
    draw_date?: string | null;
    total_tickets: number;
    max_tickets_per_person?: number | null;
    prize_name: string;
    prize_value?: number | null;
    draw_method?: string | null;
    lucky_numbers_enabled?: boolean | null;
    packages?: Array<{ quantity: number; price: number; label?: string | null }>;
  };
  organization?: {
    name: string;
    whatsapp_number?: string | null;
    email?: string | null;
  } | null;
  customization?: {
    sections?: { faq?: boolean };
    faq_config?: { 
      show_default_faqs?: boolean; 
      custom_faqs?: Array<{ question: string; answer: string; category?: string }>;
    };
  };
  className?: string;
  isLightTemplate?: boolean;
  primaryColor?: string;
}

interface SmartFAQ {
  id: string;
  question: string;
  answer: string;
  icon: React.ReactNode;
  category: string;
}

const FAQ_CATEGORIES = [
  { id: 'shipping', label: 'Envío', icon: Truck },
  { id: 'payment', label: 'Pagos', icon: CreditCard },
  { id: 'prize', label: 'Premio', icon: Trophy },
  { id: 'participation', label: 'Participación', icon: HelpCircle },
  { id: 'trust', label: 'Garantías', icon: ShieldCheck },
  { id: 'other', label: 'Otros', icon: Package },
] as const;

const DRAW_METHOD_LABELS: Record<string, string> = {
  lottery_nacional: 'Lotería Nacional',
  manual: 'Sorteo manual en vivo',
  random_org: 'Random.org (generador aleatorio certificado)',
};

export function FAQSection({ raffle, organization, customization, className, isLightTemplate = false, primaryColor = '#10b981' }: FAQSectionProps) {
  const sections = customization?.sections || {};
  const faqConfig = customization?.faq_config || { show_default_faqs: true, custom_faqs: [] };
  const showFaqSection = sections.faq !== false;
  const showDefaultFaqs = faqConfig.show_default_faqs !== false;
  const customFaqs: Array<{ question: string; answer: string; category?: string }> = faqConfig.custom_faqs || [];
  
  if (!showFaqSection) return null;

  const currency = raffle.currency_code || 'MXN';
  const packages = raffle.packages || [];

  // Theme-aware colors
  const colors = isLightTemplate ? {
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    textSubtle: 'text-gray-400',
    cardBg: 'bg-gray-50',
    border: 'border-gray-200',
    hoverBorder: 'hover:border-emerald-500/40',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
  } : {
    text: 'text-white',
    textMuted: 'text-white/60',
    textSubtle: 'text-white/40',
    cardBg: 'bg-white/[0.03]',
    border: 'border-white/[0.08]',
    hoverBorder: 'hover:border-emerald-500/20',
    iconBg: 'bg-white/[0.05]',
    iconText: 'text-white/60',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/20',
  };

  const generateSmartFAQs = (): SmartFAQ[] => {
    const faqs: SmartFAQ[] = [];

    // Price FAQ
    let priceAnswer = `Cada boleto tiene un precio de ${formatCurrency(raffle.ticket_price, currency)}.`;
    if (packages.length > 0) {
      const packagesList = packages
        .map(p => `${p.quantity} boletos por ${formatCurrency(p.price, currency)}${p.label ? ` (${p.label})` : ''}`)
        .join(', ');
      priceAnswer += ` También ofrecemos paquetes con descuento: ${packagesList}.`;
    }
    faqs.push({
      id: 'price',
      question: '¿Cuánto cuesta cada boleto?',
      answer: priceAnswer,
      icon: <DollarSign className="w-4 h-4" />,
      category: 'payment'
    });

    // Draw date FAQ
    faqs.push({
      id: 'when',
      question: '¿Cuándo es el sorteo?',
      answer: raffle.draw_date 
        ? `El sorteo se realizará el ${format(new Date(raffle.draw_date), "EEEE dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}.`
        : 'La fecha del sorteo será confirmada próximamente.',
      icon: <Calendar className="w-4 h-4" />,
      category: 'participation'
    });

    // Total tickets FAQ
    faqs.push({
      id: 'total',
      question: '¿Cuántos boletos hay disponibles?',
      answer: `Este sorteo cuenta con un total de ${raffle.total_tickets.toLocaleString()} boletos.`,
      icon: <Ticket className="w-4 h-4" />,
      category: 'participation'
    });

    // Prize FAQ
    let prizeAnswer = `El premio principal es: ${raffle.prize_name}.`;
    if (raffle.prize_value && raffle.prize_value > 0) {
      prizeAnswer += ` Con un valor aproximado de ${formatCurrency(raffle.prize_value, currency)}.`;
    }
    faqs.push({
      id: 'prize',
      question: '¿Cuál es el premio?',
      answer: prizeAnswer,
      icon: <Trophy className="w-4 h-4" />,
      category: 'prize'
    });

    // Draw method FAQ
    if (raffle.draw_method) {
      const methodLabel = DRAW_METHOD_LABELS[raffle.draw_method] || raffle.draw_method;
      faqs.push({
        id: 'method',
        question: '¿Cómo se realizará el sorteo?',
        answer: `El sorteo se realizará mediante: ${methodLabel}. Esto garantiza transparencia y equidad para todos los participantes.`,
        icon: <Shuffle className="w-4 h-4" />,
        category: 'trust'
      });
    }

    // Max tickets per person
    if (raffle.max_tickets_per_person && raffle.max_tickets_per_person > 0) {
      faqs.push({
        id: 'max',
        question: '¿Cuántos boletos puedo comprar?',
        answer: `Cada participante puede comprar hasta ${raffle.max_tickets_per_person} boleto${raffle.max_tickets_per_person > 1 ? 's' : ''}.`,
        icon: <User className="w-4 h-4" />,
        category: 'participation'
      });
    }

    // Lucky numbers FAQ
    if (raffle.lucky_numbers_enabled) {
      faqs.push({
        id: 'lucky',
        question: '¿Puedo elegir mis números de la suerte?',
        answer: '¡Sí! Este sorteo te permite seleccionar tus números favoritos. Al momento de comprar, podrás elegir los boletos específicos que deseas.',
        icon: <Ticket className="w-4 h-4" />,
        category: 'participation'
      });
    }

    // Packages FAQ
    if (packages.length > 0) {
      faqs.push({
        id: 'packages',
        question: '¿Hay descuentos por comprar varios boletos?',
        answer: `¡Sí! Ofrecemos paquetes con descuento: ${packages.map(p => `${p.quantity} boletos por ${formatCurrency(p.price, currency)}`).join(', ')}.`,
        icon: <Package className="w-4 h-4" />,
        category: 'payment'
      });
    }

    // How to participate FAQ
    faqs.push({
      id: 'how',
      question: '¿Cómo participo?',
      answer: 'Selecciona tus boletos, completa tus datos, realiza el pago y sube tu comprobante. Una vez verificado tu pago, recibirás la confirmación de tu participación.',
      icon: <HelpCircle className="w-4 h-4" />,
      category: 'participation'
    });

    // Winner notification FAQ
    faqs.push({
      id: 'winner',
      question: '¿Cómo sé si gané?',
      answer: `Te contactaremos por email y teléfono si resultas ganador.${organization?.name ? ` También publicaremos los resultados en las redes de ${organization.name}.` : ''}`,
      icon: <Trophy className="w-4 h-4" />,
      category: 'prize'
    });

    // Payment methods FAQ
    faqs.push({
      id: 'payment',
      question: '¿Qué métodos de pago aceptan?',
      answer: 'Aceptamos transferencia bancaria, depósito en efectivo y otros métodos de pago. Verás las opciones disponibles al momento de completar tu compra.',
      icon: <CreditCard className="w-4 h-4" />,
      category: 'payment'
    });

    // Contact FAQ
    if (organization?.whatsapp_number || organization?.email) {
      let contactAnswer = 'Puedes contactar al organizador ';
      if (organization.whatsapp_number) {
        contactAnswer += `por WhatsApp`;
        if (organization.email) {
          contactAnswer += ` o por correo electrónico a ${organization.email}`;
        }
      } else if (organization.email) {
        contactAnswer += `por correo electrónico a ${organization.email}`;
      }
      contactAnswer += '.';
      
      faqs.push({
        id: 'contact',
        question: '¿Cómo puedo contactar al organizador?',
        answer: contactAnswer,
        icon: <MessageCircle className="w-4 h-4" />,
        category: 'other'
      });
    }

    return faqs;
  };

  const smartFaqs = showDefaultFaqs ? generateSmartFAQs() : [];
  
  const customFaqsFormatted: SmartFAQ[] = customFaqs.map((faq, idx) => ({
    id: `custom-${idx}`,
    question: faq.question,
    answer: faq.answer,
    icon: <HelpCircle className="w-4 h-4" />,
    category: faq.category || 'other'
  }));

  const allFaqs = [...smartFaqs, ...customFaqsFormatted];
  
  if (allFaqs.length === 0) return null;

  // Group FAQs by category
  const groupedFaqs = allFaqs.reduce((acc, faq) => {
    const cat = faq.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {} as Record<string, SmartFAQ[]>);

  const categoriesWithFaqs = FAQ_CATEGORIES.filter(cat => groupedFaqs[cat.id]?.length > 0);

  return (
    <div className={cn("max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20", className)}>
      <div className="text-center mb-14">
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-5 border shadow-lg"
          style={{ 
            backgroundColor: `${primaryColor}15`,
            color: primaryColor,
            borderColor: `${primaryColor}30`,
            boxShadow: `0 10px 25px -5px ${primaryColor}15`
          }}
        >
          <HelpCircle className="w-4 h-4" />
          Resolvemos tus dudas
        </div>
        <h2 className={cn("text-3xl lg:text-4xl font-black tracking-tight mb-4", colors.text)}>
          Preguntas Frecuentes
        </h2>
        <p className={cn("text-lg", colors.textMuted)}>
          Todo lo que necesitas saber sobre este sorteo
        </p>
      </div>

      <div className="space-y-10">
        {categoriesWithFaqs.map((cat) => {
          const Icon = cat.icon;
          const faqs = groupedFaqs[cat.id] || [];
          
          return (
            <div key={cat.id} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <h3 className={cn("font-semibold text-lg", colors.text)}>{cat.label}</h3>
                <span className={cn("text-sm", colors.textSubtle)}>({faqs.length})</span>
              </div>
              
              <Accordion type="single" collapsible className="w-full space-y-3">
                {faqs.map((faq) => (
                  <AccordionItem 
                    key={faq.id} 
                    value={faq.id} 
                    className={cn(
                      "rounded-xl px-5 sm:px-6 overflow-hidden backdrop-blur-sm transition-colors",
                      colors.cardBg, colors.border, colors.hoverBorder
                    )}
                  >
                    <AccordionTrigger className={cn(
                      "text-left font-medium hover:no-underline text-sm sm:text-base py-5",
                      colors.text
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                          colors.iconBg, colors.iconText
                        )}>
                          {faq.icon}
                        </div>
                        <span>{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className={cn("text-sm pb-5 pl-14", colors.textMuted)}>
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          );
        })}
      </div>
    </div>
  );
}