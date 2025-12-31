import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { formatCurrency } from "@/lib/currency-utils";
import { useReserveTickets } from "@/hooks/usePublicRaffle";
import { useEmails } from "@/hooks/useEmails";
import { notifyPaymentPending } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
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
  Share2
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
  city: z.string().max(100, "La ciudad es demasiado larga").optional(),
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
  raffle: Raffle & { organization?: { phone?: string | null; name?: string; logo_url?: string | null; subscription_tier?: string | null } };
  selectedTickets: string[];
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
  
  const reserveTickets = useReserveTickets();
  const { sendReservationEmail } = useEmails();
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

  const calculateSubtotal = () => {
    const matchingPackage = packages.find(p => p.quantity === selectedTickets.length);
    if (matchingPackage) {
      return matchingPackage.price;
    }
    return selectedTickets.length * ticketPrice;
  };

  const subtotal = calculateSubtotal();
  const total = subtotal - discount;

  const handleContinueToPayment = async () => {
    const isValid = await form.trigger(['name', 'email', 'phone', 'acceptTerms']);
    if (!isValid) return;

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
    setIsProcessing(true);

    const data = form.getValues();
    const cleanPhone = data.phone.replace(/\D/g, '');

    try {
      const result = await reserveTickets.mutateAsync({
        raffleId: raffle.id,
        ticketNumbers: selectedTickets,
        buyerData: {
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: cleanPhone,
          city: data.city?.trim(),
        },
        reservationMinutes: raffle.reservation_time_minutes || 15,
        orderTotal: total,
      });

      // Store reserved tickets info
      setReservedTickets(result.tickets.map(t => ({ id: t.id, ticket_number: t.ticket_number })));
      setReservedUntil(result.reservedUntil);
      setReferenceCode(result.referenceCode);

      // Send reservation email (non-blocking)
      sendReservationEmail({
        to: data.email,
        buyerName: data.name,
        ticketNumbers: selectedTickets,
        raffleTitle: raffle.title,
        raffleSlug: raffle.slug,
        amount: total,
        currency: raffle.currency_code || 'MXN',
        timerMinutes: raffle.reservation_time_minutes || 15,
        referenceCode: result.referenceCode,
      }).catch(console.error);

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
                  selectedTickets,
                  data.name
                )
              )
            );
          }
        } catch (err) {
          console.error('Error notifying organizer:', err);
        }
      })();

      // Fire confetti celebration
      fireConfetti();

      // Move to success step
      setCurrentStep(3);
    } catch (error) {
      // Error handled in mutation
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
                {/* Selected tickets summary */}
                <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <Ticket className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {selectedTickets.length} Boleto{selectedTickets.length !== 1 && 's'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedTickets.slice(0, 5).join(', ')}{selectedTickets.length > 5 && '...'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(subtotal, raffle.currency_code || 'MXN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reservation Time Notice */}
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Tienes {raffle.reservation_time_minutes || 15} minutos para completar el pago
                  </span>
                </div>

                {/* Premium form fields */}
                <Form {...form}>
                  <div className="space-y-4">
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
                            <FormLabel>Ciudad</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="CDMX"
                                  className="pl-10 h-12 border-2 focus:border-emerald-500 rounded-xl"
                                  {...field}
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

            {/* Step 3: Success */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="text-center py-6 space-y-6"
              >
                {/* Success animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="relative mx-auto w-20 h-20"
                >
                  <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full animate-pulse" />
                  <div className="absolute inset-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                    <Check className="h-8 w-8 text-white" />
                  </div>
                </motion.div>

                <div>
                  <h3 className="text-2xl font-bold text-foreground">
                    ¡Reserva Exitosa!
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    Hemos enviado la confirmación a tu correo
                  </p>
                </div>

                {/* Reference code */}
                {referenceCode && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-muted-foreground mb-1">Código de Referencia:</p>
                    <p className="text-2xl font-mono font-bold text-amber-600 tracking-widest">
                      {referenceCode}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Comparte este código con el organizador para identificar tu pago
                    </p>
                  </div>
                )}

                {/* Ticket numbers */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-muted-foreground mb-2">Tus boletos:</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedTickets.join(', ')}
                  </p>
                </div>

                {/* Reservation timer reminder */}
                <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                  <span>
                    Recuerda completar el pago en {raffle.reservation_time_minutes || 15} minutos
                  </span>
                </div>

                {/* WhatsApp Contact - with reference code */}
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

                {/* Telegram Opt-In for Premium/Enterprise orgs */}
                <TelegramOptIn
                  buyerEmail={form.getValues('email')}
                  organizationTier={raffle.organization?.subscription_tier}
                />

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={handleClose}
                  >
                    Ver Instrucciones de Pago
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
