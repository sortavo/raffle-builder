// Raffle utility functions

export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 50); // Max 50 characters
};

export const generateUniqueSlug = async (
  title: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> => {
  const baseSlug = generateSlug(title);
  let slug = baseSlug;
  let counter = 1;

  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

export const formatTicketNumber = (
  number: number,
  format: 'sequential' | 'prefixed' | 'random',
  totalTickets: number,
  prefix?: string
): string => {
  const digits = Math.max(3, totalTickets.toString().length);
  
  switch (format) {
    case 'sequential':
      return number.toString().padStart(digits, '0');
    case 'prefixed':
      return `${prefix || 'TKT'}-${number.toString().padStart(digits, '0')}`;
    case 'random':
      return number.toString().padStart(digits, '0');
    default:
      return number.toString().padStart(digits, '0');
  }
};

export const generateRandomTicketNumbers = (count: number): number[] => {
  const numbers = new Set<number>();
  const max = count * 10; // Generate from a larger pool
  
  while (numbers.size < count) {
    numbers.add(Math.floor(Math.random() * max) + 1);
  }
  
  return Array.from(numbers).sort((a, b) => a - b);
};

export const getTicketLimitByTier = (tier: string | null): number => {
  switch (tier) {
    case 'premium':
      return 100000;
    case 'pro':
      return 50000;
    case 'basic':
    default:
      return 2000;
  }
};

export const getRaffleLimitByTier = (tier: string | null): number => {
  switch (tier) {
    case 'premium':
      return 100;
    case 'pro':
      return 20;
    case 'basic':
    default:
      return 2;
  }
};

export const TICKET_COUNT_OPTIONS = [
  { value: 100, label: '100' },
  { value: 500, label: '500' },
  { value: 1000, label: '1,000' },
  { value: 2000, label: '2,000' },
  { value: 5000, label: '5,000' },
  { value: 10000, label: '10,000' },
  { value: 20000, label: '20,000' },
  { value: 30000, label: '30,000' },
  { value: 50000, label: '50,000' },
  { value: 100000, label: '100,000' },
];

export const RAFFLE_CATEGORIES = [
  { value: 'cars', label: 'Autos' },
  { value: 'electronics', label: 'Electrónicos' },
  { value: 'real_estate', label: 'Bienes Raíces' },
  { value: 'travel', label: 'Viajes' },
  { value: 'other', label: 'Otro' },
];

export const RAFFLE_STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  active: { label: 'Activo', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  paused: { label: 'Pausado', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' },
  completed: { label: 'Completado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
  canceled: { label: 'Cancelado', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' },
};

export const CLOSE_SALE_OPTIONS = [
  { value: 0, label: 'Sin límite' },
  { value: 2, label: '2 horas antes' },
  { value: 6, label: '6 horas antes' },
  { value: 12, label: '12 horas antes' },
  { value: 24, label: '24 horas antes' },
  { value: 48, label: '48 horas antes' },
];

export const RESERVATION_TIME_OPTIONS = [
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '60 minutos' },
];

export const RAFFLE_TEMPLATES = [
  { id: 'modern', name: 'Moderno', description: 'Diseño limpio y contemporáneo' },
  { id: 'classic', name: 'Clásico', description: 'Estilo tradicional elegante' },
  { id: 'minimal', name: 'Minimalista', description: 'Simple y enfocado' },
  { id: 'festive', name: 'Festivo', description: 'Colorido y celebratorio' },
  { id: 'elegant', name: 'Elegante', description: 'Sofisticado y lujoso' },
  { id: 'sports', name: 'Deportivo', description: 'Dinámico y energético' },
];

export const GOOGLE_FONTS_TITLES = [
  'Montserrat',
  'Playfair Display',
  'Oswald',
  'Poppins',
  'Roboto Slab',
  'Lora',
  'Bebas Neue',
  'Raleway',
];

export const GOOGLE_FONTS_BODY = [
  'Open Sans',
  'Roboto',
  'Lato',
  'Source Sans Pro',
  'Nunito',
  'Inter',
  'Work Sans',
  'Mulish',
];

export const DESIGN_SECTIONS = [
  { id: 'hero', label: 'Hero', default: true },
  { id: 'countdown', label: 'Cuenta Regresiva', default: true },
  { id: 'ticket_grid', label: 'Grid de Boletos', default: true },
  { id: 'packages', label: 'Paquetes', default: true },
  { id: 'gallery', label: 'Galería', default: true },
  { id: 'video', label: 'Video', default: false },
  { id: 'how_it_works', label: 'Cómo Funciona', default: true },
  { id: 'testimonials', label: 'Testimonios', default: false },
  { id: 'faq', label: 'Preguntas Frecuentes', default: true },
  { id: 'live_feed', label: 'Feed en Vivo', default: false },
  { id: 'stats', label: 'Estadísticas', default: true },
  { id: 'share_buttons', label: 'Botones de Compartir', default: true },
];
