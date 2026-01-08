import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/currency-utils";
import { formatTicketSummary, isBulkPurchase, BULK_PURCHASE_THRESHOLD } from "@/lib/ticket-utils";
import { useReserveVirtualTickets } from "@/hooks/useVirtualTickets";
import { useEmails } from "@/hooks/useEmails";
import { useTrackingEvents } from "@/hooks/useTrackingEvents";
import { usePublicPaymentMethods } from "@/hooks/usePaymentMethods";
import { notifyPaymentPending } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { CountdownTimer } from "./CountdownTimer";
import { PaymentMethodDisplay, getPaymentMethodIcon, getPaymentMethodLabel } from "./PaymentMethodDisplay";
import { PaymentProofUploader } from "./PaymentProofUploader";
import { 
  Loader2, 
  Ticket, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Shield,
  Lock,
  BadgeCheck,
  Building2,
  Share2,
  ChevronDown,
  Copy,
  Link,
  Pencil,
  CreditCard,
  Upload
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { CouponInput } from "@/components/marketing/CouponInput";
import { WhatsAppContactButton } from "./WhatsAppContactButton";
import { TelegramOptIn } from "./TelegramOptIn";
import { cn } from "@/lib/utils";

const fireConfetti = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
};

type Raffle = Tables<'raffles'>;

const checkoutSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre es demasiado largo"),
  email: z.string().email("Ingresa un email válido").max(255, "El email es demasiado largo"),
  phone: z.string().min(10, "Ingresa un teléfono válido (mínimo 10 dígitos)").max(20, "El teléfono es demasiado largo"),
  city: z.string().min(2, "La ciudad debe tener al menos 2 caracteres").max(100, "La ciudad es demasiado larga"),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Debes aceptar los términos y condiciones",
  }),
});

const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'guerrillamail.com', '10minutemail.com',
  'throwaway.email', 'mailinator.com', 'yopmail.com',
  'temp-mail.org', 'fakeinbox.com', 'trashmail.com'
];

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  raffle: Raffle & { organization?: { id?: string; phone?: string | null; name?: string; logo_url?: string | null; subscription_tier?: string | null } };
  selectedTickets: string[];
  selectedTicketIndices: number[];
  ticketPrice: number;
  packages?: { quantity: number; price: number }[];
  onReservationComplete: (tickets: { id: string; ticket_number: string }[], reservedUntil: string, buyerData: { name: string; email: string }, totalAmount: number, referenceCode: string) => void;
}

const steps = [
  { step: 1, label: 'Información' },
  { step: 2, label: 'Pago' },
  { step: 3, label: 'Confirmación' }
];

export function CheckoutModal({
  open,
  onOpenChange,
  raffle,
  selectedTickets,
  selectedTicketIndices,
  ticketPrice,
  packages = [],
  onReservationComplete,
}: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  // Payment method is always 'manual' (transfer/deposit) - no card payments
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: string; discount_value: number } | null>(null);
  const [discount, setDiscount] = useState(0);
  const [reservedTickets, setReservedTickets] = useState<{ id: string; ticket_number: string }[]>([]);
  const [reservedUntil, setReservedUntil] = useState<string>('');
  const [referenceCode, setReferenceCode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false); // Prevent double-click
  const [ticketsExpanded, setTicketsExpanded] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [shakeForm, setShakeForm] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
  
  const reserveTickets = useReserveVirtualTickets();
  
  // Fetch payment methods for the organization
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = usePublicPaymentMethods(raffle.organization?.id);
  
  // LocalStorage keys for auto-save
  const STORAGE_KEY = `checkout_draft_${raffle.id}`;
  const BUYER_PROFILE_KEY = 'sortavo_buyer_profile';
  const { sendReservationEmail } = useEmails();
  const { trackBeginCheckout, trackPurchase } = useTrackingEvents();
  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      city: "",
      acceptTerms: false,
    },
  });

  // Load saved form data from localStorage (prioritize draft, then global profile)
  useEffect(() => {
    if (open) {
      try {
        // Priority 1: Draft for this specific raffle (interrupted session)
        const savedDraft = localStorage.getItem(STORAGE_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.name || parsed.email || parsed.phone || parsed.city) {
            form.reset({
              name: parsed.name || '',
              email: parsed.email || '',
              phone: parsed.phone || '',
              city: parsed.city || '',
              acceptTerms: false,
            });
            toast.info('Recuperamos tu borrador anterior');
            return;
          }
        }
        
        // Priority 2: Global buyer profile (returning customer)
        const buyerProfile = localStorage.getItem(BUYER_PROFILE_KEY);
        if (buyerProfile) {
          const parsed = JSON.parse(buyerProfile);
          if (parsed.name || parsed.email) {
            form.reset({
              name: parsed.name || '',
              email: parsed.email || '',
              phone: parsed.phone || '',
              city: parsed.city || '',
              acceptTerms: false,
            });
            const firstName = parsed.name?.split(' ')[0] || '';
            toast.info(`¡Bienvenido de vuelta${firstName ? ', ' + firstName : ''}!`);
          }
        }
      } catch (e) {
        console.error('Error loading saved checkout data:', e);
      }
    }
  }, [open, raffle.id]);

  // Auto-save form data on blur
  const saveFormData = useCallback(() => {
    const values = form.getValues();
    if (values.name || values.email || values.phone || values.city) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone,
          city: values.city,
        }));
      } catch (e) {
        console.error('Error saving checkout data:', e);
      }
    }
  }, [form, STORAGE_KEY]);

  // Track begin_checkout when modal opens
  useEffect(() => {
    if (open && selectedTickets.length > 0) {
      trackBeginCheckout({
        itemId: raffle.id,
        itemName: raffle.title,
        value: calculateSubtotal(),
        quantity: selectedTickets.length,
        currency: raffle.currency_code || 'MXN',
      });
    }
  }, [open]); // Only track when modal opens

  const calculateSubtotal = () => {
    const matchingPackage = packages.find(p => p.quantity === selectedTickets.length);
    if (matchingPackage) {
      return matchingPackage.price;
    }
    return selectedTickets.length * ticketPrice;
  };

  const subtotal = calculateSubtotal();
  const total = subtotal - discount;

  // PHASE 2: Memoize ticket numbers list to prevent re-computation on every render
  const ticketNumbersList = useMemo(() => 
    reservedTickets.map(t => t.ticket_number), 
    [reservedTickets]
  );
  
  // Memoize ticket summary for components that don't need the full array
  const ticketSummary = useMemo(() => 
    formatTicketSummary(selectedTickets, 10),
    [selectedTickets]
  );

  const copyReferenceCode = async () => {
    await navigator.clipboard.writeText(referenceCode);
    setCopiedRef(true);
    toast.success('Código copiado');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const copyPaymentLink = async () => {
    const paymentUrl = `${window.location.origin}/r/${raffle.slug}/pay?ref=${referenceCode}`;
    await navigator.clipboard.writeText(paymentUrl);
    setCopiedLink(true);
    toast.success('Enlace de pago copiado');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Save buyer profile globally and clear draft on successful reservation
  const saveBuyerProfileAndClearDraft = useCallback(() => {
    try {
      const values = form.getValues();
      
      // Save to global buyer profile for future purchases
      localStorage.setItem(BUYER_PROFILE_KEY, JSON.stringify({
        name: values.name,
        email: values.email,
        phone: values.phone,
        city: values.city,
        lastPurchase: new Date().toISOString(),
      }));
      
      // Clear the draft for this specific raffle
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error saving buyer profile:', e);
    }
  }, [form, STORAGE_KEY, BUYER_PROFILE_KEY]);

  const handleContinueToPayment = async () => {
    const isValid = await form.trigger(['name', 'email', 'phone', 'city', 'acceptTerms']);
    if (!isValid) {
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 400);
      return;
    }

    const data = form.getValues();
    
    // Validate phone format
    const cleanPhone = data.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      form.setError('phone', {
        message: 'Ingresa un teléfono válido (10-15 dígitos)',
      });
      return;
    }

    // Check for disposable email domains
    const emailDomain = data.email.split('@')[1]?.toLowerCase();
    if (DISPOSABLE_EMAIL_DOMAINS.includes(emailDomain)) {
      form.setError('email', {
        message: 'Por favor usa un email permanente (no temporal)',
      });
      return;
    }

    setCurrentStep(2);
  };

  const handleCompleteReservation = async () => {
    // Prevent double-click
    if (isProcessing || reserveTickets.isPending) return;
    
    // PHASE B: Validate that we have indices before proceeding
    if (selectedTicketIndices.length === 0) {
      toast.error('Error en la selección', {
        description: 'No pudimos preparar tus boletos. Por favor, vuelve a seleccionarlos.',
      });
      console.error('[CheckoutModal] No ticket indices available for reservation');
      return;
    }
    
    if (selectedTicketIndices.length !== selectedTickets.length) {
      console.warn('[CheckoutModal] Ticket count mismatch:', {
        tickets: selectedTickets.length,
        indices: selectedTicketIndices.length,
      });
      // Still proceed - the resilient RPC can handle this
    }
    
    setIsProcessing(true);

    const data = form.getValues();
    const cleanPhone = data.phone.replace(/\D/g, '');

    try {
      // Use virtual tickets - always
      const virtualResult = await reserveTickets.mutateAsync({
        raffleId: raffle.id,
        ticketIndices: selectedTicketIndices,
        buyerData: {
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: cleanPhone,
          city: data.city?.trim(),
        },
        reservationMinutes: raffle.reservation_time_minutes || 15,
        orderTotal: total,
      });

      // If we used the resilient reservation, it may return the final list (filled if some collided)
      const finalTicketNumbers = virtualResult.ticketNumbers ?? selectedTickets;
      const finalTicketIndices = virtualResult.ticketIndices ?? selectedTicketIndices;

      // Adapt result to expected format
      const result = {
        tickets: finalTicketNumbers.map((tn, i) => ({
          id: `virtual-${finalTicketIndices[i] ?? i}`,
          ticket_number: tn,
        })),
        reservedUntil: virtualResult.reservedUntil,
        referenceCode: virtualResult.referenceCode,
      };

      // Store reserved tickets info
      setReservedTickets(result.tickets);
      setReservedUntil(result.reservedUntil);
      setReferenceCode(result.referenceCode);
      
      // Save buyer profile and clear draft on success
      saveBuyerProfileAndClearDraft();

      // PHASE A: Move to success step FIRST (before any side-effects)
      setCurrentStep(3);

      // PHASE A: Execute side-effects outside critical path using queueMicrotask
      // This ensures the UI updates immediately before these run
      queueMicrotask(() => {
        // Fire confetti celebration (non-blocking)
        try {
          fireConfetti();
        } catch (err) {
          console.error('[CheckoutModal] Confetti error:', err);
        }
        
        // Track purchase conversion event (non-blocking)
        try {
          trackPurchase({
            transactionId: result.referenceCode,
            itemId: raffle.id,
            itemName: raffle.title,
            value: total,
            quantity: result.tickets.length,
            currency: raffle.currency_code || 'MXN',
            userEmail: data.email,
            userPhone: cleanPhone,
          });
        } catch (err) {
          console.error('[CheckoutModal] Tracking error:', err);
        }
      });

      // PHASE A: Send emails and notifications asynchronously (don't block UI)
      // Use setTimeout to ensure these don't interfere with React's render cycle
      setTimeout(() => {
        // Send reservation email (non-blocking)
        sendReservationEmail({
          to: data.email,
          buyerName: data.name,
          // For bulk purchases, limit ticket numbers in email
          ticketNumbers: finalTicketNumbers.length > 100 
            ? finalTicketNumbers.slice(0, 100) 
            : finalTicketNumbers,
          raffleTitle: raffle.title,
          raffleSlug: raffle.slug,
          amount: total,
          currency: raffle.currency_code || 'MXN',
          timerMinutes: raffle.reservation_time_minutes || 15,
          referenceCode: result.referenceCode,
        }).catch(err => console.error('[CheckoutModal] Email error:', err));

        // Notify organizer about pending payment (non-blocking)
        (async () => {
          try {
            const { data: orgData } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('organization_id', raffle.organization_id)
              .in('role', ['owner', 'admin']);
            
            if (orgData && orgData.length > 0) {
              await Promise.all(
                orgData.map(member =>
                  notifyPaymentPending(
                    member.user_id,
                    raffle.organization_id,
                    raffle.id,
                    raffle.title,
                    // For bulk, just pass first few tickets
                    finalTicketNumbers.slice(0, 10),
                    data.name
                  )
                )
              );
            }
          } catch (err) {
            console.error('[CheckoutModal] Notification error:', err);
          }
        })();
      }, 0);

    } catch (error) {
      // PHASE D: Better error handling with clear message
      console.error('[CheckoutModal] Reservation failed:', error);
      toast.error('No se pudo completar la reserva', {
        description: error instanceof Error ? error.message : 'Por favor, intenta de nuevo.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (currentStep === 3 && reservedTickets.length > 0) {
      // Complete the reservation flow before closing - pass totalAmount with discount and referenceCode
      onReservationComplete(
        reservedTickets,
        reservedUntil,
        { name: form.getValues('name'), email: form.getValues('email') },
        total,
        referenceCode
      );
    }
    // Reset state
    setCurrentStep(1);
    // Reset other state
    setAppliedCoupon(null);
    setDiscount(0);
    form.reset();
    onOpenChange(false);
  };

  const handleShare = async () => {
    const shareData = {
      title: `¡Participa en ${raffle.title}!`,
      text: `Acabo de reservar mis boletos para ganar. ¡Participa tú también!`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-lg sm:w-full p-0 overflow-hidden" hideCloseButton>
        {/* Premium header with gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Finalizar Compra</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white hover:bg-white/10 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-between">
            {steps.map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                      currentStep >= item.step
                        ? "bg-white text-emerald-600"
                        : "bg-white/20 text-white/60"
                    )}
                  >
                    {currentStep > item.step ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      item.step
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs mt-1 font-medium",
                      currentStep >= item.step ? "text-white" : "text-white/60"
                    )}
                  >
                    {item.label}
                  </span>
                </div>

                {index < 2 && (
                  <div
                    className={cn(
                      "w-12 h-0.5 mx-2 transition-all",
                      currentStep > item.step ? "bg-white" : "bg-white/20"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          
          {/* Estimated time indicator */}
          <div className="mt-3 text-center">
            <span className="text-xs text-white/60">
              {currentStep === 1 && '~1 minuto para completar'}
              {currentStep === 2 && '~30 segundos restantes'}
              {currentStep === 3 && '¡Listo!'}
            </span>
          </div>
        </div>

        {/* Content area */}
        <div className="p-4 sm:p-6 max-h-[70vh] sm:max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Information */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Selected tickets summary - Expandable */}
                <Collapsible open={ticketsExpanded} onOpenChange={setTicketsExpanded}>
                  <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                            <Ticket className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-foreground">
                              {selectedTickets.length} Boleto{selectedTickets.length !== 1 && 's'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {selectedTickets.slice(0, 3).join(', ')}{selectedTickets.length > 3 && ` +${selectedTickets.length - 3} más`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(subtotal, raffle.currency_code || 'MXN')}
                          </p>
                          <ChevronDown className={cn(
                            "h-5 w-5 text-muted-foreground transition-transform duration-200",
                            ticketsExpanded && "rotate-180"
                          )} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="flex flex-wrap gap-1.5 pt-4 mt-4 border-t border-emerald-500/20">
                        {/* PHASE 2: Limit badge rendering to prevent UI freezes on bulk purchases */}
                        {selectedTickets.slice(0, 50).map(ticket => (
                          <Badge 
                            key={ticket} 
                            variant="secondary" 
                            className="text-sm bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                          >
                            #{ticket}
                          </Badge>
                        ))}
                        {selectedTickets.length > 50 && (
                          <Badge 
                            variant="outline" 
                            className="text-sm text-muted-foreground"
                          >
                            y {selectedTickets.length - 50} más
                          </Badge>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* Reservation Time Notice */}
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Tienes {raffle.reservation_time_minutes || 15} minutos para completar el pago
                  </span>
                </div>

                {/* Premium form fields */}
                <Form {...form}>
                  <div className={cn("space-y-4", shakeForm && "animate-shake")}>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre Completo *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Juan Pérez"
                                className="pl-10 h-12 border-2 focus:border-emerald-500 rounded-xl"
                                {...field}
                                onBlur={(e) => {
                                  field.onBlur();
                                  saveFormData();
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo Electrónico *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="email"
                                placeholder="juan@ejemplo.com"
                                className="pl-10 h-12 border-2 focus:border-emerald-500 rounded-xl"
                                {...field}
                                onBlur={(e) => {
                                  field.onBlur();
                                  saveFormData();
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="tel"
                                  placeholder="55 1234 5678"
                                  className="pl-10 h-12 border-2 focus:border-emerald-500 rounded-xl"
                                  {...field}
                                  onBlur={(e) => {
                                    field.onBlur();
                                    saveFormData();
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ciudad *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Ej: Ciudad de México"
                                  className="pl-10 h-12 border-2 focus:border-emerald-500 rounded-xl"
                                  {...field}
                                  onBlur={(e) => {
                                    field.onBlur();
                                    saveFormData();
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="acceptTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              Acepto los términos y condiciones del sorteo
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>

                {/* Coupon section */}
                <CouponInput
                  raffleId={raffle.id}
                  subtotal={subtotal}
                  currencyCode={raffle.currency_code || 'MXN'}
                  onCouponApplied={(coupon, discountAmount) => {
                    setAppliedCoupon(coupon);
                    setDiscount(discountAmount);
                  }}
                />

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    Pago Seguro
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-4 w-4 text-emerald-500" />
                    Datos Encriptados
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BadgeCheck className="h-4 w-4 text-emerald-500" />
                    100% Verificable
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleClose}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={handleContinueToPayment}
                  >
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Payment */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Compact ticket summary */}
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                  <Ticket className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    Boletos: <span className="font-medium text-foreground">
                      {selectedTickets.slice(0, 5).join(', ')}
                      {selectedTickets.length > 5 && ` +${selectedTickets.length - 5} más`}
                    </span>
                  </span>
                </div>

                {/* Editable buyer data summary */}
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Comprador</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs gap-1"
                      onClick={() => setCurrentStep(1)}
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </Button>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{form.getValues('name')}</p>
                    <p className="text-muted-foreground">{form.getValues('email')}</p>
                    <p className="text-muted-foreground">{form.getValues('phone')}</p>
                  </div>
                </div>

                {/* Payment method info - Only manual transfer/deposit */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Método de Pago</h3>

                  {/* Transfer/deposit info card */}
                  <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            Transferencia / Depósito
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Recibirás las instrucciones de pago al reservar
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        24-48h
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Tu boleto será confirmado una vez verificado el pago
                  </p>
                </div>

                {/* Price summary */}
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subtotal ({selectedTickets.length} boletos)
                    </span>
                    <span className="font-medium">
                      {formatCurrency(subtotal, raffle.currency_code || 'MXN')}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>
                        Descuento ({appliedCoupon?.code})
                      </span>
                      <span>
                        -{formatCurrency(discount, raffle.currency_code || 'MXN')}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-foreground">
                        Total a Pagar
                      </span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(total, raffle.currency_code || 'MXN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCurrentStep(1)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={handleCompleteReservation}
                    disabled={isProcessing || reserveTickets.isPending}
                  >
                    {isProcessing || reserveTickets.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        Reservar Boletos
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Success with Payment Methods & Upload */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Countdown banner */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="h-4 w-4 shrink-0 animate-pulse" />
                    <span className="text-sm font-medium truncate">Tiempo para pagar:</span>
                  </div>
                  {reservedUntil && (
                    <CountdownTimer 
                      targetDate={new Date(reservedUntil)} 
                      variant="compact"
                      className="shrink-0"
                    />
                  )}
                </div>

                {/* Success message - compact */}
                <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">¡Boletos reservados! 🎉</p>
                    <p className="text-sm text-muted-foreground">Realiza tu pago para confirmarlos</p>
                  </div>
                </div>

                {/* Reference code + tickets in one card */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Tu código de referencia</p>
                      <p className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                        {referenceCode}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={copyReferenceCode}
                    >
                      {copiedRef ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedRef ? 'Copiado' : 'Copiar'}
                    </Button>
                  </div>
                  
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Boletos:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTickets.slice(0, 6).map((ticket, idx) => (
                        <Badge key={idx} variant="secondary" className="text-sm">
                          #{ticket}
                        </Badge>
                      ))}
                      {selectedTickets.length > 6 && (
                        <Badge variant="outline" className="text-sm">
                          +{selectedTickets.length - 6} más
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total a pagar:</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(total, raffle.currency_code || 'MXN')}
                    </span>
                  </div>
                </div>

                {/* Payment Methods Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-500" />
                    <h3 className="font-semibold text-foreground">Datos para el pago</h3>
                  </div>

                  {isLoadingPaymentMethods ? (
                    <div className="p-4 bg-muted/30 rounded-xl animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                      <div className="h-10 bg-muted rounded mb-2" />
                      <div className="h-10 bg-muted rounded" />
                    </div>
                  ) : !paymentMethods || paymentMethods.length === 0 ? (
                    <div className="p-4 bg-muted/30 rounded-xl text-center">
                      <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium text-foreground">Contacta al organizador</p>
                      <p className="text-sm text-muted-foreground">Para coordinar tu pago</p>
                    </div>
                  ) : paymentMethods.length === 1 ? (
                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                      <PaymentMethodDisplay
                        method={paymentMethods[0]}
                        totalAmount={total}
                        currencyCode={raffle.currency_code || 'MXN'}
                        referenceCode={referenceCode}
                        ticketNumbers={selectedTickets}
                        onCopy={(text, field) => {
                          navigator.clipboard.writeText(text);
                          setCopiedField(field);
                          toast.success('Copiado');
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        copied={copiedField}
                        variant="light"
                      />
                    </div>
                  ) : (
                    <Tabs defaultValue={paymentMethods[0].id} className="w-full">
                      <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/30 p-1">
                        {paymentMethods.map(method => (
                          <TabsTrigger 
                            key={method.id} 
                            value={method.id}
                            className="flex-1 min-w-[80px] gap-1.5 text-xs"
                          >
                            {getPaymentMethodIcon(method)}
                            <span className="hidden sm:inline truncate">{getPaymentMethodLabel(method)}</span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {paymentMethods.map(method => (
                        <TabsContent key={method.id} value={method.id} className="mt-3">
                          <div className="p-4 bg-muted/30 rounded-xl border border-border">
                            <PaymentMethodDisplay
                              method={method}
                              totalAmount={total}
                              currencyCode={raffle.currency_code || 'MXN'}
                              referenceCode={referenceCode}
                              ticketNumbers={selectedTickets}
                              onCopy={(text, field) => {
                                navigator.clipboard.writeText(text);
                                setCopiedField(field);
                                toast.success('Copiado');
                                setTimeout(() => setCopiedField(null), 2000);
                              }}
                              copied={copiedField}
                              variant="light"
                            />
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  )}
                </div>

                {/* Upload Payment Proof */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-emerald-500" />
                    <h3 className="font-semibold text-foreground">Subir comprobante</h3>
                  </div>

                  {proofUploaded ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3">
                        <Check className="h-6 w-6 text-emerald-500" />
                        <div>
                          <p className="font-medium text-emerald-700 dark:text-emerald-300">
                            ¡Comprobante enviado!
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Revisaremos tu pago y confirmaremos tus boletos
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <PaymentProofUploader
                      raffleId={raffle.id}
                      referenceCode={referenceCode}
                      ticketIds={reservedTickets.map(t => t.id)}
                      buyerName={form.getValues('name')}
                      buyerEmail={form.getValues('email')}
                      onUploadSuccess={() => {
                        setProofUploaded(true);
                        toast.success('¡Comprobante enviado!', {
                          description: 'Revisaremos tu pago pronto'
                        });
                      }}
                      variant="compact"
                    />
                  )}
                </div>

                {/* WhatsApp Contact */}
                {raffle.organization?.phone && (
                  <WhatsAppContactButton
                    organizationPhone={raffle.organization.phone}
                    organizationName={raffle.organization.name}
                    organizationLogo={raffle.organization.logo_url}
                    raffleTitle={raffle.title}
                    ticketNumbers={selectedTickets}
                    totalAmount={total}
                    currencyCode={raffle.currency_code || 'MXN'}
                    buyerName={form.getValues('name')}
                    referenceCode={referenceCode}
                    variant="button"
                  />
                )}

                {/* Telegram Opt-In */}
                <TelegramOptIn
                  buyerEmail={form.getValues('email')}
                  organizationTier={raffle.organization?.subscription_tier}
                />

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={handleClose}
                  >
                    {proofUploaded ? 'Cerrar' : 'Finalizar después'}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
