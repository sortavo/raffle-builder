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
    glassmorphism?: {
      enabled: boolean;
      blur: string;
      opacity: number;
      border?: string;
    };
  };
  layout: TemplateLayout;
}

export const RAFFLE_TEMPLATES: RaffleTemplate[] = [
  {
    id: 'modern',
    name: 'Moderno',
    description: 'Diseño premium con glassmorphism',
    icon: '🎯',
    colors: {
      primary: '#7C3AED',      // Violet-600
      secondary: '#6366F1',    // Indigo-500
      accent: '#F59E0B',       // Amber-500 (CTA)
      background: '#FFFFFF',
      cardBg: 'rgba(255, 255, 255, 0.8)',
      text: '#0F172A',
      textMuted: '#64748B',
    },
    fonts: {
      title: 'Montserrat',
      body: 'Inter',
    },
    effects: {
      borderRadius: '1rem',
      shadow: '0 10px 40px -10px rgba(124, 58, 237, 0.25)',
      gradient: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
      glassmorphism: {
        enabled: true,
        blur: 'backdrop-blur-xl',
        opacity: 0.8,
        border: '1px solid rgba(255, 255, 255, 0.2)',
      },
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
    id: 'ultra-white',
    name: 'Ultra White',
    description: 'Premium luminoso con sombras emerald dramáticas',
    icon: '☀️',
    colors: {
      primary: '#10B981',      // Emerald-500 (Sortavo brand)
      secondary: '#14B8A6',    // Teal-500
      accent: '#F59E0B',       // Amber-500 (CTA dorado)
      background: '#FFFFFF',   // Blanco puro
      cardBg: 'rgba(248, 250, 252, 0.9)', // Slate-50 glass
      text: '#0F172A',         // Slate-900
      textMuted: '#64748B',    // Slate-500
    },
    fonts: {
      title: 'Montserrat',
      body: 'Inter',
    },
    effects: {
      borderRadius: '1.25rem',
      shadow: '0 25px 80px -20px rgba(16, 185, 129, 0.25)',
      gradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 50%, #F59E0B 100%)',
      pattern: 'radial-gradient(circle at 1px 1px, rgba(16,185,129,0.05) 1px, transparent 0)',
      glassmorphism: {
        enabled: true,
        blur: 'backdrop-blur-xl',
        opacity: 0.9,
        border: '1px solid rgba(16, 185, 129, 0.15)',
      },
    },
    layout: {
      heroStyle: 'side-by-side',
      galleryStyle: 'carousel',
      pricePosition: 'overlay',
      contentAlignment: 'left',
      sectionSpacing: 'normal',
      decorations: ['glow', 'patterns'],
    },
  },
  {
    id: 'classic',
    name: 'Clásico',
    description: 'Elegancia tradicional con acentos premium',
    icon: '🏛️',
    colors: {
      primary: '#8B5CF6',      // Violet-500
      secondary: '#A78BFA',    // Violet-400
      accent: '#D97706',       // Amber-600
      background: '#FFFBF5',
      cardBg: 'rgba(254, 247, 237, 0.9)',
      text: '#1C1917',
      textMuted: '#78716C',
    },
    fonts: {
      title: 'Playfair Display',
      body: 'Lora',
    },
    effects: {
      borderRadius: '0.5rem',
      shadow: '0 4px 20px rgba(139, 92, 246, 0.15)',
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
      glassmorphism: {
        enabled: true,
        blur: 'backdrop-blur-md',
        opacity: 0.9,
        border: '1px solid rgba(139, 92, 246, 0.1)',
      },
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
    description: 'Simple con toques sutiles de color',
    icon: '⬜',
    colors: {
      primary: '#4F46E5',      // Indigo-600
      secondary: '#6366F1',    // Indigo-500
      accent: '#10B981',       // Emerald-500 (Success)
      background: '#FFFFFF',
      cardBg: 'rgba(250, 250, 250, 0.95)',
      text: '#09090B',
      textMuted: '#71717A',
    },
    fonts: {
      title: 'Inter',
      body: 'Inter',
    },
    effects: {
      borderRadius: '0.75rem',
      shadow: '0 2px 8px rgba(79, 70, 229, 0.08)',
      gradient: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
      glassmorphism: {
        enabled: false,
        blur: 'backdrop-blur-sm',
        opacity: 0.95,
      },
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
    description: 'Vibrante y celebratorio con gradientes premium',
    icon: '🎉',
    colors: {
      primary: '#EC4899',      // Pink-500
      secondary: '#F472B6',    // Pink-400
      accent: '#F59E0B',       // Amber-500
      background: '#FFF7ED',
      cardBg: 'rgba(255, 251, 235, 0.85)',
      text: '#1F2937',
      textMuted: '#6B7280',
    },
    fonts: {
      title: 'Poppins',
      body: 'Nunito',
    },
    effects: {
      borderRadius: '1.5rem',
      shadow: '0 20px 50px -15px rgba(236, 72, 153, 0.3)',
      gradient: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #F59E0B 100%)',
      pattern: 'radial-gradient(circle at 2px 2px, rgba(251,191,36,0.3) 1px, transparent 0)',
      glassmorphism: {
        enabled: true,
        blur: 'backdrop-blur-xl',
        opacity: 0.85,
        border: '1px solid rgba(236, 72, 153, 0.2)',
      },
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
    description: 'Ultra premium oscuro con glassmorphism',
    icon: '✨',
    colors: {
      primary: '#7C3AED',      // Violet-600 primary
      secondary: '#6366F1',    // Indigo-500
      accent: '#D4AF37',       // Gold
      background: '#030712',   // Gray-950
      cardBg: 'rgba(15, 23, 42, 0.7)',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
    },
    fonts: {
      title: 'Cormorant Garamond',
      body: 'Raleway',
    },
    effects: {
      borderRadius: '1rem',
      shadow: '0 25px 50px -12px rgba(124, 58, 237, 0.4)',
      gradient: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 50%, #10B981 100%)',
      glassmorphism: {
        enabled: true,
        blur: 'backdrop-blur-2xl',
        opacity: 0.7,
        border: '1px solid rgba(124, 58, 237, 0.3)',
      },
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
    description: 'Dinámico con acentos emerald y amber',
    icon: '⚡',
    colors: {
      primary: '#10B981',      // Emerald-500
      secondary: '#34D399',    // Emerald-400
      accent: '#F59E0B',       // Amber-500 (CTA)
      background: '#ECFDF5',
      cardBg: 'rgba(240, 253, 244, 0.9)',
      text: '#14532D',
      textMuted: '#4D7C0F',
    },
    fonts: {
      title: 'Bebas Neue',
      body: 'Roboto',
    },
    effects: {
      borderRadius: '0.75rem',
      shadow: '0 10px 30px -5px rgba(16, 185, 129, 0.3)',
      gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 50%, #F59E0B 100%)',
      glassmorphism: {
        enabled: true,
        blur: 'backdrop-blur-lg',
        opacity: 0.9,
        border: '1px solid rgba(16, 185, 129, 0.2)',
      },
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
  { id: 'hero', label: 'Hero', description: 'Banner principal con imagen del premio', default: true },
  { id: 'countdown', label: 'Cuenta Regresiva', description: 'Temporizador hasta el sorteo', default: true },
  { id: 'ticket_grid', label: 'Grid de Boletos', description: 'Visualización de boletos disponibles', default: true },
  { id: 'packages', label: 'Paquetes', description: 'Ofertas de boletos múltiples', default: true },
  { id: 'gallery', label: 'Galería', description: 'Imágenes adicionales del premio', default: true },
  { id: 'video', label: 'Video', description: 'Video promocional del sorteo', default: false },
  { id: 'how_it_works', label: 'Cómo Funciona', description: 'Instrucciones de participación', default: true },
  { id: 'testimonials', label: 'Testimonios', description: 'Reseñas de ganadores anteriores', default: false },
  { id: 'faq', label: 'FAQ', description: 'Preguntas frecuentes personalizables', default: true },
  { id: 'live_feed', label: 'Feed en Vivo', description: 'Actividad de compras en tiempo real', default: false },
  { id: 'stats', label: 'Estadísticas', description: 'Progreso de ventas y probabilidades', default: true },
  { id: 'share_buttons', label: 'Compartir', description: 'Botones para redes sociales', default: true },
];
