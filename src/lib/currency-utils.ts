// Currency utility functions

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$', flag: '🇲🇽', locale: 'es-MX' },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$', flag: '🇨🇴', locale: 'es-CO' },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', flag: '🇺🇸', locale: 'en-US' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$', flag: '🇦🇷', locale: 'es-AR' },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$', flag: '🇨🇱', locale: 'es-CL' },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', flag: '🇵🇪', locale: 'es-PE' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', flag: '🇧🇷', locale: 'pt-BR' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', locale: 'es-ES' },
];

export const getCurrency = (code: string): Currency | undefined => {
  return CURRENCIES.find(c => c.code === code);
};

export const formatCurrency = (amount: number, currencyCode: string): string => {
  const currency = getCurrency(currencyCode);
  if (!currency) return `${currencyCode} ${amount.toFixed(2)}`;

  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCurrencyCompact = (amount: number, currencyCode: string): string => {
  const currency = getCurrency(currencyCode);
  if (!currency) return `${currencyCode} ${amount}`;

  if (amount >= 1000000) {
    return `${currency.symbol}${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${currency.symbol}${(amount / 1000).toFixed(1)}K`;
  }
  return `${currency.symbol}${amount}`;
};

export const parseCurrencyInput = (value: string): number => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
};

export const calculatePackageDiscount = (basePrice: number, quantity: number, packagePrice: number): number => {
  const fullPrice = basePrice * quantity;
  if (fullPrice === 0) return 0;
  return Math.round(((fullPrice - packagePrice) / fullPrice) * 100);
};

export const calculatePackagePrice = (basePrice: number, quantity: number, discountPercent: number): number => {
  const fullPrice = basePrice * quantity;
  return Math.round(fullPrice * (1 - discountPercent / 100));
};
