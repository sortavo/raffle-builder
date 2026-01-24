// Utility functions for SDK UI components

export function formatCurrency(amount: number, currency: string = 'MXN'): string {
  const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-MX').format(num);
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    ...options,
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const absDiff = Math.abs(diff);

  const minutes = Math.floor(absDiff / (1000 * 60));
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

  const isFuture = diff > 0;
  const prefix = isFuture ? 'en ' : 'hace ';
  const suffix = isFuture ? '' : '';

  if (days > 0) {
    return `${prefix}${days} ${days === 1 ? 'día' : 'días'}${suffix}`;
  }
  if (hours > 0) {
    return `${prefix}${hours} ${hours === 1 ? 'hora' : 'horas'}${suffix}`;
  }
  if (minutes > 0) {
    return `${prefix}${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}${suffix}`;
  }

  return isFuture ? 'ahora' : 'hace un momento';
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 90) return '#EF4444'; // Red - almost sold out
  if (percentage >= 75) return '#F59E0B'; // Orange - selling fast
  if (percentage >= 50) return '#10B981'; // Green - good progress
  return '#6366F1'; // Primary - normal
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
