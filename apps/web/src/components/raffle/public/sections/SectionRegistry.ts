// ============================================================================
// TIER S: Section Registry - Prioritized Section System
// ============================================================================
// Central registry for all template sections with priority, tier, and metadata.
// Ensures critical sections are always visible and provides default ordering.

import { 
  Layout, 
  Ticket, 
  Clock, 
  BarChart3, 
  ImagePlus, 
  Package,
  HelpCircle,
  Gift,
  Award,
  MessageSquare,
  Shield,
  Building2,
  Phone,
  Star,
  Activity,
  LucideIcon
} from 'lucide-react';

export type SectionTier = 'critical' | 'important' | 'optional';

export interface SectionConfig {
  id: string;
  priority: number;
  tier: SectionTier;
  canHide: boolean;
  label: string;
  labelEs: string;
  icon: LucideIcon;
  description: string;
  requiredData?: string[];
  defaultVisible: boolean;
}

/**
 * Central registry of all available template sections
 * Ordered by priority (1 = highest importance)
 */
export const SECTION_REGISTRY: Record<string, SectionConfig> = {
  // =========================================================================
  // TIER 1: CRITICAL - Always visible, cannot be hidden
  // =========================================================================
  hero: {
    id: 'hero',
    priority: 1,
    tier: 'critical',
    canHide: false,
    label: 'Hero Header',
    labelEs: 'Encabezado Principal',
    icon: Layout,
    description: 'Title, badges, main image and description',
    requiredData: ['title', 'prize_name'],
    defaultVisible: true,
  },
  tickets: {
    id: 'tickets',
    priority: 2,
    tier: 'critical',
    canHide: false,
    label: 'Ticket Selector',
    labelEs: 'Selector de Boletos',
    icon: Ticket,
    description: 'Ticket grid and purchase controls',
    defaultVisible: true,
  },
  countdown: {
    id: 'countdown',
    priority: 3,
    tier: 'critical',
    canHide: false,
    label: 'Countdown Timer',
    labelEs: 'Cuenta Regresiva',
    icon: Clock,
    description: 'Time remaining until draw',
    requiredData: ['draw_date'],
    defaultVisible: true,
  },
  
  // =========================================================================
  // TIER 2: IMPORTANT - Recommended, can be hidden
  // =========================================================================
  stats: {
    id: 'stats',
    priority: 4,
    tier: 'important',
    canHide: true,
    label: 'Stats Cards',
    labelEs: 'Estadísticas',
    icon: BarChart3,
    description: 'Price, draw date, tickets sold',
    defaultVisible: true,
  },
  gallery: {
    id: 'gallery',
    priority: 5,
    tier: 'important',
    canHide: true,
    label: 'Prize Gallery',
    labelEs: 'Galería de Premios',
    icon: ImagePlus,
    description: 'Images and video of prizes',
    defaultVisible: true,
  },
  packages: {
    id: 'packages',
    priority: 6,
    tier: 'important',
    canHide: true,
    label: 'Packages',
    labelEs: 'Paquetes con Descuento',
    icon: Package,
    description: 'Discounted ticket packages',
    defaultVisible: true,
  },
  how_it_works: {
    id: 'how_it_works',
    priority: 7,
    tier: 'important',
    canHide: true,
    label: 'How to Participate',
    labelEs: 'Cómo Participar',
    icon: HelpCircle,
    description: 'Step-by-step participation guide',
    defaultVisible: true,
  },
  
  // =========================================================================
  // TIER 3: OPTIONAL - Nice to have, hidden by default on some templates
  // =========================================================================
  predraws: {
    id: 'predraws',
    priority: 8,
    tier: 'optional',
    canHide: true,
    label: 'Pre-draws',
    labelEs: 'Pre-sorteos',
    icon: Gift,
    description: 'Upcoming pre-draw schedule',
    defaultVisible: true,
  },
  prizes: {
    id: 'prizes',
    priority: 9,
    tier: 'optional',
    canHide: true,
    label: 'Prize List',
    labelEs: 'Lista de Premios',
    icon: Award,
    description: 'All prizes with details',
    defaultVisible: true,
  },
  faq: {
    id: 'faq',
    priority: 10,
    tier: 'optional',
    canHide: true,
    label: 'FAQ',
    labelEs: 'Preguntas Frecuentes',
    icon: MessageSquare,
    description: 'Common questions and answers',
    defaultVisible: true,
  },
  transparency: {
    id: 'transparency',
    priority: 11,
    tier: 'optional',
    canHide: true,
    label: 'Transparency',
    labelEs: 'Transparencia',
    icon: Shield,
    description: 'Draw method and fairness info',
    defaultVisible: true,
  },
  organizer: {
    id: 'organizer',
    priority: 12,
    tier: 'optional',
    canHide: true,
    label: 'Organizer',
    labelEs: 'Organizador',
    icon: Building2,
    description: 'Organization profile and trust info',
    defaultVisible: true,
  },
  contact: {
    id: 'contact',
    priority: 13,
    tier: 'optional',
    canHide: true,
    label: 'Contact',
    labelEs: 'Contacto',
    icon: Phone,
    description: 'Contact information and support',
    defaultVisible: true,
  },
  testimonials: {
    id: 'testimonials',
    priority: 14,
    tier: 'optional',
    canHide: true,
    label: 'Testimonials',
    labelEs: 'Testimonios',
    icon: Star,
    description: 'Past winner testimonials',
    defaultVisible: false,
  },
  live_feed: {
    id: 'live_feed',
    priority: 15,
    tier: 'optional',
    canHide: true,
    label: 'Live Feed',
    labelEs: 'Actividad en Vivo',
    icon: Activity,
    description: 'Real-time purchase activity',
    defaultVisible: false,
  },
};

/**
 * Default section order by priority
 */
export const DEFAULT_SECTION_ORDER: string[] = Object.values(SECTION_REGISTRY)
  .sort((a, b) => a.priority - b.priority)
  .map(section => section.id);

/**
 * Get sections that are visible by default
 */
export const DEFAULT_VISIBLE_SECTIONS: Record<string, boolean> = Object.fromEntries(
  Object.values(SECTION_REGISTRY).map(section => [section.id, section.defaultVisible])
);

/**
 * Get only critical sections (cannot be hidden)
 */
export const CRITICAL_SECTIONS: string[] = Object.values(SECTION_REGISTRY)
  .filter(section => section.tier === 'critical')
  .map(section => section.id);

/**
 * Get section config by ID
 */
export function getSectionConfig(sectionId: string): SectionConfig | undefined {
  return SECTION_REGISTRY[sectionId];
}

/**
 * Check if section can be hidden
 */
export function canHideSection(sectionId: string): boolean {
  const config = getSectionConfig(sectionId);
  return config?.canHide ?? true;
}

/**
 * Check if section is critical
 */
export function isCriticalSection(sectionId: string): boolean {
  return CRITICAL_SECTIONS.includes(sectionId);
}

/**
 * Get sections by tier
 */
export function getSectionsByTier(tier: SectionTier): SectionConfig[] {
  return Object.values(SECTION_REGISTRY)
    .filter(section => section.tier === tier)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Merge custom order with defaults, ensuring all sections are included
 */
export function mergeWithDefaultOrder(customOrder: string[]): string[] {
  // Start with custom order
  const merged = [...customOrder];
  
  // Add any missing sections in their default position
  DEFAULT_SECTION_ORDER.forEach(sectionId => {
    if (!merged.includes(sectionId)) {
      merged.push(sectionId);
    }
  });
  
  return merged;
}

/**
 * Filter visible sections respecting critical tier
 */
export function getVisibleSections(
  order: string[], 
  visibility: Record<string, boolean>
): string[] {
  return order.filter(sectionId => {
    // Critical sections are always visible
    if (isCriticalSection(sectionId)) return true;
    // Check visibility setting
    return visibility[sectionId] !== false;
  });
}

/**
 * Get tier badge color
 */
export function getTierBadgeVariant(tier: SectionTier): 'default' | 'secondary' | 'outline' {
  switch (tier) {
    case 'critical': return 'default';
    case 'important': return 'secondary';
    case 'optional': return 'outline';
  }
}

/**
 * Get tier label
 */
export function getTierLabel(tier: SectionTier): string {
  switch (tier) {
    case 'critical': return 'Siempre visible';
    case 'important': return 'Recomendado';
    case 'optional': return 'Opcional';
  }
}
