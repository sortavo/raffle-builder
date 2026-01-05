import React, { useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CountdownTimer } from "@/components/raffle/public/CountdownTimer";
import { usePublicRaffle, useUploadPaymentProof } from "@/hooks/usePublicRaffle";
import { usePublicPaymentMethods, PaymentMethod } from "@/hooks/usePaymentMethods";
import { useEmails } from "@/hooks/useEmails";
import { formatCurrency } from "@/lib/currency-utils";
import { WhatsAppContactButton } from "@/components/raffle/public/WhatsAppContactButton";
import { cn } from "@/lib/utils";
import { BankBadge } from "@/components/ui/BankBadge";
import { useScopedDarkMode } from "@/hooks/useScopedDarkMode";
import { useTrackingEvents } from "@/hooks/useTrackingEvents";
import { 
  Loader2, 
  Upload, 
  Copy, 
  Check, 
  AlertTriangle, 
  Ticket, 
  CheckCircle2,
  Landmark,
  Wallet,
  CreditCard,
  Info,
  Store,
  Pill,
  ShoppingBag,
  HandCoins,
  ArrowRightLeft,
  MapPin,
  Clock,
  ExternalLink,
  RefreshCw,
  ImageIcon
} from "lucide-react";

// Payment subtype configurations
const SUBTYPE_CONFIG = {
  bank_deposit: { label: 'Depósito en ventanilla', icon: Landmark, color: 'text-blue-400' },
  bank_transfer: { label: 'Transferencia SPEI', icon: ArrowRightLeft, color: 'text-blue-400' },
  oxxo: { label: 'OXXO Pay', icon: Store, color: 'text-red-400' },
  pharmacy: { label: 'Farmacias', icon: Pill, color: 'text-green-400' },
  convenience_store: { label: '7-Eleven / Tiendas', icon: ShoppingBag, color: 'text-orange-400' },
  paypal: { label: 'PayPal', icon: CreditCard, color: 'text-blue-400' },
  mercado_pago: { label: 'Mercado Pago', icon: Wallet, color: 'text-sky-400' },
  cash_in_person: { label: 'Efectivo en persona', icon: HandCoins, color: 'text-emerald-400' },
} as const;

// localStorage key for persisting reservation state
const RESERVATION_STORAGE_KEY = 'sortavo_reservation_state';

interface ReservationState {
  tickets: { id: string; ticket_number: string }[];
  reservedUntil: string;
  raffleId: string;
  buyerName?: string;
  buyerEmail?: string;
  slug: string;
  totalAmount?: number;
  referenceCode?: string;
}

function getPersistedReservation(slug: string): ReservationState | null {
  try {
    const stored = localStorage.getItem(RESERVATION_STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored) as ReservationState;
    // Only return if same raffle and not expired
    if (data.slug === slug && new Date(data.reservedUntil) > new Date()) {
      return data;
    }
    // Clean up expired reservation
    localStorage.removeItem(RESERVATION_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

function persistReservation(state: ReservationState) {
  try {
    localStorage.setItem(RESERVATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.error('Failed to persist reservation state');
  }
}

function clearPersistedReservation() {
  try {
    localStorage.removeItem(RESERVATION_STORAGE_KEY);
  } catch {
    console.error('Failed to clear reservation state');
  }
}

interface PaymentInstructionsProps {
  tenantOrgSlug?: string;
  raffleSlugOverride?: string;
}

export default function PaymentInstructions({ tenantOrgSlug, raffleSlugOverride }: PaymentInstructionsProps = {}) {
  // Activate Ultra-Dark theme
  useScopedDarkMode();
  
  const { slug: paramSlug, orgSlug: paramOrgSlug } = useParams<{ slug: string; orgSlug?: string }>();
  
  // Priority: override (from custom domain router) > route param
  const slug = raffleSlugOverride || paramSlug;
  const effectiveOrgSlug = tenantOrgSlug || paramOrgSlug;
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendProofReceivedEmail } = useEmails();

  // Try to get state from location first, then from localStorage
  const locationState = location.state as {
    tickets: { id: string; ticket_number: string }[];
    reservedUntil: string;
    raffleId: string;
    buyerName?: string;
    buyerEmail?: string;
    totalAmount?: number;
    referenceCode?: string;
  } | null;

  const persistedState = !locationState ? getPersistedReservation(slug || '') : null;
  
  const { tickets, reservedUntil, raffleId, buyerName, buyerEmail, totalAmount: passedTotalAmount, referenceCode } = locationState || 
    persistedState || 
    { tickets: [], reservedUntil: '', raffleId: '', referenceCode: undefined };

  // Persist state on mount if coming from location
  React.useEffect(() => {
    if (locationState && locationState.tickets.length > 0 && slug) {
      persistReservation({ ...locationState, slug });
    }
  }, [locationState, slug]);

  // Clear persisted state when reservation expires or payment is uploaded
  const handleReservationComplete = React.useCallback(() => {
    clearPersistedReservation();
  }, []);

  const { data: raffle, isLoading: isLoadingRaffle } = usePublicRaffle(slug, effectiveOrgSlug);
  const { data: paymentMethods, isLoading: isLoadingMethods } = usePublicPaymentMethods(raffle?.organization?.id);
  const uploadProof = useUploadPaymentProof();
  const { trackAddPaymentInfo } = useTrackingEvents();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  // Check if this reservation already has a payment proof
  const { data: existingProof, refetch: refetchProof } = useQuery({
    queryKey: ['existing-proof', raffleId, referenceCode],
    queryFn: async () => {
      if (!raffleId || !referenceCode) return null;
      
      const { data, error } = await supabase
        .from('tickets')
        .select('payment_proof_url')
        .eq('raffle_id', raffleId)
        .eq('payment_reference', referenceCode)
        .eq('status', 'reserved')
        .not('payment_proof_url', 'is', null)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking existing proof:', error);
        return null;
      }
      
      return data?.payment_proof_url || null;
    },
    enabled: !!raffleId && !!referenceCode,
    staleTime: 30000,
  });

  if (!tickets.length || (!isLoadingRaffle && !raffle)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-ultra-dark relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        </div>
        
        <div className="relative z-10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white">No hay reservación activa</h1>
          <Button 
            onClick={() => navigate(`/r/${slug}`)}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25"
          >
            Volver al sorteo
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingRaffle) {
    return (
      <div className="min-h-screen bg-ultra-dark py-8">
        <div className="container mx-auto px-4 max-w-2xl space-y-6">
          <Skeleton className="h-16 w-full bg-white/5" />
          <Skeleton className="h-40 w-full bg-white/5" />
          <Skeleton className="h-60 w-full bg-white/5" />
        </div>
      </div>
    );
  }

  // Prefer package pricing when ticket count matches a package (covers old reservations too)
  const ticketCount = tickets.length;
  const unitTotal = ticketCount * Number(raffle!.ticket_price);
  const packagePrice = raffle?.packages?.find((p: any) => p.quantity === ticketCount)?.price;
  const packageTotal = packagePrice != null ? Number(packagePrice) : unitTotal;

  let totalAmount = passedTotalAmount ?? packageTotal;
  // If we received the full unitTotal but a package exists, correct it to the package total
  if (packagePrice != null && totalAmount === unitTotal) {
    totalAmount = packageTotal;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({ 
        title: "Archivo muy grande", 
        description: "El archivo debe ser menor a 5MB",
        variant: "destructive" 
      });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast({ 
        title: "Tipo de archivo no válido", 
        description: "Solo se permiten imágenes JPG, PNG o WEBP",
        variant: "destructive" 
      });
      return;
    }

    const img = document.createElement('img');
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width > 4000 || img.height > 4000) {
        toast({
          title: "Imagen muy grande",
          description: "La imagen debe ser menor a 4000x4000 píxeles",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      toast({
        title: "Archivo inválido",
        description: "No se pudo procesar la imagen",
        variant: "destructive"
      });
    };
    img.src = URL.createObjectURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    // Validate referenceCode is present
    if (!referenceCode) {
      toast({
        title: "Error",
        description: "No se encontró la clave de reserva. Por favor, vuelve a seleccionar tus boletos.",
        variant: "destructive"
      });
      return;
    }
    
    // Track add_payment_info event
    trackAddPaymentInfo({
      value: totalAmount,
      currency: raffle!.currency_code || 'MXN',
      paymentType: 'proof_upload',
      itemId: raffleId,
      itemName: raffle!.title,
    });
    
    await uploadProof.mutateAsync({
      raffleId,
      ticketIds: tickets.map(t => t.id),
      file,
      buyerName: buyerName || undefined,
      buyerEmail: buyerEmail || undefined,
      referenceCode,
    });

    // Clear persisted state after successful upload
    handleReservationComplete();

    if (buyerEmail && buyerName) {
      sendProofReceivedEmail({
        to: buyerEmail,
        buyerName,
        ticketNumbers: tickets.map(t => t.ticket_number),
        raffleTitle: raffle!.title,
      }).catch(console.error);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    toast({ title: "Copiado al portapapeles" });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExpire = () => {
    toast({ title: "Reservación expirada", description: "El tiempo de tu reservación ha terminado", variant: "destructive" });
    navigate(`/r/${slug}`);
  };

  const getMethodIcon = (method: PaymentMethod) => {
    const m = method as any;
    const subtype = m.subtype as keyof typeof SUBTYPE_CONFIG | null;
    
    if (subtype && SUBTYPE_CONFIG[subtype]) {
      const Icon = SUBTYPE_CONFIG[subtype].icon;
      return <Icon className={cn("h-4 w-4", SUBTYPE_CONFIG[subtype].color)} />;
    }
    
    // Fallback to old type system
    switch (method.type) {
      case "bank_transfer":
        return <Landmark className="h-4 w-4" />;
      case "cash":
        return <Wallet className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getMethodLabel = (method: PaymentMethod) => {
    const m = method as any;
    const subtype = m.subtype as keyof typeof SUBTYPE_CONFIG | null;
    
    if (subtype && SUBTYPE_CONFIG[subtype]) {
      return SUBTYPE_CONFIG[subtype].label;
    }
    
    return method.name;
  };

  const renderPaymentDetails = (method: PaymentMethod) => {
    const m = method as any;
    const subtype = m.subtype as string | null;
    
    // Bank transfer or deposit
    if (subtype === 'bank_transfer' || subtype === 'bank_deposit' || method.type === 'bank_transfer') {
      return (
        <div className="space-y-3">
          {method.bank_name && (
            <div className="mb-4">
              <BankBadge bankName={method.bank_name} size="lg" />
            </div>
          )}
          
          {/* Amount */}
          <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div>
              <p className="text-sm text-white/60">Monto a depositar</p>
              <p className="font-mono font-bold text-lg text-white">{formatCurrency(totalAmount, raffle!.currency_code || 'MXN')}</p>
            </div>
            <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(totalAmount.toString(), `amount-${method.id}`)}>
              {copied === `amount-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* CLABE */}
          {method.clabe && (
            <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <div>
                <p className="text-sm text-white/60">CLABE Interbancaria</p>
                <p className="font-mono font-medium text-white">{method.clabe}</p>
              </div>
              <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(method.clabe!, `clabe-${method.id}`)}>
                {copied === `clabe-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Account Number */}
          {method.account_number && (
            <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <div>
                <p className="text-sm text-white/60">Número de Cuenta</p>
                <p className="font-mono font-medium text-white">{method.account_number}</p>
              </div>
              <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(method.account_number!, `account-${method.id}`)}>
                {copied === `account-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Card Number */}
          {m.card_number && (
            <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <div>
                <p className="text-sm text-white/60">Tarjeta de Débito</p>
                <p className="font-mono font-medium text-white">{m.card_number.replace(/(.{4})/g, '$1 ').trim()}</p>
              </div>
              <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(m.card_number!, `card-${method.id}`)}>
                {copied === `card-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Account Holder */}
          {method.account_holder && (
            <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <div>
                <p className="text-sm text-white/60">Titular de la Cuenta</p>
                <p className="font-medium text-white">{method.account_holder}</p>
              </div>
              <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(method.account_holder!, `holder-${method.id}`)}>
                {copied === `holder-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Reference */}
          <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div>
              <p className="text-sm text-white/60">Concepto / Referencia</p>
              <p className="font-mono font-medium text-white">{referenceCode || `Boletos ${tickets.map(t => t.ticket_number).join(', ')}`}</p>
            </div>
            <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(referenceCode || `Boletos ${tickets.map(t => t.ticket_number).join(', ')}`, `ref-${method.id}`)}>
              {copied === `ref-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Instructions */}
          {method.instructions && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-white/80">{method.instructions}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Store payments (OXXO, pharmacy, convenience store)
    if (subtype === 'oxxo' || subtype === 'pharmacy' || subtype === 'convenience_store') {
      const config = SUBTYPE_CONFIG[subtype as keyof typeof SUBTYPE_CONFIG];
      const Icon = config?.icon || Store;
      
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Icon className={cn("h-5 w-5", config?.color)} />
            <span className="font-semibold text-lg text-white">{config?.label || 'Tienda'}</span>
          </div>

          {/* Amount */}
          <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div>
              <p className="text-sm text-white/60">Monto a depositar</p>
              <p className="font-mono font-bold text-lg text-white">{formatCurrency(totalAmount, raffle!.currency_code || 'MXN')}</p>
            </div>
            <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(totalAmount.toString(), `amount-${method.id}`)}>
              {copied === `amount-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Card Number */}
          {m.card_number && (
            <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <div>
                <p className="text-sm text-white/60">Número de Tarjeta</p>
                <p className="font-mono font-medium text-lg text-white">{m.card_number.replace(/(.{4})/g, '$1 ').trim()}</p>
              </div>
              <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(m.card_number!, `card-${method.id}`)}>
                {copied === `card-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Account Holder */}
          {method.account_holder && (
            <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <div>
                <p className="text-sm text-white/60">A nombre de</p>
                <p className="font-medium text-white">{method.account_holder}</p>
              </div>
              <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(method.account_holder!, `holder-${method.id}`)}>
                {copied === `holder-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Bank */}
          {method.bank_name && (
            <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <p className="text-sm text-white/60 mb-1">Banco</p>
              <BankBadge bankName={method.bank_name} size="sm" />
            </div>
          )}

          {/* Reference */}
          <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div>
              <p className="text-sm text-white/60">Referencia</p>
              <p className="font-mono font-medium text-white">{referenceCode || tickets.map(t => t.ticket_number).join('-')}</p>
            </div>
            <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(referenceCode || tickets.map(t => t.ticket_number).join('-'), `ref-${method.id}`)}>
              {copied === `ref-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Instructions */}
          {method.instructions && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-white/80">{method.instructions}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // PayPal
    if (subtype === 'paypal') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-blue-400" />
            <span className="font-semibold text-lg text-white">PayPal</span>
          </div>

          {/* Amount */}
          <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div>
              <p className="text-sm text-white/60">Monto a pagar</p>
              <p className="font-mono font-bold text-lg text-white">{formatCurrency(totalAmount, raffle!.currency_code || 'MXN')}</p>
            </div>
            <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(totalAmount.toString(), `amount-${method.id}`)}>
              {copied === `amount-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* PayPal Email */}
          {m.paypal_email && (
            <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <div>
                <p className="text-sm text-white/60">Email de PayPal</p>
                <p className="font-medium text-white">{m.paypal_email}</p>
              </div>
              <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(m.paypal_email!, `email-${method.id}`)}>
                {copied === `email-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* PayPal Link */}
          {m.paypal_link && (
            <Button 
              className="w-full bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-white" 
              variant="outline"
              onClick={() => window.open(m.paypal_link, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir PayPal.me
            </Button>
          )}

          {/* Reference */}
          <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div>
              <p className="text-sm text-white/60">Nota del pago</p>
              <p className="font-mono font-medium text-white">{referenceCode || `Boletos ${tickets.map(t => t.ticket_number).join(', ')}`}</p>
            </div>
            <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(referenceCode || `Boletos ${tickets.map(t => t.ticket_number).join(', ')}`, `ref-${method.id}`)}>
              {copied === `ref-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {method.instructions && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-white/80">{method.instructions}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Mercado Pago
    if (subtype === 'mercado_pago') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-sky-400" />
            <span className="font-semibold text-lg text-white">Mercado Pago</span>
          </div>

          {/* Amount */}
          <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div>
              <p className="text-sm text-white/60">Monto a pagar</p>
              <p className="font-mono font-bold text-lg text-white">{formatCurrency(totalAmount, raffle!.currency_code || 'MXN')}</p>
            </div>
            <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(totalAmount.toString(), `amount-${method.id}`)}>
              {copied === `amount-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Payment Link */}
          {m.payment_link && (
            <Button 
              className="w-full bg-sky-500 hover:bg-sky-600 text-white" 
              onClick={() => window.open(m.payment_link, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ir a Mercado Pago
            </Button>
          )}

          {/* Reference */}
          <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div>
              <p className="text-sm text-white/60">Referencia</p>
              <p className="font-mono font-medium text-white">{referenceCode || tickets.map(t => t.ticket_number).join('-')}</p>
            </div>
            <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(referenceCode || tickets.map(t => t.ticket_number).join('-'), `ref-${method.id}`)}>
              {copied === `ref-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {method.instructions && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-white/80">{method.instructions}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Cash in person
    if (subtype === 'cash_in_person' || method.type === 'cash') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <HandCoins className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold text-lg text-white">Efectivo en Persona</span>
          </div>

          {/* Amount */}
          <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div>
              <p className="text-sm text-white/60">Monto a pagar</p>
              <p className="font-mono font-bold text-lg text-white">{formatCurrency(totalAmount, raffle!.currency_code || 'MXN')}</p>
            </div>
          </div>

          {/* Location */}
          {m.location && (
            <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-white/60 mt-0.5" />
                <div>
                  <p className="text-sm text-white/60">Ubicación</p>
                  <p className="font-medium text-white">{m.location}</p>
                </div>
              </div>
            </div>
          )}

          {/* Schedule */}
          {m.schedule && (
            <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-white/60 mt-0.5" />
                <div>
                  <p className="text-sm text-white/60">Horarios</p>
                  <p className="font-medium text-white">{m.schedule}</p>
                </div>
              </div>
            </div>
          )}

          {/* Reference */}
          <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div>
              <p className="text-sm text-white/60">Boletos</p>
              <p className="font-mono font-medium text-white">{tickets.map(t => `#${t.ticket_number}`).join(', ')}</p>
            </div>
          </div>

          {method.instructions && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-white/80">{method.instructions}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Default / Other
    return (
      <div className="space-y-4">
        {/* Amount */}
        <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
          <div>
            <p className="text-sm text-white/60">Monto a pagar</p>
            <p className="font-mono font-bold text-lg text-white">{formatCurrency(totalAmount, raffle!.currency_code || 'MXN')}</p>
          </div>
          <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(totalAmount.toString(), `amount-${method.id}`)}>
            {copied === `amount-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Reference */}
        <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
          <div>
            <p className="text-sm text-white/60">Referencia</p>
            <p className="font-mono font-medium text-white">{tickets.map(t => t.ticket_number).join('-')}</p>
          </div>
          <Button size="icon" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(tickets.map(t => t.ticket_number).join('-'), `ref-${method.id}`)}>
            {copied === `ref-${method.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Instructions */}
        {method.instructions ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-sm text-white/80">{method.instructions}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/60">
            Contacta directamente al organizador para coordinar el pago.
          </p>
        )}
      </div>
    );
  };

  const enabledMethods = paymentMethods?.filter(m => m.enabled) || [];
  const hasPaymentMethods = enabledMethods.length > 0;

  return (
    <div className="min-h-screen bg-ultra-dark py-8">
      <div className="container mx-auto px-4 max-w-2xl space-y-6">
        {/* Countdown Header */}
        <Card className="border-amber-500/30 bg-amber-500/10 backdrop-blur-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-amber-300">Tu reservación expira en:</span>
              <CountdownTimer
                targetDate={new Date(reservedUntil)}
                variant="compact"
                onExpire={handleExpire}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reservation Summary */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Ticket className="h-5 w-5 text-emerald-400" />
              Resumen de tu Reservación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reference Code - Prominent display */}
            {referenceCode && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wide font-medium">Clave de Reserva</p>
                    <p className="font-mono text-2xl font-bold text-emerald-400 tracking-widest mt-1">{referenceCode}</p>
                  </div>
                  <Button 
                    size="icon" 
                    variant="outline"
                    className="h-10 w-10 shrink-0 border-white/20 text-white hover:bg-white/10"
                    onClick={() => copyToClipboard(referenceCode, 'referenceCode')}
                  >
                    {copied === 'referenceCode' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-white/60 mt-2">
                  Guarda esta clave. La necesitarás si tienes algún problema con tu pago.
                </p>
              </div>
            )}

            {/* Buyer info */}
            {(buyerName || buyerEmail) && (
              <div className="flex flex-col gap-1 text-sm">
                {buyerName && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/60">Nombre:</span>
                    <span className="font-medium text-white">{buyerName}</span>
                  </div>
                )}
                {buyerEmail && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/60">Email:</span>
                    <span className="font-medium text-white">{buyerEmail}</span>
                  </div>
                )}
              </div>
            )}

            {/* Ticket numbers */}
            <div className="flex flex-wrap gap-2">
              {tickets.map(t => (
                <Badge key={t.id} variant="secondary" className="text-lg px-3 py-1 bg-white/[0.06] text-white border-white/10">
                  #{t.ticket_number}
                </Badge>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <span className="font-medium text-white">Total a pagar:</span>
              <span className="text-2xl font-bold text-emerald-400">
                {formatCurrency(totalAmount, raffle!.currency_code || 'MXN')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Instrucciones de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMethods ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full bg-white/5" />
                <Skeleton className="h-32 w-full bg-white/5" />
              </div>
            ) : !hasPaymentMethods ? (
              <div className="text-center py-6 text-white/60">
                <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium text-white">Métodos de pago no configurados</p>
                <p className="text-sm mt-1">Contacta directamente al organizador para coordinar tu pago.</p>
              </div>
            ) : enabledMethods.length === 1 ? (
              renderPaymentDetails(enabledMethods[0])
            ) : (
              <Tabs defaultValue={enabledMethods[0].id} className="w-full">
                <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-white/[0.03] p-1">
                  {enabledMethods.map(method => (
                    <TabsTrigger 
                      key={method.id} 
                      value={method.id}
                      className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-white/60"
                    >
                      {getMethodIcon(method)}
                      <span className="hidden sm:inline text-xs">{getMethodLabel(method)}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {enabledMethods.map(method => (
                  <TabsContent key={method.id} value={method.id} className="mt-4">
                    {renderPaymentDetails(method)}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Upload Payment Proof */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Upload className="h-5 w-5 text-emerald-400" />
              Subir Comprobante de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing proof indicator */}
            {existingProof && !showReplaceConfirm && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-emerald-300">Comprobante registrado</p>
                    <p className="text-sm text-white/60">Ya subiste un comprobante para esta reservación</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={() => window.open(existingProof, '_blank')}
                    >
                      <ImageIcon className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={() => setShowReplaceConfirm(true)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reemplazar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Replace confirmation */}
            {showReplaceConfirm && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-300">¿Reemplazar comprobante?</p>
                    <p className="text-sm text-white/60 mt-1">
                      El comprobante anterior será reemplazado. Asegúrate de subir la imagen correcta.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => setShowReplaceConfirm(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-black"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Sí, subir nuevo
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* File upload area - only show if no existing proof or replacing */}
            {(!existingProof || showReplaceConfirm) && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                
                {preview ? (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden bg-white/[0.03]">
                      <img src={preview} alt="Preview" className="w-full max-h-64 object-contain" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 border-white/20 text-white hover:bg-white/10"
                        onClick={() => {
                          setFile(null);
                          setPreview(null);
                        }}
                      >
                        Cambiar
                      </Button>
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                      onClick={handleUpload}
                      disabled={uploadProof.isPending}
                    >
                      {uploadProof.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Enviar Comprobante
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-white/[0.02] transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 mx-auto mb-3 text-white/40" />
                    <p className="font-medium text-white">Clic para seleccionar imagen</p>
                    <p className="text-sm text-white/60 mt-1">JPG, PNG o WEBP (máx. 5MB)</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Contact */}
        {raffle?.organization?.whatsapp_number && (
          <WhatsAppContactButton
            organizationPhone={raffle.organization.whatsapp_number}
            organizationName={raffle.organization.name}
            organizationLogo={raffle.organization.logo_url}
            raffleTitle={raffle.title}
            ticketNumbers={tickets.map(t => t.ticket_number)}
            totalAmount={totalAmount}
            currencyCode={raffle.currency_code || 'MXN'}
            buyerName={buyerName}
            referenceCode={referenceCode}
            variant="expanded"
          />
        )}
      </div>
    </div>
  );
}
