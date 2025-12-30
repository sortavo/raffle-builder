// Subscription Limits for Sortavo
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTier = 'basic' | 'pro' | 'premium' | 'enterprise' | null;

export interface SubscriptionLimits {
  maxActiveRaffles: number;
  maxTicketsPerRaffle: number;
  templatesAvailable: number;
  canRemoveBranding: boolean;
  hasAdvancedAnalytics: boolean;
  hasPrioritySupport: boolean;
  hasWhatsAppSupport: boolean;
  hasCustomCSS: boolean;
  hasAccountManager: boolean;
  hasLotteryIntegration: boolean;
  hasTelegramBot: boolean;
  hasApiAccess: boolean;
}

export function getSubscriptionLimits(tier: SubscriptionTier): SubscriptionLimits {
  switch (tier) {
    case 'enterprise':
      return {
        maxActiveRaffles: 999,
        maxTicketsPerRaffle: 10000000,
        templatesAvailable: 6,
        canRemoveBranding: true,
        hasAdvancedAnalytics: true,
        hasPrioritySupport: true,
        hasWhatsAppSupport: true,
        hasCustomCSS: true,
        hasAccountManager: true,
        hasLotteryIntegration: true,
        hasTelegramBot: true,
        hasApiAccess: true,
      };

    case 'premium':
      return {
        maxActiveRaffles: 15,
        maxTicketsPerRaffle: 100000,
        templatesAvailable: 6,
        canRemoveBranding: true,
        hasAdvancedAnalytics: true,
        hasPrioritySupport: true,
        hasWhatsAppSupport: true,
        hasCustomCSS: true,
        hasAccountManager: true,
        hasLotteryIntegration: true,
        hasTelegramBot: true,
        hasApiAccess: false,
      };
    
    case 'pro':
      return {
        maxActiveRaffles: 7,
        maxTicketsPerRaffle: 30000,
        templatesAvailable: 6,
        canRemoveBranding: true,
        hasAdvancedAnalytics: true,
        hasPrioritySupport: true,
        hasWhatsAppSupport: true,
        hasCustomCSS: false,
        hasAccountManager: false,
        hasLotteryIntegration: true,
        hasTelegramBot: false,
        hasApiAccess: false,
      };
    
    case 'basic':
    default:
      return {
        maxActiveRaffles: 2,
        maxTicketsPerRaffle: 2000,
        templatesAvailable: 1,
        canRemoveBranding: false,
        hasAdvancedAnalytics: false,
        hasPrioritySupport: false,
        hasWhatsAppSupport: false,
        hasCustomCSS: false,
        hasAccountManager: false,
        hasLotteryIntegration: false,
        hasTelegramBot: false,
        hasApiAccess: false,
      };
  }
}

export async function checkRaffleLimit(
  organizationId: string,
  tier: SubscriptionTier
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limits = getSubscriptionLimits(tier);
  
  if (limits.maxActiveRaffles >= 999) {
    return { allowed: true, current: 0, limit: -1 };
  }

  const { count, error } = await supabase
    .from('raffles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('status', ['draft', 'active', 'paused']);

  if (error) throw error;

  return {
    allowed: (count || 0) < limits.maxActiveRaffles,
    current: count || 0,
    limit: limits.maxActiveRaffles,
  };
}

export function checkTicketLimit(
  totalTickets: number,
  tier: SubscriptionTier
): { allowed: boolean; limit: number } {
  const limits = getSubscriptionLimits(tier);
  
  return {
    allowed: totalTickets <= limits.maxTicketsPerRaffle,
    limit: limits.maxTicketsPerRaffle,
  };
}
