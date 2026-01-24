import { describe, it, expect } from 'vitest';

// Test the pure business logic for payment methods

type PaymentMethodType = 'bank_transfer' | 'cash' | 'other';

interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  subtype: string | null;
  enabled: boolean;
  display_order: number;
  name: string;
  bank_name: string | null;
  account_number: string | null;
  clabe: string | null;
  card_number: string | null;
  paypal_email: string | null;
  payment_link: string | null;
}

describe('usePaymentMethods - method type validation', () => {
  const VALID_TYPES: PaymentMethodType[] = ['bank_transfer', 'cash', 'other'];

  const isValidType = (type: string): type is PaymentMethodType => {
    return VALID_TYPES.includes(type as PaymentMethodType);
  };

  it('should accept valid payment types', () => {
    expect(isValidType('bank_transfer')).toBe(true);
    expect(isValidType('cash')).toBe(true);
    expect(isValidType('other')).toBe(true);
  });

  it('should reject invalid payment types', () => {
    expect(isValidType('crypto')).toBe(false);
    expect(isValidType('credit_card')).toBe(false);
    expect(isValidType('')).toBe(false);
  });
});

describe('usePaymentMethods - bank transfer validation', () => {
  const validateBankTransfer = (method: Partial<PaymentMethod>): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!method.bank_name) {
      errors.push('Bank name is required');
    }

    // At least one account identifier required
    const hasIdentifier = method.account_number || method.clabe || method.card_number;
    if (!hasIdentifier) {
      errors.push('At least one account identifier (number, CLABE, or card) is required');
    }

    // CLABE validation for Mexico (18 digits)
    if (method.clabe && !/^\d{18}$/.test(method.clabe)) {
      errors.push('CLABE must be 18 digits');
    }

    // Card number basic validation (16 digits, spaces allowed)
    if (method.card_number) {
      const cleaned = method.card_number.replace(/\s/g, '');
      if (!/^\d{16}$/.test(cleaned)) {
        errors.push('Card number must be 16 digits');
      }
    }

    return { valid: errors.length === 0, errors };
  };

  it('should validate complete bank transfer', () => {
    const result = validateBankTransfer({
      bank_name: 'BBVA',
      clabe: '123456789012345678',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require bank name', () => {
    const result = validateBankTransfer({
      clabe: '123456789012345678',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Bank name is required');
  });

  it('should require at least one identifier', () => {
    const result = validateBankTransfer({
      bank_name: 'BBVA',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one account identifier (number, CLABE, or card) is required');
  });

  it('should validate CLABE format', () => {
    const result = validateBankTransfer({
      bank_name: 'BBVA',
      clabe: '12345', // Too short
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('CLABE must be 18 digits');
  });

  it('should validate card number format', () => {
    const result = validateBankTransfer({
      bank_name: 'BBVA',
      card_number: '1234', // Too short
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Card number must be 16 digits');
  });

  it('should accept card number with spaces', () => {
    const result = validateBankTransfer({
      bank_name: 'BBVA',
      card_number: '1234 5678 9012 3456',
    });
    expect(result.valid).toBe(true);
  });

  it('should accept account number as identifier', () => {
    const result = validateBankTransfer({
      bank_name: 'BBVA',
      account_number: '12345678',
    });
    expect(result.valid).toBe(true);
  });
});

describe('usePaymentMethods - PayPal validation', () => {
  const validatePayPal = (method: Partial<PaymentMethod>): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Email validation
    if (method.paypal_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(method.paypal_email)) {
        errors.push('Invalid PayPal email format');
      }
    }

    // Link validation
    if (method.payment_link) {
      try {
        const url = new URL(method.payment_link);
        if (!url.hostname.includes('paypal')) {
          errors.push('Payment link must be a PayPal URL');
        }
      } catch {
        errors.push('Invalid payment link URL');
      }
    }

    // At least one is required for PayPal
    if (!method.paypal_email && !method.payment_link) {
      errors.push('PayPal email or payment link is required');
    }

    return { valid: errors.length === 0, errors };
  };

  it('should validate PayPal email', () => {
    const result = validatePayPal({
      paypal_email: 'user@example.com',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject invalid email format', () => {
    const result = validatePayPal({
      paypal_email: 'invalid-email',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid PayPal email format');
  });

  it('should validate PayPal link', () => {
    const result = validatePayPal({
      payment_link: 'https://paypal.me/username',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject non-PayPal links', () => {
    const result = validatePayPal({
      payment_link: 'https://venmo.com/username',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Payment link must be a PayPal URL');
  });

  it('should require at least email or link', () => {
    const result = validatePayPal({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('PayPal email or payment link is required');
  });
});

describe('usePaymentMethods - display order logic', () => {
  const sortByDisplayOrder = (methods: PaymentMethod[]): PaymentMethod[] => {
    return [...methods].sort((a, b) => a.display_order - b.display_order);
  };

  const getNextDisplayOrder = (methods: PaymentMethod[]): number => {
    if (methods.length === 0) return 0;
    const maxOrder = Math.max(...methods.map(m => m.display_order));
    return maxOrder + 1;
  };

  const reorderMethods = (
    methods: PaymentMethod[],
    fromIndex: number,
    toIndex: number
  ): PaymentMethod[] => {
    const sorted = sortByDisplayOrder(methods);
    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, moved);
    return sorted.map((m, i) => ({ ...m, display_order: i }));
  };

  const mockMethods: PaymentMethod[] = [
    { id: '1', type: 'bank_transfer', subtype: null, enabled: true, display_order: 0, name: 'BBVA', bank_name: 'BBVA', account_number: '123', clabe: null, card_number: null, paypal_email: null, payment_link: null },
    { id: '2', type: 'bank_transfer', subtype: null, enabled: true, display_order: 1, name: 'Santander', bank_name: 'Santander', account_number: '456', clabe: null, card_number: null, paypal_email: null, payment_link: null },
    { id: '3', type: 'cash', subtype: null, enabled: false, display_order: 2, name: 'Efectivo', bank_name: null, account_number: null, clabe: null, card_number: null, paypal_email: null, payment_link: null },
  ];

  it('should sort methods by display order', () => {
    const unsorted = [mockMethods[2], mockMethods[0], mockMethods[1]];
    const sorted = sortByDisplayOrder(unsorted);
    expect(sorted.map(m => m.id)).toEqual(['1', '2', '3']);
  });

  it('should calculate next display order', () => {
    expect(getNextDisplayOrder(mockMethods)).toBe(3);
    expect(getNextDisplayOrder([])).toBe(0);
  });

  it('should reorder methods correctly', () => {
    const reordered = reorderMethods(mockMethods, 0, 2);
    expect(reordered.map(m => m.id)).toEqual(['2', '3', '1']);
    expect(reordered.map(m => m.display_order)).toEqual([0, 1, 2]);
  });

  it('should handle moving to same position', () => {
    const reordered = reorderMethods(mockMethods, 1, 1);
    expect(reordered.map(m => m.id)).toEqual(['1', '2', '3']);
  });
});

describe('usePaymentMethods - enabled filtering', () => {
  const filterEnabled = (methods: PaymentMethod[]): PaymentMethod[] => {
    return methods.filter(m => m.enabled);
  };

  const hasEnabledMethods = (methods: PaymentMethod[]): boolean => {
    return methods.some(m => m.enabled);
  };

  const mockMethods: PaymentMethod[] = [
    { id: '1', type: 'bank_transfer', subtype: null, enabled: true, display_order: 0, name: 'BBVA', bank_name: 'BBVA', account_number: '123', clabe: null, card_number: null, paypal_email: null, payment_link: null },
    { id: '2', type: 'bank_transfer', subtype: null, enabled: false, display_order: 1, name: 'Santander', bank_name: 'Santander', account_number: '456', clabe: null, card_number: null, paypal_email: null, payment_link: null },
    { id: '3', type: 'cash', subtype: null, enabled: true, display_order: 2, name: 'Efectivo', bank_name: null, account_number: null, clabe: null, card_number: null, paypal_email: null, payment_link: null },
  ];

  it('should filter enabled methods', () => {
    const enabled = filterEnabled(mockMethods);
    expect(enabled).toHaveLength(2);
    expect(enabled.map(m => m.id)).toEqual(['1', '3']);
  });

  it('should detect if has enabled methods', () => {
    expect(hasEnabledMethods(mockMethods)).toBe(true);
  });

  it('should detect no enabled methods', () => {
    const allDisabled = mockMethods.map(m => ({ ...m, enabled: false }));
    expect(hasEnabledMethods(allDisabled)).toBe(false);
  });
});

describe('usePaymentMethods - subtype mapping', () => {
  const SUBTYPE_CONFIG: Record<string, { label: string; icon: string }> = {
    'bank_deposit': { label: 'Depósito bancario', icon: 'bank' },
    'bank_transfer_spei': { label: 'Transferencia SPEI', icon: 'transfer' },
    'debit_card': { label: 'Tarjeta de débito', icon: 'card' },
    'paypal': { label: 'PayPal', icon: 'paypal' },
    'mercadopago': { label: 'Mercado Pago', icon: 'mercadopago' },
    'oxxo': { label: 'OXXO', icon: 'store' },
    'cash': { label: 'Efectivo', icon: 'cash' },
  };

  const getSubtypeConfig = (subtype: string | null) => {
    if (!subtype) return null;
    return SUBTYPE_CONFIG[subtype] || null;
  };

  it('should return config for known subtypes', () => {
    expect(getSubtypeConfig('bank_deposit')).toEqual({ label: 'Depósito bancario', icon: 'bank' });
    expect(getSubtypeConfig('paypal')).toEqual({ label: 'PayPal', icon: 'paypal' });
  });

  it('should return null for unknown subtypes', () => {
    expect(getSubtypeConfig('crypto')).toBeNull();
    expect(getSubtypeConfig('venmo')).toBeNull();
  });

  it('should return null for null subtype', () => {
    expect(getSubtypeConfig(null)).toBeNull();
  });
});

describe('usePaymentMethods - method name generation', () => {
  const generateMethodName = (type: PaymentMethodType, subtype: string | null, bankName: string | null): string => {
    if (subtype) {
      // Map subtypes to friendly names
      const subtypeNames: Record<string, string> = {
        'bank_deposit': 'Depósito',
        'bank_transfer_spei': 'SPEI',
        'debit_card': 'Tarjeta',
        'paypal': 'PayPal',
        'mercadopago': 'Mercado Pago',
        'oxxo': 'OXXO',
      };
      const subtypeName = subtypeNames[subtype] || subtype;
      if (bankName && type === 'bank_transfer') {
        return `${subtypeName} - ${bankName}`;
      }
      return subtypeName;
    }

    if (type === 'bank_transfer' && bankName) {
      return bankName;
    }

    const typeNames: Record<PaymentMethodType, string> = {
      'bank_transfer': 'Transferencia bancaria',
      'cash': 'Efectivo',
      'other': 'Otro método',
    };

    return typeNames[type];
  };

  it('should generate name with subtype and bank', () => {
    expect(generateMethodName('bank_transfer', 'bank_transfer_spei', 'BBVA')).toBe('SPEI - BBVA');
  });

  it('should generate name with subtype only', () => {
    expect(generateMethodName('other', 'paypal', null)).toBe('PayPal');
  });

  it('should generate name with bank only', () => {
    expect(generateMethodName('bank_transfer', null, 'Santander')).toBe('Santander');
  });

  it('should generate default name for type', () => {
    expect(generateMethodName('cash', null, null)).toBe('Efectivo');
    expect(generateMethodName('other', null, null)).toBe('Otro método');
  });
});
