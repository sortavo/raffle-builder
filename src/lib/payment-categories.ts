import { 
  Landmark, 
  Store, 
  Smartphone, 
  HandCoins, 
  MoreHorizontal,
  LucideIcon
} from "lucide-react";

export interface PaymentCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  subtypes: string[];
  description: string;
}

export const PAYMENT_CATEGORIES: Record<string, PaymentCategory> = {
  bank: {
    id: 'bank',
    label: 'Transferencia Bancaria',
    icon: Landmark,
    subtypes: ['bank_transfer', 'bank_deposit'],
    description: 'Deposita o transfiere a nuestra cuenta',
  },
  store: {
    id: 'store', 
    label: 'Pago en Tienda',
    icon: Store,
    subtypes: ['oxxo', 'pharmacy', 'convenience_store'],
    description: 'Paga en efectivo en tiendas',
  },
  digital: {
    id: 'digital',
    label: 'Pago Digital',
    icon: Smartphone,
    subtypes: ['paypal', 'mercado_pago', 'zelle', 'venmo', 'cash_app'],
    description: 'PayPal, Zelle, Venmo, etc.',
  },
  cash: {
    id: 'cash',
    label: 'Efectivo',
    icon: HandCoins,
    subtypes: ['cash_in_person', 'western_union'],
    description: 'Entrega directa o remesas',
  },
  other: {
    id: 'other',
    label: 'Otros',
    icon: MoreHorizontal,
    subtypes: ['custom'],
    description: 'Métodos personalizados',
  }
};

export interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  bank_name?: string | null;
  [key: string]: unknown;
}

export function getCategoryForMethod(method: PaymentMethod): PaymentCategory {
  const subtype = method.subtype || method.type;
  
  for (const category of Object.values(PAYMENT_CATEGORIES)) {
    if (category.subtypes.includes(subtype)) {
      return category;
    }
  }
  
  return PAYMENT_CATEGORIES.other;
}

export function getCategoryById(categoryId: string): PaymentCategory | undefined {
  return PAYMENT_CATEGORIES[categoryId];
}

export interface GroupedMethods {
  category: PaymentCategory;
  methods: PaymentMethod[];
  // For bank category, group by bank_name
  bankGroups?: Record<string, PaymentMethod[]>;
}

export function groupMethodsByCategory(methods: PaymentMethod[]): Record<string, GroupedMethods> {
  const grouped: Record<string, GroupedMethods> = {};

  for (const method of methods) {
    const category = getCategoryForMethod(method);
    
    if (!grouped[category.id]) {
      grouped[category.id] = { 
        category, 
        methods: [],
        bankGroups: category.id === 'bank' ? {} : undefined
      };
    }
    
    grouped[category.id].methods.push(method);
    
    // For bank methods, also group by bank_name
    if (category.id === 'bank' && method.bank_name) {
      if (!grouped[category.id].bankGroups![method.bank_name]) {
        grouped[category.id].bankGroups![method.bank_name] = [];
      }
      grouped[category.id].bankGroups![method.bank_name].push(method);
    }
  }

  return grouped;
}

export function getAvailableCategories(methods: PaymentMethod[]): PaymentCategory[] {
  const grouped = groupMethodsByCategory(methods);
  
  // Return categories in a specific order
  const orderedIds = ['bank', 'digital', 'store', 'cash', 'other'];
  
  return orderedIds
    .filter(id => grouped[id]?.methods.length > 0)
    .map(id => grouped[id].category);
}

// Currency options for payment methods
export const CURRENCY_OPTIONS = [
  { value: 'MXN', label: 'MXN - Peso Mexicano', flag: '🇲🇽' },
  { value: 'USD', label: 'USD - Dólar Americano', flag: '🇺🇸' },
  { value: 'COP', label: 'COP - Peso Colombiano', flag: '🇨🇴' },
  { value: 'ARS', label: 'ARS - Peso Argentino', flag: '🇦🇷' },
  { value: 'CLP', label: 'CLP - Peso Chileno', flag: '🇨🇱' },
  { value: 'PEN', label: 'PEN - Sol Peruano', flag: '🇵🇪' },
  { value: 'BRL', label: 'BRL - Real Brasileño', flag: '🇧🇷' },
  { value: 'EUR', label: 'EUR - Euro', flag: '🇪🇺' },
];

// Identifier type options for custom methods
export const IDENTIFIER_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'username', label: '@Usuario' },
  { value: 'account', label: 'Número de cuenta' },
  { value: 'other', label: 'Otro' },
];
