// Sortavo API Client - Headless SDK for all platforms
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  SortavoConfig,
  Raffle,
  Ticket,
  Purchase,
  Notification,
  PaginatedResponse,
  ApiResponse,
  SortavoError,
  SortavoUser,
  Organization,
  OrganizationCategory,
  FeedItem,
  FeedFilters,
  WinnerAnnouncement,
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

  async updateProfile(data: {
    name?: string;
    phone?: string;
    avatar?: string;
  }): Promise<ApiResponse<SortavoUser>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated', timestamp: new Date() } };
      }

      // Update profile in profiles table
      const { error: profileError } = await this.supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: data.name,
          avatar_url: data.avatar,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (profileError) {
        return { success: false, error: this.mapError(profileError) };
      }

      // Update phone in auth if provided
      if (data.phone) {
        const { error: authError } = await this.supabase.auth.updateUser({
          phone: data.phone,
        });
        if (authError) {
          console.warn('Failed to update phone:', authError.message);
        }
      }

      // Fetch updated user
      return this.getCurrentUser();
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

  // ==================== Notifications ====================

  async getNotifications(options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  } = {}): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    try {
      const { page = 1, limit = 50, unreadOnly = false } = options;
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      const notifications = (data || []).map(this.mapNotification);
      const total = count || 0;

      return {
        success: true,
        data: {
          data: notifications,
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

  async getUnreadCount(): Promise<ApiResponse<number>> {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true, data: count || 0 };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('read', false);

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  subscribeToNotifications(callbacks: {
    onNew?: (notification: Notification) => void;
    onUpdate?: (notification: Notification) => void;
    onDelete?: (notificationId: string) => void;
  }) {
    const channel = this.supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (callbacks.onNew) {
            callbacks.onNew(this.mapNotification(payload.new));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (callbacks.onUpdate) {
            callbacks.onUpdate(this.mapNotification(payload.new));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (callbacks.onDelete) {
            callbacks.onDelete((payload.old as any).id);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  // ==================== Organizations (Marketplace Mode) ====================

  async getOrganizations(options: {
    page?: number;
    limit?: number;
    category?: OrganizationCategory;
    search?: string;
    verified?: boolean;
    sortBy?: 'popular' | 'newest' | 'name';
  } = {}): Promise<ApiResponse<PaginatedResponse<Organization>>> {
    try {
      const { page = 1, limit = 20, category, search, verified, sortBy = 'popular' } = options;
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('organizations')
        .select(`
          *,
          organization_stats(*),
          organization_follows(count)
        `, { count: 'exact' })
        .eq('status', 'active')
        .range(offset, offset + limit - 1);

      if (category) {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (verified !== undefined) {
        query = query.eq('verified', verified);
      }

      // Sort options
      switch (sortBy) {
        case 'popular':
          query = query.order('follower_count', { ascending: false, nullsFirst: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'name':
          query = query.order('name', { ascending: true });
          break;
      }

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      const organizations = (data || []).map((org: any) => this.mapOrganization(org));
      const total = count || 0;

      return {
        success: true,
        data: {
          data: organizations,
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

  async getOrganization(organizationId: string): Promise<ApiResponse<Organization>> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select(`
          *,
          organization_stats(*),
          organization_follows(count)
        `)
        .eq('id', organizationId)
        .single();

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      // Check if current user follows this org
      const { data: { user } } = await this.supabase.auth.getUser();
      let isFollowing = false;

      if (user) {
        const { data: follow } = await this.supabase
          .from('organization_follows')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('user_id', user.id)
          .maybeSingle();
        isFollowing = !!follow;
      }

      return { success: true, data: this.mapOrganization(data, isFollowing) };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async getOrganizationBySlug(slug: string): Promise<ApiResponse<Organization>> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select(`
          *,
          organization_stats(*),
          organization_follows(count)
        `)
        .eq('slug', slug)
        .single();

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      // Check if current user follows this org
      const { data: { user } } = await this.supabase.auth.getUser();
      let isFollowing = false;

      if (user) {
        const { data: follow } = await this.supabase
          .from('organization_follows')
          .select('id')
          .eq('organization_id', data.id)
          .eq('user_id', user.id)
          .maybeSingle();
        isFollowing = !!follow;
      }

      return { success: true, data: this.mapOrganization(data, isFollowing) };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async followOrganization(organizationId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase
        .from('organization_follows')
        .insert({ organization_id: organizationId });

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async unfollowOrganization(organizationId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase
        .from('organization_follows')
        .delete()
        .eq('organization_id', organizationId);

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async getFollowedOrganizations(): Promise<ApiResponse<Organization[]>> {
    try {
      const { data, error } = await this.supabase
        .from('organization_follows')
        .select(`
          organization:organizations(
            *,
            organization_stats(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      const organizations = (data || [])
        .map((f: any) => f.organization)
        .filter(Boolean)
        .map((org: any) => this.mapOrganization(org, true));

      return { success: true, data: organizations };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  // ==================== Feed (Marketplace Mode) ====================

  async getFeed(options: {
    page?: number;
    limit?: number;
    filters?: FeedFilters;
  } = {}): Promise<ApiResponse<PaginatedResponse<Raffle>>> {
    try {
      const { page = 1, limit = 20, filters = {} } = options;
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('raffles')
        .select(`
          *,
          raffle_prizes(*),
          ticket_packages(*),
          organizations!inner(id, name, slug, logo_url, verified)
        `, { count: 'exact' })
        .eq('status', 'active')
        .range(offset, offset + limit - 1);

      // Filter by category (via organization)
      if (filters.category) {
        query = query.eq('organizations.category', filters.category);
      }

      // Filter by price range
      if (filters.priceRange?.min !== undefined) {
        query = query.gte('ticket_price', filters.priceRange.min);
      }
      if (filters.priceRange?.max !== undefined) {
        query = query.lte('ticket_price', filters.priceRange.max);
      }

      // Filter by followed organizations only
      if (filters.followedOnly) {
        const { data: follows } = await this.supabase
          .from('organization_follows')
          .select('organization_id');

        if (follows && follows.length > 0) {
          const orgIds = follows.map(f => f.organization_id);
          query = query.in('organizer_id', orgIds);
        } else {
          // No followed orgs, return empty
          return {
            success: true,
            data: {
              data: [],
              pagination: { page, limit, total: 0, totalPages: 0, hasMore: false },
            },
          };
        }
      }

      // Sorting
      switch (filters.sortBy) {
        case 'ending_soon':
          query = query.order('end_date', { ascending: true });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'price_low':
          query = query.order('ticket_price', { ascending: true });
          break;
        case 'price_high':
          query = query.order('ticket_price', { ascending: false });
          break;
        case 'trending':
        default:
          query = query.order('sold_tickets', { ascending: false });
          break;
      }

      // Filter ending soon (within 24 hours)
      if (filters.status === 'ending_soon') {
        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);
        query = query.lt('end_date', tomorrow.toISOString());
      }

      // Filter new (created in last 7 days)
      if (filters.status === 'new') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      }

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      const raffles = (data || []).map((r: any) => this.mapRaffleWithOrg(r));
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

  async getOrganizationRaffles(organizationId: string, options: {
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
        .eq('organizer_id', organizationId)
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

  async getRecentWinners(options: {
    limit?: number;
    organizationId?: string;
  } = {}): Promise<ApiResponse<WinnerAnnouncement[]>> {
    try {
      const { limit = 10, organizationId } = options;

      let query = this.supabase
        .from('raffle_winners')
        .select(`
          *,
          raffles!inner(id, title, organizer_id),
          raffle_prizes(title),
          profiles(full_name, avatar_url),
          organizations!raffles(name, slug)
        `)
        .order('announced_at', { ascending: false })
        .limit(limit);

      if (organizationId) {
        query = query.eq('raffles.organizer_id', organizationId);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      const winners = (data || []).map((w: any) => this.mapWinnerAnnouncement(w));

      return { success: true, data: winners };
    } catch (e) {
      return { success: false, error: this.mapError(e) };
    }
  }

  async searchRaffles(query: string, options: {
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<PaginatedResponse<Raffle>>> {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.supabase
        .from('raffles')
        .select(`
          *,
          raffle_prizes(*),
          ticket_packages(*),
          organizations!inner(id, name, slug, logo_url, verified)
        `, { count: 'exact' })
        .eq('status', 'active')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('sold_tickets', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { success: false, error: this.mapError(error) };
      }

      const raffles = (data || []).map((r: any) => this.mapRaffleWithOrg(r));
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

  private mapNotification(data: any): Notification {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      body: data.body || data.message || '',
      imageUrl: data.image_url,
      read: data.read || false,
      actionUrl: data.action_url || data.link,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      readAt: data.read_at ? new Date(data.read_at) : undefined,
    };
  }

  private mapOrganization(data: any, isFollowing = false): Organization {
    const stats = data.organization_stats?.[0] || data.organization_stats || {};
    const followCount = data.organization_follows?.[0]?.count || data.follower_count || 0;

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      logoUrl: data.logo_url,
      coverImageUrl: data.cover_image_url,
      verified: data.verified || false,
      category: data.category,
      location: data.location,
      socialLinks: data.social_links || {},
      stats: {
        totalRaffles: stats.total_raffles || 0,
        activeRaffles: stats.active_raffles || 0,
        completedRaffles: stats.completed_raffles || 0,
        totalParticipants: stats.total_participants || 0,
        rating: stats.rating,
        reviewCount: stats.review_count,
      },
      isFollowing,
      followerCount: followCount,
      createdAt: new Date(data.created_at),
    };
  }

  private mapRaffleWithOrg(data: any): Raffle {
    const raffle = this.mapRaffle(data);
    // Add organization info to metadata
    if (data.organizations) {
      raffle.metadata = {
        ...raffle.metadata,
        organization: {
          id: data.organizations.id,
          name: data.organizations.name,
          slug: data.organizations.slug,
          logoUrl: data.organizations.logo_url,
          verified: data.organizations.verified,
        },
      };
    }
    return raffle;
  }

  private mapWinnerAnnouncement(data: any): WinnerAnnouncement {
    return {
      id: data.id,
      raffleId: data.raffle_id,
      raffleTitle: data.raffles?.title || '',
      prizeTitle: data.raffle_prizes?.title || '',
      winnerName: data.profiles?.full_name || 'Ganador',
      winnerAvatar: data.profiles?.avatar_url,
      ticketNumber: data.ticket_number,
      organizationName: data.organizations?.name || '',
      organizationSlug: data.organizations?.slug || '',
      announcedAt: new Date(data.announced_at || data.created_at),
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
