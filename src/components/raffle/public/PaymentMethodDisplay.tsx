import { Button } from "@/components/ui/button";
import { BankBadge } from "@/components/ui/BankBadge";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/hooks/usePaymentMethods";
import { 
  Landmark,
  Wallet,
  CreditCard,
  Store,
  Pill,
  ShoppingBag,
  HandCoins,
  ArrowRightLeft,
  MapPin,
  Clock,
  ExternalLink,
  Info,
  Copy,
  Check,
  Smartphone,
  QrCode,
  Globe,
  DollarSign
} from "lucide-react";

// Payment subtype configurations - expanded for all digital methods
const SUBTYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  // Bank
  bank_deposit: { label: 'Depósito en ventanilla', icon: Landmark, color: 'text-blue-400' },
  bank_transfer: { label: 'Transferencia SPEI', icon: ArrowRightLeft, color: 'text-blue-400' },
  
  // Store (Mexico)
  oxxo: { label: 'OXXO Pay', icon: Store, color: 'text-red-400' },
  pharmacy: { label: 'Farmacias', icon: Pill, color: 'text-green-400' },
  convenience_store: { label: '7-Eleven / Tiendas', icon: ShoppingBag, color: 'text-orange-400' },
  
  // Digital - International
  paypal: { label: 'PayPal', icon: CreditCard, color: 'text-blue-400' },
  mercado_pago: { label: 'Mercado Pago', icon: Wallet, color: 'text-sky-400' },
  
  // Digital - USA
  zelle: { label: 'Zelle', icon: Smartphone, color: 'text-purple-500' },
  venmo: { label: 'Venmo', icon: Smartphone, color: 'text-blue-500' },
  cash_app: { label: 'Cash App', icon: DollarSign, color: 'text-green-500' },
  
  // Digital - Colombia
  nequi: { label: 'Nequi', icon: Smartphone, color: 'text-pink-500' },
  daviplata: { label: 'Daviplata', icon: Smartphone, color: 'text-red-500' },
  
  // Digital - Peru
  yape: { label: 'Yape', icon: QrCode, color: 'text-purple-500' },
  plin: { label: 'Plin', icon: QrCode, color: 'text-cyan-500' },
  
  // Digital - Brazil
  pix: { label: 'PIX', icon: QrCode, color: 'text-teal-500' },
  picpay: { label: 'PicPay', icon: Smartphone, color: 'text-green-500' },
  
  // International remittances
  western_union: { label: 'Western Union', icon: Globe, color: 'text-yellow-500' },
  wise: { label: 'Wise', icon: Globe, color: 'text-green-500' },
  revolut: { label: 'Revolut', icon: Smartphone, color: 'text-purple-400' },
  
  // Cash
  cash_in_person: { label: 'Efectivo en persona', icon: HandCoins, color: 'text-emerald-400' },
  
  // Custom
  custom: { label: 'Método Personalizado', icon: CreditCard, color: 'text-gray-400' },
};

interface PaymentMethodDisplayProps {
  method: PaymentMethod;
  totalAmount: number;
  currencyCode: string;
  referenceCode?: string;
  ticketNumbers?: string[];
  onCopy: (text: string, field: string) => void;
  copied: string | null;
  variant?: 'light' | 'dark';
}

export function PaymentMethodDisplay({
  method,
  totalAmount,
  currencyCode,
  referenceCode,
  ticketNumbers = [],
  onCopy,
  copied,
  variant = 'dark'
}: PaymentMethodDisplayProps) {
  const m = method as any;
  const subtype = m.subtype as string | null;

  // Styling based on variant
  const styles = variant === 'dark' ? {
    bg: 'bg-white/[0.03]',
    border: 'border-white/[0.06]',
    text: 'text-white',
    textMuted: 'text-white/60',
    hoverBg: 'hover:bg-white/10',
    infoBg: 'bg-emerald-500/10',
    infoBorder: 'border-emerald-500/20',
    infoText: 'text-white/80',
  } : {
    bg: 'bg-muted/30',
    border: 'border-border',
    text: 'text-foreground',
    textMuted: 'text-muted-foreground',
    hoverBg: 'hover:bg-muted',
    infoBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    infoBorder: 'border-emerald-200 dark:border-emerald-800',
    infoText: 'text-muted-foreground',
  };

  const renderCopyField = (label: string, value: string, fieldKey: string, isMono = true) => (
    <div className={cn("flex justify-between items-center p-3 rounded-lg", styles.bg, "border", styles.border)}>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", styles.textMuted)}>{label}</p>
        <p className={cn(isMono ? "font-mono" : "", "font-medium truncate", styles.text)}>{value}</p>
      </div>
      <Button 
        size="icon" 
        variant="ghost" 
        className={cn(styles.textMuted, styles.hoverBg, "shrink-0 ml-2")}
        onClick={() => onCopy(value, fieldKey)}
      >
        {copied === fieldKey ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );

  const renderInstructions = () => {
    if (!method.instructions) return null;
    return (
      <div className={cn("mt-4 p-3 rounded-lg border", styles.infoBg, styles.infoBorder)}>
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className={cn("text-sm", styles.infoText)}>{method.instructions}</p>
        </div>
      </div>
    );
  };

  const renderQRCode = () => {
    if (!m.custom_qr_url) return null;
    return (
      <div className="flex flex-col items-center p-4 bg-white rounded-lg space-y-2">
        <img 
          src={m.custom_qr_url} 
          alt="Escanea el código QR" 
          className="max-w-[180px] w-full h-auto"
        />
        <p className="text-xs text-gray-500">Escanea el código QR</p>
      </div>
    );
  };

  const refValue = referenceCode || ticketNumbers.join('-') || '';

  // Bank transfer or deposit
  if (subtype === 'bank_transfer' || subtype === 'bank_deposit' || method.type === 'bank_transfer') {
    return (
      <div className="space-y-3">
        {method.bank_name && (
          <div className="mb-4">
            <BankBadge bankName={method.bank_name} size="lg" />
          </div>
        )}
        
        {renderCopyField('Monto a depositar', formatCurrency(totalAmount, currencyCode), `amount-${method.id}`)}
        {method.clabe && renderCopyField('CLABE Interbancaria', method.clabe, `clabe-${method.id}`)}
        {method.account_number && renderCopyField('Número de Cuenta', method.account_number, `account-${method.id}`)}
        {m.card_number && renderCopyField('Tarjeta de Débito', m.card_number.replace(/(.{4})/g, '$1 ').trim(), `card-${method.id}`)}
        {method.account_holder && renderCopyField('Titular de la Cuenta', method.account_holder, `holder-${method.id}`, false)}
        {refValue && renderCopyField('Concepto / Referencia', refValue, `ref-${method.id}`)}
        {renderInstructions()}
      </div>
    );
  }

  // Store payments (OXXO, pharmacy, convenience store)
  if (subtype === 'oxxo' || subtype === 'pharmacy' || subtype === 'convenience_store') {
    const config = SUBTYPE_CONFIG[subtype];
    const Icon = config?.icon || Store;
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Icon className={cn("h-5 w-5", config?.color)} />
          <span className={cn("font-semibold text-lg", styles.text)}>{config?.label || 'Tienda'}</span>
        </div>

        {renderCopyField('Monto a depositar', formatCurrency(totalAmount, currencyCode), `amount-${method.id}`)}
        {m.card_number && renderCopyField('Número de Tarjeta', m.card_number.replace(/(.{4})/g, '$1 ').trim(), `card-${method.id}`)}
        {method.account_holder && renderCopyField('A nombre de', method.account_holder, `holder-${method.id}`, false)}
        {method.bank_name && (
          <div className={cn("p-3 rounded-lg border", styles.bg, styles.border)}>
            <p className={cn("text-sm mb-1", styles.textMuted)}>Banco</p>
            <BankBadge bankName={method.bank_name} size="sm" />
          </div>
        )}
        {refValue && renderCopyField('Referencia', refValue, `ref-${method.id}`)}
        {renderInstructions()}
      </div>
    );
  }

  // Digital payment apps: Zelle, Venmo, Cash App, Nequi, Daviplata, Wise, Revolut, PicPay
  if (subtype && ['zelle', 'venmo', 'cash_app', 'nequi', 'daviplata', 'wise', 'revolut', 'picpay'].includes(subtype)) {
    const config = SUBTYPE_CONFIG[subtype];
    const Icon = config?.icon || Smartphone;
    
    // Use custom_label or the default label
    const displayLabel = m.custom_label || config?.label || 'Método Digital';
    const identifierLabel = m.custom_identifier_label || 'Email / Teléfono';
    const identifier = m.custom_identifier || m.paypal_email || '';
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Icon className={cn("h-5 w-5", config?.color)} />
          <span className={cn("font-semibold text-lg", styles.text)}>{displayLabel}</span>
        </div>

        {renderCopyField('Monto a pagar', formatCurrency(totalAmount, currencyCode), `amount-${method.id}`)}
        
        {identifier && renderCopyField(identifierLabel, identifier, `identifier-${method.id}`, false)}
        
        {renderQRCode()}
        
        {m.payment_link && (
          <Button 
            className={cn("w-full", variant === 'dark' 
              ? "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-white" 
              : ""
            )}
            variant={variant === 'dark' ? 'outline' : 'default'}
            onClick={() => window.open(m.payment_link, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir {displayLabel}
          </Button>
        )}

        {refValue && renderCopyField('Referencia', refValue, `ref-${method.id}`)}
        {renderInstructions()}
      </div>
    );
  }

  // QR-based wallets: Yape, Plin, PIX
  if (subtype && ['yape', 'plin', 'pix'].includes(subtype)) {
    const config = SUBTYPE_CONFIG[subtype];
    const Icon = config?.icon || QrCode;
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Icon className={cn("h-5 w-5", config?.color)} />
          <span className={cn("font-semibold text-lg", styles.text)}>{config?.label}</span>
        </div>

        {renderCopyField('Monto a pagar', formatCurrency(totalAmount, currencyCode), `amount-${method.id}`)}
        
        {/* QR prominently displayed */}
        {renderQRCode()}
        
        {/* Alternative identifier (phone number, key, etc.) */}
        {m.custom_identifier && renderCopyField(
          m.custom_identifier_label || (subtype === 'pix' ? 'Clave PIX' : 'Número de Teléfono'),
          m.custom_identifier,
          `identifier-${method.id}`
        )}

        {refValue && renderCopyField('Referencia', refValue, `ref-${method.id}`)}
        {renderInstructions()}
      </div>
    );
  }

  // Western Union / Remittances
  if (subtype === 'western_union') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-yellow-500" />
          <span className={cn("font-semibold text-lg", styles.text)}>Western Union</span>
        </div>

        {renderCopyField('Monto a enviar', formatCurrency(totalAmount, currencyCode), `amount-${method.id}`)}
        {method.account_holder && renderCopyField('Nombre del Beneficiario', method.account_holder, `holder-${method.id}`, false)}
        
        {m.location && (
          <div className={cn("p-3 rounded-lg border", styles.bg, styles.border)}>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className={cn("text-sm", styles.textMuted)}>Ciudad / País de destino</p>
                <p className={cn("font-medium", styles.text)}>{m.location}</p>
              </div>
            </div>
          </div>
        )}

        {m.custom_identifier && renderCopyField(
          m.custom_identifier_label || 'ID de referencia',
          m.custom_identifier,
          `identifier-${method.id}`
        )}

        {refValue && renderCopyField('Referencia del pago', refValue, `ref-${method.id}`)}
        {renderInstructions()}
      </div>
    );
  }

  // PayPal
  if (subtype === 'paypal') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-blue-400" />
          <span className={cn("font-semibold text-lg", styles.text)}>PayPal</span>
        </div>

        {renderCopyField('Monto a pagar', formatCurrency(totalAmount, currencyCode), `amount-${method.id}`)}
        {m.paypal_email && renderCopyField('Email de PayPal', m.paypal_email, `email-${method.id}`, false)}

        {m.paypal_link && (
          <Button 
            className={cn("w-full", variant === 'dark' 
              ? "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-white" 
              : "bg-blue-500 hover:bg-blue-600 text-white"
            )}
            variant={variant === 'dark' ? 'outline' : 'default'}
            onClick={() => window.open(m.paypal_link, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir PayPal.me
          </Button>
        )}

        {refValue && renderCopyField('Nota del pago', refValue, `ref-${method.id}`)}
        {renderInstructions()}
      </div>
    );
  }

  // Mercado Pago
  if (subtype === 'mercado_pago') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-sky-400" />
          <span className={cn("font-semibold text-lg", styles.text)}>Mercado Pago</span>
        </div>

        {renderCopyField('Monto a pagar', formatCurrency(totalAmount, currencyCode), `amount-${method.id}`)}

        {m.payment_link && (
          <Button 
            className="w-full bg-sky-500 hover:bg-sky-600 text-white"
            onClick={() => window.open(m.payment_link, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ir a Mercado Pago
          </Button>
        )}

        {refValue && renderCopyField('Referencia', refValue, `ref-${method.id}`)}
        {renderInstructions()}
      </div>
    );
  }

  // Cash in person
  if (subtype === 'cash_in_person' || method.type === 'cash') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <HandCoins className="h-5 w-5 text-emerald-400" />
          <span className={cn("font-semibold text-lg", styles.text)}>Efectivo en Persona</span>
        </div>

        <div className={cn("p-3 rounded-lg border", styles.bg, styles.border)}>
          <p className={cn("text-sm", styles.textMuted)}>Monto a pagar</p>
          <p className={cn("font-mono font-bold text-lg", styles.text)}>{formatCurrency(totalAmount, currencyCode)}</p>
        </div>

        {m.location && (
          <div className={cn("p-3 rounded-lg border", styles.bg, styles.border)}>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className={cn("text-sm", styles.textMuted)}>Ubicación</p>
                <p className={cn("font-medium", styles.text)}>{m.location}</p>
              </div>
            </div>
          </div>
        )}

        {m.schedule && (
          <div className={cn("p-3 rounded-lg border", styles.bg, styles.border)}>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className={cn("text-sm", styles.textMuted)}>Horario</p>
                <p className={cn("font-medium", styles.text)}>{m.schedule}</p>
              </div>
            </div>
          </div>
        )}

        {renderInstructions()}
      </div>
    );
  }

  // Custom method - flexible display
  if (subtype === 'custom') {
    const displayLabel = m.custom_label || method.name || 'Método de Pago';
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-gray-400" />
          <span className={cn("font-semibold text-lg", styles.text)}>{displayLabel}</span>
        </div>

        {renderCopyField('Monto a pagar', formatCurrency(totalAmount, currencyCode), `amount-${method.id}`)}
        
        {m.custom_identifier && renderCopyField(
          m.custom_identifier_label || 'Identificador',
          m.custom_identifier,
          `identifier-${method.id}`
        )}
        
        {renderQRCode()}
        
        {m.payment_link && (
          <Button 
            className={cn("w-full", variant === 'dark' 
              ? "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-white" 
              : ""
            )}
            variant={variant === 'dark' ? 'outline' : 'default'}
            onClick={() => window.open(m.payment_link, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir enlace de pago
          </Button>
        )}
        
        {method.account_holder && renderCopyField('A nombre de', method.account_holder, `holder-${method.id}`, false)}
        {refValue && renderCopyField('Referencia', refValue, `ref-${method.id}`)}
        {renderInstructions()}
      </div>
    );
  }

  // Fallback for other payment methods - also check for digital type
  // Handle digital methods stored as type 'other' with digital subtype patterns
  if (method.type === 'other' && m.custom_identifier) {
    const displayLabel = m.custom_label || method.name || 'Método Digital';
    const identifier = m.custom_identifier || m.paypal_email || '';
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="h-5 w-5 text-blue-400" />
          <span className={cn("font-semibold text-lg", styles.text)}>{displayLabel}</span>
        </div>

        {renderCopyField('Monto a pagar', formatCurrency(totalAmount, currencyCode), `amount-${method.id}`)}
        
        {identifier && renderCopyField(
          m.custom_identifier_label || 'Email / Teléfono',
          identifier,
          `identifier-${method.id}`,
          false
        )}
        
        {renderQRCode()}
        
        {m.payment_link && (
          <Button 
            className={cn("w-full", variant === 'dark' 
              ? "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-white" 
              : ""
            )}
            variant={variant === 'dark' ? 'outline' : 'default'}
            onClick={() => window.open(m.payment_link, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir {displayLabel}
          </Button>
        )}

        {refValue && renderCopyField('Referencia', refValue, `ref-${method.id}`)}
        {renderInstructions()}
      </div>
    );
  }

  // Generic fallback
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5 text-muted-foreground" />
        <span className={cn("font-semibold text-lg", styles.text)}>{m.custom_label || method.name}</span>
      </div>
      {renderCopyField('Monto a pagar', formatCurrency(totalAmount, currencyCode), `amount-${method.id}`)}
      
      {m.custom_identifier && renderCopyField(
        m.custom_identifier_label || 'Identificador',
        m.custom_identifier,
        `identifier-${method.id}`
      )}
      
      {renderQRCode()}
      
      {m.payment_link && (
        <Button 
          className={cn("w-full", variant === 'dark' 
            ? "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-white" 
            : ""
          )}
          variant={variant === 'dark' ? 'outline' : 'default'}
          onClick={() => window.open(m.payment_link, '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir enlace
        </Button>
      )}
      
      {renderInstructions()}
    </div>
  );
}

// Helper to get method icon for tabs/pills
export function getPaymentMethodIcon(method: PaymentMethod) {
  const m = method as any;
  const subtype = m.subtype as string | null;
  
  if (subtype && SUBTYPE_CONFIG[subtype]) {
    const Icon = SUBTYPE_CONFIG[subtype].icon;
    return <Icon className={cn("h-4 w-4", SUBTYPE_CONFIG[subtype].color)} />;
  }
  
  switch (method.type) {
    case "bank_transfer":
      return <Landmark className="h-4 w-4 text-blue-400" />;
    case "other":
      return <Smartphone className="h-4 w-4 text-purple-400" />;
    case "cash":
      return <HandCoins className="h-4 w-4 text-emerald-400" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
}

// Helper to get method label
export function getPaymentMethodLabel(method: PaymentMethod) {
  const m = method as any;
  const subtype = m.subtype as string | null;
  
  if (subtype && SUBTYPE_CONFIG[subtype]) {
    return m.custom_label || SUBTYPE_CONFIG[subtype].label;
  }
  
  return m.custom_label || method.name;
}
