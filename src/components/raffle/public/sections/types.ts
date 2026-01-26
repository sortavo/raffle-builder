// ============================================================================
// Types for Section Components
// ============================================================================

import type { Json } from '@/integrations/supabase/types';

export interface RaffleData {
  id?: string;
  title?: string;
  description?: string;
  prize_name?: string;
  prize_value?: number;
  prize_images?: string[];
  prize_video_url?: string;
  ticket_price?: number;
  total_tickets?: number;
  draw_date?: string;
  draw_method?: string;
  status?: string;
  slug?: string;
  currency_code?: string;
  customization?: Json;
  prizes?: Json;
  lottery_digits?: number;
  lottery_draw_number?: string;
  lucky_numbers_enabled?: boolean;
  lucky_numbers_config?: Json;
  max_tickets_per_person?: number;
  max_tickets_per_purchase?: number;
  min_tickets_per_purchase?: number;
  reservation_time_minutes?: number;
  allow_individual_sale?: boolean;
  livestream_url?: string;
  organization_id?: string;
}

export interface OrganizationData {
  id?: string;
  name?: string;
  slug?: string;
  logo_url?: string;
  description?: string;
  email?: string;
  phone?: string;
  phones?: string[];
  whatsapp_number?: string;
  whatsapp_numbers?: string[];
  verified?: boolean;
  years_experience?: number;
  total_raffles_completed?: number;
  brand_color?: string;
  country_code?: string;
  currency_code?: string;
  timezone?: string;
  facebook_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  website_url?: string;
}

export interface SectionProps {
  raffle: RaffleData;
  organization?: OrganizationData;
  currency: string;
  isPreview?: boolean;
  // For sections that need interactivity
  onTicketSelect?: (tickets: string[]) => void;
  selectedTickets?: string[];
  onCheckout?: () => void;
}

export interface SectionWrapperProps extends SectionProps {
  className?: string;
  id?: string;
}
