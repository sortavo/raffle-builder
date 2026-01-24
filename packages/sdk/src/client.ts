// Sortavo API Client - Headless SDK for all platforms
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  SortavoConfig,
  Raffle,
  Ticket,
  Purchase,
  PaginatedResponse,
  ApiResponse,
  SortavoError,
  SortavoUser,
} from './types';

// Default production values
const DEFAULT_SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDcwMDIsImV4cCI6MjA4MzQ4MzAwMn0.lQd4r9clw-unRd97qTNxaQe-6f99rvtM9tTJPzbpMdk';

export class SortavoClient {
  private supabase: SupabaseClient;
  private config: SortavoConfig;

  constructor(config: SortavoConfig) {
    this.config = config;
    this.supabase = createClient(
      config.supabaseUrl || DEFAULT_SUPABASE_URL,
      config.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY
    );
  }

  // ==================== Authentication ====================

  async signInWithEmail(email: string, password: string): Promise<ApiResponse<SortavoUser>> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      const user = await this.getCurrentUser();
      return { success: true, data: user.data };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async signInWithOTP(phone: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({ phone });

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async verifyOTP(phone: string, token: string): Promise<ApiResponse<SortavoUser>> {
    try {
      const { data, error } = await this.supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      const user = await this.getCurrentUser();
      return { success: true, data: user.data };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async signOut(): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        return { success: false, error: this.mapError(error) };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async getCurrentUser(): Promise<ApiResponse<SortavoUser>> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();

      if (error || !user) {
        return { success: false, error: this.mapError(error || new Error('No user')) };
      }

      // Fetch profile data
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const sortavoUser: SortavoUser = {
        id: user.id,
        email: user.email || '',
        name: profile?.full_name || profile?.display_name,
        phone: user.phone,
        avatar: profile?.avatar_url,
        role: profile?.role || 'participant',
        tenantId: profile?.organization_id,
      };

      return { success: true, data: sortavoUser };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  // ==================== Raffles ====================

  async getRaffles(options: {
    page?: number;
    limit?: number;
    status?: 'active' | 'completed' | 'all';
  } = {}): Promise<ApiResponse<PaginatedResponse<Raffle>>> {
    try {
      const { page = 1, limit = 20, status = 'active' } = options;
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('raffles')
        .select('*, raffle_prizes(*), ticket_packages(*)', { count: 'exact' })
        .eq('organizer_id', this.config.tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      const raffles = (data || []).map(this.mapRaffle);
      const total = count || 0;

      return {
        success: true,
        data: {
          data: raffles,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: offset + limit < total,
          },
        },
      };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async getRaffle(raffleId: string): Promise<ApiResponse<Raffle>> {
    try {
      const { data, error } = await this.supabase
        .from('raffles')
        .select('*, raffle_prizes(*), ticket_packages(*)')
        .eq('id', raffleId)
        .single();

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true, data: this.mapRaffle(data) };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async getRaffleBySlug(slug: string): Promise<ApiResponse<Raffle>> {
    try {
      const { data, error } = await this.supabase
        .from('raffles')
        .select('*, raffle_prizes(*), ticket_packages(*)')
        .eq('slug', slug)
        .eq('organizer_id', this.config.tenantId)
        .single();

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true, data: this.mapRaffle(data) };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  // ==================== Tickets ====================

  async getAvailableTickets(raffleId: string): Promise<ApiResponse<Ticket[]>> {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .select('*')
        .eq('raffle_id', raffleId)
        .eq('status', 'available')
        .order('number', { ascending: true });

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true, data: (data || []).map(this.mapTicket) };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async reserveTickets(raffleId: string, ticketNumbers: string[]): Promise<ApiResponse<Ticket[]>> {
    try {
      const { data, error } = await this.supabase
        .rpc('reserve_tickets', {
          p_raffle_id: raffleId,
          p_ticket_numbers: ticketNumbers,
        });

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true, data: (data || []).map(this.mapTicket) };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async getMyTickets(raffleId?: string): Promise<ApiResponse<Ticket[]>> {
    try {
      let query = this.supabase
        .from('tickets')
        .select('*, raffles(title, slug)')
        .eq('status', 'sold');

      if (raffleId) {
        query = query.eq('raffle_id', raffleId);
      }

      const { data, error } = await query.order('purchased_at', { ascending: false });

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true, data: (data || []).map(this.mapTicket) };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  // ==================== Purchases ====================

  async createPurchase(raffleId: string, ticketNumbers: string[]): Promise<ApiResponse<Purchase>> {
    try {
      const { data, error } = await this.supabase
        .rpc('create_purchase', {
          p_raffle_id: raffleId,
          p_ticket_numbers: ticketNumbers,
        });

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true, data: this.mapPurchase(data) };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async getMyPurchases(): Promise<ApiResponse<Purchase[]>> {
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .select('*, tickets(*), raffles(title, slug)')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true, data: (data || []).map(this.mapPurchase) };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  // ==================== Payments ====================

  async createPaymentIntent(purchaseId: string): Promise<ApiResponse<{ clientSecret: string }>> {
    try {
      const { data, error } = await this.supabase.functions.invoke('create-payment-intent', {
        body: { purchaseId },
      });

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true, data: { clientSecret: data.clientSecret } };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  // ==================== Real-time Subscriptions ====================

  subscribeToRaffle(raffleId: string, callbacks: {
    onTicketUpdate?: (ticket: Ticket) => void;
    onRaffleUpdate?: (raffle: Partial<Raffle>) => void;
  }) {
    const channel = this.supabase
      .channel(`raffle:${raffleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `raffle_id=eq.${raffleId}`,
        },
        (payload) => {
          if (callbacks.onTicketUpdate) {
            callbacks.onTicketUpdate(this.mapTicket(payload.new));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'raffles',
          filter: `id=eq.${raffleId}`,
        },
        (payload) => {
          if (callbacks.onRaffleUpdate) {
            callbacks.onRaffleUpdate(this.mapRaffle(payload.new));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  // ==================== Helper Methods ====================

  private mapRaffle(data: any): Raffle {
    return {
      id: data.id,
      tenantId: data.organizer_id,
      title: data.title,
      description: data.description || '',
      slug: data.slug,
      imageUrl: data.image_url,
      coverImageUrl: data.cover_image_url,
      status: data.status,
      startDate: new Date(data.start_date),
      endDate: new Date(data.end_date),
      drawDate: data.draw_date ? new Date(data.draw_date) : undefined,
      ticketPrice: data.ticket_price,
      currency: data.currency || 'MXN',
      totalTickets: data.total_tickets,
      soldTickets: data.sold_tickets || 0,
      availableTickets: data.available_tickets || data.total_tickets - (data.sold_tickets || 0),
      prizes: (data.raffle_prizes || []).map((p: any) => ({
        id: p.id,
        position: p.position,
        title: p.title,
        description: p.description,
        imageUrl: p.image_url,
        value: p.value,
      })),
      packages: (data.ticket_packages || []).map((p: any) => ({
        id: p.id,
        quantity: p.quantity,
        price: p.price,
        originalPrice: p.original_price,
        discount: p.discount,
        label: p.label,
        isBestValue: p.is_best_value,
      })),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapTicket(data: any): Ticket {
    return {
      id: data.id,
      raffleId: data.raffle_id,
      number: data.number,
      status: data.status,
      userId: data.user_id,
      purchasedAt: data.purchased_at ? new Date(data.purchased_at) : undefined,
      reservedUntil: data.reserved_until ? new Date(data.reserved_until) : undefined,
    };
  }

  private mapPurchase(data: any): Purchase {
    return {
      id: data.id,
      raffleId: data.raffle_id,
      userId: data.user_id,
      tickets: (data.tickets || []).map(this.mapTicket),
      totalAmount: data.total_amount,
      currency: data.currency || 'MXN',
      status: data.status,
      paymentMethod: data.payment_method,
      paymentIntentId: data.payment_intent_id,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }

  private mapError(error: any): SortavoError {
    return {
      code: error?.code || 'UNKNOWN_ERROR',
      message: error?.message || 'An unknown error occurred',
      details: error?.details,
      timestamp: new Date(),
    };
  }
}

// Factory function for creating SDK client
export function createSortavoClient(config: SortavoConfig): SortavoClient {
  return new SortavoClient(config);
}
