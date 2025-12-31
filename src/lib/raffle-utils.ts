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
    case 'enterprise':
      return 10000000; // 10 million
    case 'premium':
      return 100000;
    case 'pro':
      return 30000;
    case 'basic':
    default:
      return 2000;
  }
};

export const getRaffleLimitByTier = (tier: string | null): number => {
  switch (tier) {
    case 'enterprise':
      return 999;
    case 'premium':
      return 15;
    case 'pro':
      return 7;
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
  { value: 250000, label: '250,000' },
  { value: 500000, label: '500,000' },
  { value: 1000000, label: '1,000,000' },
  { value: 2000000, label: '2,000,000' },
  { value: 5000000, label: '5,000,000' },
  { value: 10000000, label: '10,000,000' },
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
  active: { label: 'Activo', color: 'bg-success/20 text-success' },
  paused: { label: 'Pausado', color: 'bg-warning/20 text-warning' },
  completed: { label: 'Completado', color: 'bg-primary/20 text-primary' },
  canceled: { label: 'Cancelado', color: 'bg-destructive/20 text-destructive' },
};

export const CLOSE_SALE_OPTIONS = [
  { value: 0, label: 'Sin límite' },
  { value: 2, label: '2 horas antes' },
  { value: 6, label: '6 horas antes' },
  { value: 12, label: '12 horas antes' },
  { value: 24, label: '24 horas antes' },
  { value: 48, label: '48 horas antes' },
];

export const CLOSE_SALE_TIME_UNITS = [
  { value: 'hours', label: 'Horas', multiplier: 1 },
  { value: 'days', label: 'Días', multiplier: 24 },
];

export const MAX_CLOSE_SALE_HOURS = 168; // Máximo 7 días

export const formatCloseSaleTime = (hours: number): string => {
  if (hours === 0) return 'Sin límite';
  if (hours >= 24 && hours % 24 === 0) {
    const days = hours / 24;
    return `${days} día${days > 1 ? 's' : ''} antes`;
  }
  return `${hours} hora${hours > 1 ? 's' : ''} antes`;
};

export const RESERVATION_TIME_OPTIONS = [
  { value: 15, label: '15 minutos', description: 'Rápido - Ideal para rifas pequeñas' },
  { value: 30, label: '30 minutos', description: 'Estándar - Tiempo suficiente para transferencias' },
  { value: 60, label: '1 hora', description: 'Cómodo - Para pagos más complejos' },
  { value: 120, label: '2 horas', description: 'Extendido - Permite verificar fondos' },
  { value: 1440, label: '24 horas', description: 'Un día completo' },
  { value: 2880, label: '48 horas', description: 'Dos días - Para transferencias internacionales' },
  { value: 4320, label: '72 horas', description: 'Tres días - Máxima flexibilidad' },
];

export const RESERVATION_TIME_UNITS = [
  { value: 'minutes', label: 'Minutos', multiplier: 1 },
  { value: 'hours', label: 'Horas', multiplier: 60 },
  { value: 'days', label: 'Días', multiplier: 1440 },
];

export const formatReservationTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes} minutos`;
  if (minutes < 1440) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }
  const days = minutes / 1440;
  return days === 1 ? '1 día' : `${days} días`;
};

export const MAX_RESERVATION_MINUTES = 10080; // 7 days

export type TemplateLayoutType = 
  | 'modern'      // Side-by-side hero, horizontal carousel
  | 'classic'     // Centered content, grid gallery
  | 'minimal'     // Single focus, asymmetric whitespace
  | 'festive'     // Full-width hero, confetti, large carousel
  | 'elegant'     // Dark asymmetric, luxury feel
  | 'sports';     // Bold full-width, action-oriented

export interface TemplateLayout {
  heroStyle: 'side-by-side' | 'centered' | 'full-width' | 'asymmetric';
  galleryStyle: 'carousel' | 'grid' | 'single-focus' | 'masonry';
  pricePosition: 'overlay' | 'below' | 'side' | 'badge';
  contentAlignment: 'left' | 'center' | 'right';
  sectionSpacing: 'compact' | 'normal' | 'generous';
  decorations: ('confetti' | 'patterns' | 'glow' | 'borders' | 'none')[];
}

export interface RaffleTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    cardBg: string;
    text: string;
    textMuted: string;
  };
  fonts: {
    title: string;
    body: string;
  };
  effects: {
    borderRadius: string;
    shadow: string;
    gradient: string;
    pattern?: string;
  };
  layout: TemplateLayout;
}

export const RAFFLE_TEMPLATES: RaffleTemplate[] = [
  {
    id: 'modern',
    name: 'Moderno',
    description: 'Diseño limpio y contemporáneo',
    icon: '🎯',
    colors: {
      primary: '#2563EB',
      secondary: '#3B82F6',
      accent: '#F59E0B',
      background: '#FFFFFF',
      cardBg: '#F8FAFC',
      text: '#0F172A',
      textMuted: '#64748B',
    },
    fonts: {
      title: 'Montserrat',
      body: 'Inter',
    },
    effects: {
      borderRadius: '1rem',
      shadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
    },
    layout: {
      heroStyle: 'side-by-side',
      galleryStyle: 'carousel',
      pricePosition: 'overlay',
      contentAlignment: 'left',
      sectionSpacing: 'normal',
      decorations: ['glow'],
    },
  },
  {
    id: 'classic',
    name: 'Clásico',
    description: 'Estilo tradicional elegante',
    icon: '🏛️',
    colors: {
      primary: '#7C3AED',
      secondary: '#8B5CF6',
      accent: '#D97706',
      background: '#FFFBF5',
      cardBg: '#FEF7ED',
      text: '#1C1917',
      textMuted: '#78716C',
    },
    fonts: {
      title: 'Playfair Display',
      body: 'Lora',
    },
    effects: {
      borderRadius: '0.5rem',
      shadow: '0 4px 20px rgba(0,0,0,0.1)',
      gradient: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
    },
    layout: {
      heroStyle: 'centered',
      galleryStyle: 'grid',
      pricePosition: 'below',
      contentAlignment: 'center',
      sectionSpacing: 'generous',
      decorations: ['borders'],
    },
  },
  {
    id: 'minimal',
    name: 'Minimalista',
    description: 'Simple y enfocado',
    icon: '⬜',
    colors: {
      primary: '#18181B',
      secondary: '#27272A',
      accent: '#EF4444',
      background: '#FFFFFF',
      cardBg: '#FAFAFA',
      text: '#09090B',
      textMuted: '#71717A',
    },
    fonts: {
      title: 'Inter',
      body: 'Inter',
    },
    effects: {
      borderRadius: '0.375rem',
      shadow: '0 1px 3px rgba(0,0,0,0.08)',
      gradient: 'linear-gradient(135deg, #18181B 0%, #3F3F46 100%)',
    },
    layout: {
      heroStyle: 'asymmetric',
      galleryStyle: 'single-focus',
      pricePosition: 'side',
      contentAlignment: 'left',
      sectionSpacing: 'generous',
      decorations: ['none'],
    },
  },
  {
    id: 'festive',
    name: 'Festivo',
    description: 'Colorido y celebratorio',
    icon: '🎉',
    colors: {
      primary: '#E11D48',
      secondary: '#F43F5E',
      accent: '#FBBF24',
      background: '#FFF7ED',
      cardBg: '#FFFBEB',
      text: '#1F2937',
      textMuted: '#6B7280',
    },
    fonts: {
      title: 'Poppins',
      body: 'Nunito',
    },
    effects: {
      borderRadius: '1.5rem',
      shadow: '0 20px 50px -15px rgba(225,29,72,0.25)',
      gradient: 'linear-gradient(135deg, #E11D48 0%, #FB7185 50%, #FBBF24 100%)',
      pattern: 'radial-gradient(circle at 2px 2px, rgba(251,191,36,0.3) 1px, transparent 0)',
    },
    layout: {
      heroStyle: 'full-width',
      galleryStyle: 'carousel',
      pricePosition: 'badge',
      contentAlignment: 'center',
      sectionSpacing: 'compact',
      decorations: ['confetti', 'patterns'],
    },
  },
  {
    id: 'elegant',
    name: 'Elegante',
    description: 'Sofisticado y lujoso',
    icon: '✨',
    colors: {
      primary: '#0F172A',
      secondary: '#1E293B',
      accent: '#D4AF37',
      background: '#0F172A',
      cardBg: '#1E293B',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
    },
    fonts: {
      title: 'Cormorant Garamond',
      body: 'Raleway',
    },
    effects: {
      borderRadius: '0.25rem',
      shadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      gradient: 'linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%)',
    },
    layout: {
      heroStyle: 'asymmetric',
      galleryStyle: 'masonry',
      pricePosition: 'side',
      contentAlignment: 'left',
      sectionSpacing: 'generous',
      decorations: ['glow', 'borders'],
    },
  },
  {
    id: 'sports',
    name: 'Deportivo',
    description: 'Dinámico y energético',
    icon: '⚡',
    colors: {
      primary: '#16A34A',
      secondary: '#22C55E',
      accent: '#EA580C',
      background: '#ECFDF5',
      cardBg: '#F0FDF4',
      text: '#14532D',
      textMuted: '#4D7C0F',
    },
    fonts: {
      title: 'Bebas Neue',
      body: 'Roboto',
    },
    effects: {
      borderRadius: '0.75rem',
      shadow: '0 10px 30px -5px rgba(22,163,74,0.3)',
      gradient: 'linear-gradient(135deg, #16A34A 0%, #22C55E 50%, #EA580C 100%)',
    },
    layout: {
      heroStyle: 'full-width',
      galleryStyle: 'carousel',
      pricePosition: 'overlay',
      contentAlignment: 'center',
      sectionSpacing: 'compact',
      decorations: ['patterns'],
    },
  },
];

export const getTemplateById = (templateId: string | null | undefined): RaffleTemplate => {
  return RAFFLE_TEMPLATES.find(t => t.id === templateId) || RAFFLE_TEMPLATES[0];
};

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
