import { PaymentMethod } from "@/hooks/usePaymentMethods";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BankBadge } from "@/components/ui/BankBadge";
import { cn } from "@/lib/utils";
import {
  Copy,
  Check,
  Info,
  Landmark,
  Store,
  Pill,
  ShoppingBag,
  HandCoins,
  ArrowRightLeft,
  MapPin,
  Clock,
  ExternalLink,
  CreditCard,
  Wallet,
  Eye,
  EyeOff,
  Smartphone
} from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Payment subtype configurations
const SUBTYPE_CONFIG = {
  bank_deposit: { label: 'Depósito en ventanilla', icon: Landmark, color: 'text-blue-600' },
  bank_transfer: { label: 'Transferencia SPEI', icon: ArrowRightLeft, color: 'text-blue-600' },
  oxxo: { label: 'OXXO Pay', icon: Store, color: 'text-red-600' },
  pharmacy: { label: 'Farmacias', icon: Pill, color: 'text-green-600' },
  convenience_store: { label: '7-Eleven / Tiendas', icon: ShoppingBag, color: 'text-orange-600' },
  paypal: { label: 'PayPal', icon: CreditCard, color: 'text-blue-500' },
  mercado_pago: { label: 'Mercado Pago', icon: Wallet, color: 'text-sky-500' },
  cash_in_person: { label: 'Efectivo en persona', icon: HandCoins, color: 'text-emerald-600' },
} as const;

interface PaymentMethodsPreviewProps {
  methods: PaymentMethod[];
}

export function PaymentMethodsPreview({ methods }: PaymentMethodsPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const enabledMethods = methods.filter(m => m.enabled);

  if (enabledMethods.length === 0) {
    return null;
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getMethodIcon = (method: PaymentMethod) => {
    const m = method as any;
    const subtype = m.subtype as keyof typeof SUBTYPE_CONFIG | null;
    
    if (subtype && SUBTYPE_CONFIG[subtype]) {
      const Icon = SUBTYPE_CONFIG[subtype].icon;
      return <Icon className={cn("h-4 w-4", SUBTYPE_CONFIG[subtype].color)} />;
    }
    
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
        <div className="space-y-2">
          {method.bank_name && (
            <div className="mb-3">
              <BankBadge bankName={method.bank_name} size="md" />
            </div>
          )}
          
          {/* Amount example */}
          <div className="flex justify-between items-center p-2 bg-muted rounded-lg text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Monto a depositar</p>
              <p className="font-mono font-bold">$500.00 MXN</p>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy("500", `amount-${method.id}`)}>
              {copiedField === `amount-${method.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>

          {method.clabe && (
            <div className="flex justify-between items-center p-2 bg-muted rounded-lg text-sm">
              <div>
                <p className="text-xs text-muted-foreground">CLABE Interbancaria</p>
                <p className="font-mono text-xs">{method.clabe}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(method.clabe!, `clabe-${method.id}`)}>
                {copiedField === `clabe-${method.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          )}

          {method.account_number && (
            <div className="flex justify-between items-center p-2 bg-muted rounded-lg text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Número de Cuenta</p>
                <p className="font-mono text-xs">{method.account_number}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(method.account_number!, `account-${method.id}`)}>
                {copiedField === `account-${method.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          )}

          {m.card_number && (
            <div className="flex justify-between items-center p-2 bg-muted rounded-lg text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Tarjeta</p>
                <p className="font-mono text-xs">{m.card_number.replace(/(.{4})/g, '$1 ').trim()}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(m.card_number!, `card-${method.id}`)}>
                {copiedField === `card-${method.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          )}

          {method.account_holder && (
            <div className="p-2 bg-muted rounded-lg text-sm">
              <p className="text-xs text-muted-foreground">Titular</p>
              <p className="text-xs font-medium">{method.account_holder}</p>
            </div>
          )}

          {method.instructions && (
            <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-1.5">
                <Info className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <p className="text-xs">{method.instructions}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Store payments
    if (subtype === 'oxxo' || subtype === 'pharmacy' || subtype === 'convenience_store') {
      return (
        <div className="space-y-2">
          {m.card_number && (
            <div className="flex justify-between items-center p-2 bg-muted rounded-lg text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Número de Tarjeta</p>
                <p className="font-mono text-xs">{m.card_number.replace(/(.{4})/g, '$1 ').trim()}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(m.card_number!, `card-${method.id}`)}>
                {copiedField === `card-${method.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          )}

          {method.account_holder && (
            <div className="p-2 bg-muted rounded-lg text-sm">
              <p className="text-xs text-muted-foreground">A nombre de</p>
              <p className="text-xs font-medium">{method.account_holder}</p>
            </div>
          )}

          {method.bank_name && (
            <div className="p-2 bg-muted rounded-lg text-sm">
              <p className="text-xs text-muted-foreground mb-1">Banco</p>
              <BankBadge bankName={method.bank_name} size="sm" />
            </div>
          )}

          {method.instructions && (
            <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-1.5">
                <Info className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <p className="text-xs">{method.instructions}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // PayPal
    if (subtype === 'paypal') {
      return (
        <div className="space-y-2">
          {m.paypal_email && (
            <div className="flex justify-between items-center p-2 bg-muted rounded-lg text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Email de PayPal</p>
                <p className="text-xs font-medium">{m.paypal_email}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(m.paypal_email!, `email-${method.id}`)}>
                {copiedField === `email-${method.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          )}

          {m.paypal_link && (
            <Button className="w-full text-xs h-8" variant="outline" size="sm">
              <ExternalLink className="h-3 w-3 mr-1" />
              Ir a PayPal
            </Button>
          )}

          {method.instructions && (
            <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-1.5">
                <Info className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <p className="text-xs">{method.instructions}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Mercado Pago
    if (subtype === 'mercado_pago') {
      return (
        <div className="space-y-2">
          {m.payment_link && (
            <Button className="w-full text-xs h-8" variant="outline" size="sm">
              <ExternalLink className="h-3 w-3 mr-1" />
              Ir a Mercado Pago
            </Button>
          )}

          {method.instructions && (
            <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-1.5">
                <Info className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <p className="text-xs">{method.instructions}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Cash in person
    if (subtype === 'cash_in_person') {
      return (
        <div className="space-y-2">
          {m.location && (
            <div className="p-2 bg-muted rounded-lg text-sm">
              <div className="flex items-start gap-1.5">
                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Ubicación</p>
                  <p className="text-xs font-medium">{m.location}</p>
                </div>
              </div>
            </div>
          )}

          {m.schedule && (
            <div className="p-2 bg-muted rounded-lg text-sm">
              <div className="flex items-start gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Horario</p>
                  <p className="text-xs font-medium">{m.schedule}</p>
                </div>
              </div>
            </div>
          )}

          {method.instructions && (
            <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-1.5">
                <Info className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <p className="text-xs">{method.instructions}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Smartphone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Vista Previa del Comprador</CardTitle>
                  <p className="text-xs text-muted-foreground">Así verán los compradores tus métodos de pago</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {enabledMethods.length} método{enabledMethods.length !== 1 && 's'}
                </Badge>
                {isOpen ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Preview Container - Mobile-like frame */}
            <div className="border-2 border-muted rounded-2xl p-3 bg-gradient-to-b from-background to-muted/20 max-w-sm mx-auto">
              {/* Mock header */}
              <div className="text-center mb-3 pb-2 border-b">
                <p className="text-xs text-muted-foreground">Instrucciones de Pago</p>
                <p className="text-sm font-semibold">Selecciona un método</p>
              </div>

              {enabledMethods.length === 1 ? (
                // Single method - show directly
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    {getMethodIcon(enabledMethods[0])}
                    <span className="font-medium text-sm">{getMethodLabel(enabledMethods[0])}</span>
                  </div>
                  {renderPaymentDetails(enabledMethods[0])}
                </div>
              ) : (
                // Multiple methods - show as tabs
                <Tabs defaultValue={enabledMethods[0]?.id} className="w-full">
                  <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1">
                    {enabledMethods.map(method => (
                      <TabsTrigger 
                        key={method.id} 
                        value={method.id}
                        className="flex items-center gap-1.5 text-xs py-1.5 px-2 data-[state=active]:bg-background"
                      >
                        {getMethodIcon(method)}
                        <span className="hidden sm:inline">{getMethodLabel(method)}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {enabledMethods.map(method => (
                    <TabsContent key={method.id} value={method.id} className="mt-3">
                      {renderPaymentDetails(method)}
                    </TabsContent>
                  ))}
                </Tabs>
              )}

              {/* Mock upload button */}
              <div className="mt-4 pt-3 border-t">
                <Button className="w-full text-xs h-9" variant="outline" disabled>
                  Subir Comprobante de Pago
                </Button>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-3">
              Esta es una vista previa. Los compradores verán esto en la página de pago.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
