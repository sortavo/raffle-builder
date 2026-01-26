import { 
  Landmark, 
  ArrowRightLeft,
  Store, 
  Pill,
  ShoppingBag,
  Smartphone, 
  HandCoins,
  Wallet,
  Globe,
  Building2,
  CreditCard,
  Banknote,
  QrCode,
  LucideIcon
} from "lucide-react";

export interface PaymentMethodConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

export interface CountryPaymentConfig {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  accountFormat: {
    name: string;
    label: string;
    length: number | null;
    placeholder: string;
    validation?: 'clabe' | 'cbu' | 'cci' | 'pix' | 'iban' | 'routing' | null;
  };
  methods: {
    bank: PaymentMethodConfig[];
    store: PaymentMethodConfig[];
    digital: PaymentMethodConfig[];
    cash: PaymentMethodConfig[];
  };
}

export const COUNTRY_PAYMENT_CONFIGS: Record<string, CountryPaymentConfig> = {
  MX: {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    currency: 'MXN',
    currencySymbol: '$',
    accountFormat: {
      name: 'CLABE',
      label: 'CLABE interbancaria',
      length: 18,
      placeholder: '012180001234567890',
      validation: 'clabe',
    },
    methods: {
      bank: [
        { id: 'bank_transfer', label: 'Transferencia SPEI', icon: ArrowRightLeft, description: 'Transferencia electrónica inmediata' },
        { id: 'bank_deposit', label: 'Depósito en ventanilla', icon: Landmark, description: 'Depósito directo en sucursal bancaria' },
      ],
      store: [
        { id: 'oxxo', label: 'OXXO Pay', icon: Store, description: 'Pago en tiendas OXXO' },
        { id: 'pharmacy', label: 'Farmacias', icon: Pill, description: 'Guadalajara, del Ahorro, Benavides' },
        { id: 'convenience_store', label: '7-Eleven / Otras', icon: ShoppingBag, description: 'Tiendas de conveniencia' },
      ],
      digital: [
        { id: 'paypal', label: 'PayPal', icon: CreditCard, description: 'Pago con cuenta PayPal' },
        { id: 'mercado_pago', label: 'Mercado Pago', icon: Wallet, description: 'Billetera digital' },
      ],
      cash: [
        { id: 'cash_in_person', label: 'Efectivo en persona', icon: HandCoins, description: 'Entrega directa de efectivo' },
      ],
    },
  },
  US: {
    code: 'US',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    accountFormat: {
      name: 'Account',
      label: 'Account Number',
      length: null,
      placeholder: '1234567890',
      validation: 'routing',
    },
    methods: {
      bank: [
        { id: 'bank_transfer', label: 'Wire Transfer', icon: ArrowRightLeft, description: 'Bank wire transfer' },
        { id: 'bank_deposit', label: 'Bank Deposit', icon: Landmark, description: 'Direct deposit at branch' },
      ],
      store: [],
      digital: [
        { id: 'zelle', label: 'Zelle', icon: Smartphone, description: 'Send with email or phone' },
        { id: 'venmo', label: 'Venmo', icon: Smartphone, description: 'Pay with @username' },
        { id: 'cash_app', label: 'Cash App', icon: Smartphone, description: 'Pay with $cashtag' },
        { id: 'paypal', label: 'PayPal', icon: CreditCard, description: 'Pay with PayPal account' },
      ],
      cash: [
        { id: 'cash_in_person', label: 'Cash in Person', icon: HandCoins, description: 'Direct cash payment' },
        { id: 'western_union', label: 'Western Union', icon: Globe, description: 'Money transfer service' },
      ],
    },
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    currency: 'ARS',
    currencySymbol: '$',
    accountFormat: {
      name: 'CBU/CVU',
      label: 'CBU o CVU',
      length: 22,
      placeholder: '0000000000000000000000',
      validation: 'cbu',
    },
    methods: {
      bank: [
        { id: 'bank_transfer', label: 'Transferencia bancaria', icon: ArrowRightLeft, description: 'Transferencia por CBU/CVU' },
        { id: 'bank_deposit', label: 'Depósito en sucursal', icon: Landmark, description: 'Depósito directo en banco' },
      ],
      store: [
        { id: 'rapipago', label: 'Rapipago', icon: Store, description: 'Pago en puntos Rapipago' },
        { id: 'pagofacil', label: 'Pago Fácil', icon: Store, description: 'Pago en puntos Pago Fácil' },
      ],
      digital: [
        { id: 'mercado_pago', label: 'Mercado Pago', icon: Wallet, description: 'Billetera más usada en Argentina' },
        { id: 'paypal', label: 'PayPal', icon: CreditCard, description: 'Pago con cuenta PayPal' },
      ],
      cash: [
        { id: 'cash_in_person', label: 'Efectivo en persona', icon: HandCoins, description: 'Entrega directa de efectivo' },
        { id: 'western_union', label: 'Western Union', icon: Globe, description: 'Remesas internacionales' },
      ],
    },
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    currency: 'COP',
    currencySymbol: '$',
    accountFormat: {
      name: 'Cuenta',
      label: 'Número de cuenta',
      length: null,
      placeholder: '1234567890',
      validation: null,
    },
    methods: {
      bank: [
        { id: 'bank_transfer', label: 'Transferencia PSE', icon: ArrowRightLeft, description: 'Transferencia electrónica' },
        { id: 'bank_deposit', label: 'Consignación bancaria', icon: Landmark, description: 'Depósito en sucursal' },
      ],
      store: [
        { id: 'efecty', label: 'Efecty', icon: Store, description: 'Pago en puntos Efecty' },
        { id: 'baloto', label: 'Baloto', icon: Store, description: 'Pago en puntos Baloto' },
      ],
      digital: [
        { id: 'nequi', label: 'Nequi', icon: Smartphone, description: 'Billetera Bancolombia' },
        { id: 'daviplata', label: 'Daviplata', icon: Smartphone, description: 'Billetera Davivienda' },
        { id: 'paypal', label: 'PayPal', icon: CreditCard, description: 'Pago con cuenta PayPal' },
      ],
      cash: [
        { id: 'cash_in_person', label: 'Efectivo en persona', icon: HandCoins, description: 'Entrega directa de efectivo' },
      ],
    },
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    currency: 'CLP',
    currencySymbol: '$',
    accountFormat: {
      name: 'Cuenta',
      label: 'Número de cuenta',
      length: null,
      placeholder: '1234567890',
      validation: null,
    },
    methods: {
      bank: [
        { id: 'bank_transfer', label: 'Transferencia TEF', icon: ArrowRightLeft, description: 'Transferencia electrónica' },
        { id: 'bank_deposit', label: 'Depósito bancario', icon: Landmark, description: 'Depósito en sucursal' },
      ],
      store: [
        { id: 'sencillito', label: 'Sencillito', icon: Store, description: 'Pago en puntos Sencillito' },
      ],
      digital: [
        { id: 'mach', label: 'MACH', icon: Smartphone, description: 'Billetera BCI' },
        { id: 'mercado_pago', label: 'Mercado Pago', icon: Wallet, description: 'Billetera digital' },
        { id: 'paypal', label: 'PayPal', icon: CreditCard, description: 'Pago con cuenta PayPal' },
      ],
      cash: [
        { id: 'cash_in_person', label: 'Efectivo en persona', icon: HandCoins, description: 'Entrega directa de efectivo' },
      ],
    },
  },
  PE: {
    code: 'PE',
    name: 'Perú',
    flag: '🇵🇪',
    currency: 'PEN',
    currencySymbol: 'S/',
    accountFormat: {
      name: 'CCI',
      label: 'Código de Cuenta Interbancario',
      length: 20,
      placeholder: '00219100012345678901',
      validation: 'cci',
    },
    methods: {
      bank: [
        { id: 'bank_transfer', label: 'Transferencia interbancaria', icon: ArrowRightLeft, description: 'Transferencia por CCI' },
        { id: 'bank_deposit', label: 'Depósito bancario', icon: Landmark, description: 'Depósito en agencia' },
      ],
      store: [
        { id: 'tambo', label: 'Tambo+', icon: Store, description: 'Pago en tiendas Tambo' },
      ],
      digital: [
        { id: 'yape', label: 'Yape', icon: QrCode, description: 'Billetera BCP' },
        { id: 'plin', label: 'Plin', icon: QrCode, description: 'Billetera Interbank, BBVA, Scotiabank' },
        { id: 'paypal', label: 'PayPal', icon: CreditCard, description: 'Pago con cuenta PayPal' },
      ],
      cash: [
        { id: 'cash_in_person', label: 'Efectivo en persona', icon: HandCoins, description: 'Entrega directa de efectivo' },
      ],
    },
  },
  BR: {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    currency: 'BRL',
    currencySymbol: 'R$',
    accountFormat: {
      name: 'PIX',
      label: 'Chave PIX',
      length: null,
      placeholder: 'CPF, email, teléfono o clave aleatoria',
      validation: 'pix',
    },
    methods: {
      bank: [
        { id: 'pix', label: 'PIX', icon: QrCode, description: 'Transferencia instantánea' },
        { id: 'bank_transfer', label: 'TED/DOC', icon: ArrowRightLeft, description: 'Transferencia bancaria' },
        { id: 'bank_deposit', label: 'Depósito bancário', icon: Landmark, description: 'Depósito na agência' },
      ],
      store: [
        { id: 'boleto', label: 'Boleto Bancário', icon: Banknote, description: 'Pago con boleto' },
      ],
      digital: [
        { id: 'picpay', label: 'PicPay', icon: Smartphone, description: 'Billetera digital' },
        { id: 'mercado_pago', label: 'Mercado Pago', icon: Wallet, description: 'Billetera digital' },
        { id: 'paypal', label: 'PayPal', icon: CreditCard, description: 'Pago con cuenta PayPal' },
      ],
      cash: [
        { id: 'cash_in_person', label: 'Dinheiro em mãos', icon: HandCoins, description: 'Entrega direta de dinheiro' },
      ],
    },
  },
  EU: {
    code: 'EU',
    name: 'Europa',
    flag: '🇪🇺',
    currency: 'EUR',
    currencySymbol: '€',
    accountFormat: {
      name: 'IBAN',
      label: 'IBAN',
      length: null,
      placeholder: 'ES12 1234 5678 9012 3456 7890',
      validation: 'iban',
    },
    methods: {
      bank: [
        { id: 'bank_transfer', label: 'Transferencia SEPA', icon: ArrowRightLeft, description: 'Transferencia zona Euro' },
      ],
      store: [],
      digital: [
        { id: 'paypal', label: 'PayPal', icon: CreditCard, description: 'Pay with PayPal account' },
        { id: 'revolut', label: 'Revolut', icon: Smartphone, description: 'Fintech bank transfer' },
        { id: 'wise', label: 'Wise', icon: Globe, description: 'International transfers' },
      ],
      cash: [
        { id: 'cash_in_person', label: 'Efectivo en persona', icon: HandCoins, description: 'Entrega directa' },
      ],
    },
  },
};

// Helper functions
export function getCountryConfig(countryCode: string): CountryPaymentConfig | undefined {
  return COUNTRY_PAYMENT_CONFIGS[countryCode];
}

export function getAllCountries(): CountryPaymentConfig[] {
  return Object.values(COUNTRY_PAYMENT_CONFIGS);
}

export function getMethodsForCountry(countryCode: string): PaymentMethodConfig[] {
  const config = COUNTRY_PAYMENT_CONFIGS[countryCode];
  if (!config) return [];
  
  return [
    ...config.methods.bank,
    ...config.methods.store,
    ...config.methods.digital,
    ...config.methods.cash,
  ];
}

export function getCategoryMethodsForCountry(
  countryCode: string, 
  category: 'bank' | 'store' | 'digital' | 'cash'
): PaymentMethodConfig[] {
  const config = COUNTRY_PAYMENT_CONFIGS[countryCode];
  if (!config) return [];
  return config.methods[category];
}

export function getMethodById(countryCode: string, methodId: string): PaymentMethodConfig | undefined {
  const methods = getMethodsForCountry(countryCode);
  return methods.find(m => m.id === methodId);
}

export function getCategoryForMethodInCountry(countryCode: string, methodId: string): string | undefined {
  const config = COUNTRY_PAYMENT_CONFIGS[countryCode];
  if (!config) return undefined;
  
  for (const [category, methods] of Object.entries(config.methods)) {
    if (methods.some(m => m.id === methodId)) {
      return category;
    }
  }
  return undefined;
}

// Category labels
export const CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  bank: { label: 'Transferencias', description: 'Transferencias y depósitos bancarios' },
  store: { label: 'Pago en Tiendas', description: 'Pago en efectivo en tiendas' },
  digital: { label: 'Pago Digital', description: 'Billeteras digitales y apps' },
  cash: { label: 'Efectivo', description: 'Pago en persona o remesas' },
};
