export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string | null
          raffle_id: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          raffle_id?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          raffle_id?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "mv_top_raffles"
            referencedColumns: ["raffle_id"]
          },
          {
            foreignKeyName: "analytics_events_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "public_raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          user_agent: string | null
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          user_agent?: string | null
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          user_agent?: string | null
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          duration: string | null
          duration_in_months: number | null
          first_time_only: boolean | null
          id: string
          max_uses: number | null
          min_purchase: number | null
          name: string
          organization_id: string
          raffle_id: string | null
          stripe_coupon_id: string | null
          stripe_promotion_code_id: string | null
          updated_at: string | null
          valid_from: string | null
          valid_tiers: string[] | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value: number
          duration?: string | null
          duration_in_months?: number | null
          first_time_only?: boolean | null
          id?: string
          max_uses?: number | null
          min_purchase?: number | null
          name: string
          organization_id: string
          raffle_id?: string | null
          stripe_coupon_id?: string | null
          stripe_promotion_code_id?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_tiers?: string[] | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          duration?: string | null
          duration_in_months?: number | null
          first_time_only?: boolean | null
          id?: string
          max_uses?: number | null
          min_purchase?: number | null
          name?: string
          organization_id?: string
          raffle_id?: string | null
          stripe_coupon_id?: string | null
          stripe_promotion_code_id?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_tiers?: string[] | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "mv_top_raffles"
            referencedColumns: ["raffle_id"]
          },
          {
            foreignKeyName: "coupons_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "public_raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          is_primary: boolean | null
          organization_id: string
          ssl_status: string | null
          updated_at: string | null
          verification_method: string | null
          verification_token: string | null
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          is_primary?: boolean | null
          organization_id: string
          ssl_status?: string | null
          updated_at?: string | null
          verification_method?: string | null
          verification_token?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          is_primary?: boolean | null
          organization_id?: string
          ssl_status?: string | null
          updated_at?: string | null
          verification_method?: string | null
          verification_token?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dunning_config: {
        Row: {
          cancellation_after_days: number | null
          created_at: string | null
          email_schedule: Json | null
          grace_period_days: number | null
          id: string
          retry_schedule: Json | null
          subscription_tier: string
          suspension_after_days: number | null
        }
        Insert: {
          cancellation_after_days?: number | null
          created_at?: string | null
          email_schedule?: Json | null
          grace_period_days?: number | null
          id?: string
          retry_schedule?: Json | null
          subscription_tier: string
          suspension_after_days?: number | null
        }
        Update: {
          cancellation_after_days?: number | null
          created_at?: string | null
          email_schedule?: Json | null
          grace_period_days?: number | null
          id?: string
          retry_schedule?: Json | null
          subscription_tier?: string
          suspension_after_days?: number | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          payment_approved: boolean | null
          payment_pending: boolean | null
          push_enabled: boolean | null
          raffle_completed: boolean | null
          raffle_ending_soon: boolean | null
          system_notifications: boolean | null
          ticket_sold: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          payment_approved?: boolean | null
          payment_pending?: boolean | null
          push_enabled?: boolean | null
          raffle_completed?: boolean | null
          raffle_ending_soon?: boolean | null
          system_notifications?: boolean | null
          ticket_sold?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          payment_approved?: boolean | null
          payment_pending?: boolean | null
          push_enabled?: boolean | null
          raffle_completed?: boolean | null
          raffle_ending_soon?: boolean | null
          system_notifications?: boolean | null
          ticket_sold?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          metadata: Json | null
          organization_id: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          organization_id?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          organization_id?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          buyer_city: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_phone: string | null
          canceled_at: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          lucky_indices: number[] | null
          order_total: number | null
          organization_id: string
          payment_method: string | null
          payment_proof_uploaded_at: string | null
          payment_proof_url: string | null
          raffle_id: string
          reference_code: string
          reserved_at: string | null
          reserved_until: string | null
          sold_at: string | null
          status: string
          ticket_count: number
          ticket_ranges: Json
          updated_at: string | null
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_city?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          canceled_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          lucky_indices?: number[] | null
          order_total?: number | null
          organization_id: string
          payment_method?: string | null
          payment_proof_uploaded_at?: string | null
          payment_proof_url?: string | null
          raffle_id: string
          reference_code: string
          reserved_at?: string | null
          reserved_until?: string | null
          sold_at?: string | null
          status?: string
          ticket_count: number
          ticket_ranges?: Json
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_city?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          canceled_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          lucky_indices?: number[] | null
          order_total?: number | null
          organization_id?: string
          payment_method?: string | null
          payment_proof_uploaded_at?: string | null
          payment_proof_url?: string | null
          raffle_id?: string
          reference_code?: string
          reserved_at?: string | null
          reserved_until?: string | null
          sold_at?: string | null
          status?: string
          ticket_count?: number
          ticket_ranges?: Json
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "mv_top_raffles"
            referencedColumns: ["raffle_id"]
          },
          {
            foreignKeyName: "orders_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "public_raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          billing_address: Json | null
          billing_currency: string | null
          brand_color: string | null
          cancel_at_period_end: boolean | null
          city: string | null
          country_code: string | null
          cover_image_url: string | null
          cover_media: Json | null
          created_at: string | null
          currency_code: string | null
          current_period_end: string | null
          custom_css: string | null
          description: string | null
          email: string
          emails: string[] | null
          facebook_url: string | null
          favicon_url: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          max_active_raffles: number | null
          max_tickets_per_raffle: number | null
          meta_description: string | null
          meta_title: string | null
          name: string
          onboarding_completed: boolean | null
          phone: string | null
          phones: string[] | null
          powered_by_visible: boolean | null
          slug: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_period:
            | Database["public"]["Enums"]["subscription_period"]
            | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          suspended: boolean | null
          tax_exempt: boolean | null
          tax_id: string | null
          tax_id_type: string | null
          templates_available: number | null
          tiktok_url: string | null
          timezone: string | null
          total_raffles_completed: number | null
          tracking_custom_scripts: string | null
          tracking_enabled: boolean | null
          tracking_ga4_id: string | null
          tracking_gtm_id: string | null
          tracking_meta_pixel_id: string | null
          tracking_tiktok_pixel_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          verified: boolean | null
          website_url: string | null
          whatsapp_number: string | null
          whatsapp_numbers: string[] | null
          white_label_enabled: boolean | null
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          billing_address?: Json | null
          billing_currency?: string | null
          brand_color?: string | null
          cancel_at_period_end?: boolean | null
          city?: string | null
          country_code?: string | null
          cover_image_url?: string | null
          cover_media?: Json | null
          created_at?: string | null
          currency_code?: string | null
          current_period_end?: string | null
          custom_css?: string | null
          description?: string | null
          email: string
          emails?: string[] | null
          facebook_url?: string | null
          favicon_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          max_active_raffles?: number | null
          max_tickets_per_raffle?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          onboarding_completed?: boolean | null
          phone?: string | null
          phones?: string[] | null
          powered_by_visible?: boolean | null
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_period?:
            | Database["public"]["Enums"]["subscription_period"]
            | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          suspended?: boolean | null
          tax_exempt?: boolean | null
          tax_id?: string | null
          tax_id_type?: string | null
          templates_available?: number | null
          tiktok_url?: string | null
          timezone?: string | null
          total_raffles_completed?: number | null
          tracking_custom_scripts?: string | null
          tracking_enabled?: boolean | null
          tracking_ga4_id?: string | null
          tracking_gtm_id?: string | null
          tracking_meta_pixel_id?: string | null
          tracking_tiktok_pixel_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          verified?: boolean | null
          website_url?: string | null
          whatsapp_number?: string | null
          whatsapp_numbers?: string[] | null
          white_label_enabled?: boolean | null
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          billing_address?: Json | null
          billing_currency?: string | null
          brand_color?: string | null
          cancel_at_period_end?: boolean | null
          city?: string | null
          country_code?: string | null
          cover_image_url?: string | null
          cover_media?: Json | null
          created_at?: string | null
          currency_code?: string | null
          current_period_end?: string | null
          custom_css?: string | null
          description?: string | null
          email?: string
          emails?: string[] | null
          facebook_url?: string | null
          favicon_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          max_active_raffles?: number | null
          max_tickets_per_raffle?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          phones?: string[] | null
          powered_by_visible?: boolean | null
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_period?:
            | Database["public"]["Enums"]["subscription_period"]
            | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          suspended?: boolean | null
          tax_exempt?: boolean | null
          tax_id?: string | null
          tax_id_type?: string | null
          templates_available?: number | null
          tiktok_url?: string | null
          timezone?: string | null
          total_raffles_completed?: number | null
          tracking_custom_scripts?: string | null
          tracking_enabled?: boolean | null
          tracking_ga4_id?: string | null
          tracking_gtm_id?: string | null
          tracking_meta_pixel_id?: string | null
          tracking_tiktok_pixel_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          verified?: boolean | null
          website_url?: string | null
          whatsapp_number?: string | null
          whatsapp_numbers?: string[] | null
          white_label_enabled?: boolean | null
          years_experience?: number | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_name: string | null
          bank_select_value: string | null
          card_number: string | null
          clabe: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          custom_identifier: string | null
          custom_identifier_label: string | null
          custom_label: string | null
          custom_qr_url: string | null
          display_order: number | null
          enabled: boolean | null
          group_id: string | null
          id: string
          instructions: string | null
          location: string | null
          name: string
          organization_id: string
          payment_link: string | null
          paypal_email: string | null
          paypal_link: string | null
          schedule: string | null
          subtype: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          bank_select_value?: string | null
          card_number?: string | null
          clabe?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          custom_identifier?: string | null
          custom_identifier_label?: string | null
          custom_label?: string | null
          custom_qr_url?: string | null
          display_order?: number | null
          enabled?: boolean | null
          group_id?: string | null
          id?: string
          instructions?: string | null
          location?: string | null
          name: string
          organization_id: string
          payment_link?: string | null
          paypal_email?: string | null
          paypal_link?: string | null
          schedule?: string | null
          subtype?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          bank_select_value?: string | null
          card_number?: string | null
          clabe?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          custom_identifier?: string | null
          custom_identifier_label?: string | null
          custom_label?: string | null
          custom_qr_url?: string | null
          display_order?: number | null
          enabled?: boolean | null
          group_id?: string | null
          id?: string
          instructions?: string | null
          location?: string | null
          name?: string
          organization_id?: string
          payment_link?: string | null
          paypal_email?: string | null
          paypal_link?: string | null
          schedule?: string | null
          subtype?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_invite_at: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          invited_by: string | null
          last_login: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_invite_at?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          invited_by?: string | null
          last_login?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_invite_at?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          last_login?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_custom_numbers: {
        Row: {
          created_at: string | null
          custom_number: string
          id: string
          raffle_id: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          custom_number: string
          id?: string
          raffle_id: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          custom_number?: string
          id?: string
          raffle_id?: string
          ticket_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "raffle_custom_numbers_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "mv_top_raffles"
            referencedColumns: ["raffle_id"]
          },
          {
            foreignKeyName: "raffle_custom_numbers_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "public_raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_custom_numbers_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_draws: {
        Row: {
          announced: boolean | null
          announced_at: string | null
          created_at: string | null
          created_by: string | null
          draw_metadata: Json | null
          draw_method: string
          draw_type: string
          drawn_at: string | null
          id: string
          prize_id: string
          prize_name: string
          prize_value: number | null
          raffle_id: string
          scheduled_date: string | null
          ticket_id: string | null
          ticket_number: string
          winner_city: string | null
          winner_email: string | null
          winner_name: string | null
          winner_notified: boolean | null
          winner_notified_at: string | null
          winner_phone: string | null
        }
        Insert: {
          announced?: boolean | null
          announced_at?: string | null
          created_at?: string | null
          created_by?: string | null
          draw_metadata?: Json | null
          draw_method: string
          draw_type?: string
          drawn_at?: string | null
          id?: string
          prize_id: string
          prize_name: string
          prize_value?: number | null
          raffle_id: string
          scheduled_date?: string | null
          ticket_id?: string | null
          ticket_number: string
          winner_city?: string | null
          winner_email?: string | null
          winner_name?: string | null
          winner_notified?: boolean | null
          winner_notified_at?: string | null
          winner_phone?: string | null
        }
        Update: {
          announced?: boolean | null
          announced_at?: string | null
          created_at?: string | null
          created_by?: string | null
          draw_metadata?: Json | null
          draw_method?: string
          draw_type?: string
          drawn_at?: string | null
          id?: string
          prize_id?: string
          prize_name?: string
          prize_value?: number | null
          raffle_id?: string
          scheduled_date?: string | null
          ticket_id?: string | null
          ticket_number?: string
          winner_city?: string | null
          winner_email?: string | null
          winner_name?: string | null
          winner_notified?: boolean | null
          winner_notified_at?: string | null
          winner_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raffle_draws_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "mv_top_raffles"
            referencedColumns: ["raffle_id"]
          },
          {
            foreignKeyName: "raffle_draws_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "public_raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_draws_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_packages: {
        Row: {
          created_at: string | null
          discount_percent: number | null
          display_order: number | null
          id: string
          label: string | null
          price: number
          quantity: number
          raffle_id: string
        }
        Insert: {
          created_at?: string | null
          discount_percent?: number | null
          display_order?: number | null
          id?: string
          label?: string | null
          price: number
          quantity: number
          raffle_id: string
        }
        Update: {
          created_at?: string | null
          discount_percent?: number | null
          display_order?: number | null
          id?: string
          label?: string | null
          price?: number
          quantity?: number
          raffle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_packages_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "mv_top_raffles"
            referencedColumns: ["raffle_id"]
          },
          {
            foreignKeyName: "raffle_packages_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "public_raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_packages_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffles: {
        Row: {
          allow_individual_sale: boolean | null
          archived_at: string | null
          auto_publish_result: boolean | null
          category: string | null
          close_sale_hours_before: number | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          customization: Json | null
          description: string | null
          draw_date: string | null
          draw_method: Database["public"]["Enums"]["draw_method"] | null
          id: string
          livestream_url: string | null
          lottery_digits: number | null
          lottery_draw_number: string | null
          lucky_numbers_config: Json | null
          lucky_numbers_enabled: boolean | null
          max_tickets_per_person: number | null
          max_tickets_per_purchase: number | null
          min_tickets_per_purchase: number | null
          numbering_config: Json | null
          organization_id: string
          prize_display_mode: string | null
          prize_images: string[] | null
          prize_name: string
          prize_terms: string | null
          prize_value: number | null
          prize_video_url: string | null
          prizes: Json | null
          reservation_time_minutes: number | null
          search_vector: unknown
          slug: string
          start_date: string | null
          status: Database["public"]["Enums"]["raffle_status"] | null
          template_id: string | null
          ticket_number_format:
            | Database["public"]["Enums"]["ticket_number_format"]
            | null
          ticket_price: number
          title: string
          total_tickets: number
          updated_at: string | null
          winner_announced: boolean | null
          winner_data: Json | null
          winner_ticket_number: string | null
        }
        Insert: {
          allow_individual_sale?: boolean | null
          archived_at?: string | null
          auto_publish_result?: boolean | null
          category?: string | null
          close_sale_hours_before?: number | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customization?: Json | null
          description?: string | null
          draw_date?: string | null
          draw_method?: Database["public"]["Enums"]["draw_method"] | null
          id?: string
          livestream_url?: string | null
          lottery_digits?: number | null
          lottery_draw_number?: string | null
          lucky_numbers_config?: Json | null
          lucky_numbers_enabled?: boolean | null
          max_tickets_per_person?: number | null
          max_tickets_per_purchase?: number | null
          min_tickets_per_purchase?: number | null
          numbering_config?: Json | null
          organization_id: string
          prize_display_mode?: string | null
          prize_images?: string[] | null
          prize_name: string
          prize_terms?: string | null
          prize_value?: number | null
          prize_video_url?: string | null
          prizes?: Json | null
          reservation_time_minutes?: number | null
          search_vector?: unknown
          slug: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["raffle_status"] | null
          template_id?: string | null
          ticket_number_format?:
            | Database["public"]["Enums"]["ticket_number_format"]
            | null
          ticket_price: number
          title: string
          total_tickets: number
          updated_at?: string | null
          winner_announced?: boolean | null
          winner_data?: Json | null
          winner_ticket_number?: string | null
        }
        Update: {
          allow_individual_sale?: boolean | null
          archived_at?: string | null
          auto_publish_result?: boolean | null
          category?: string | null
          close_sale_hours_before?: number | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customization?: Json | null
          description?: string | null
          draw_date?: string | null
          draw_method?: Database["public"]["Enums"]["draw_method"] | null
          id?: string
          livestream_url?: string | null
          lottery_digits?: number | null
          lottery_draw_number?: string | null
          lucky_numbers_config?: Json | null
          lucky_numbers_enabled?: boolean | null
          max_tickets_per_person?: number | null
          max_tickets_per_purchase?: number | null
          min_tickets_per_purchase?: number | null
          numbering_config?: Json | null
          organization_id?: string
          prize_display_mode?: string | null
          prize_images?: string[] | null
          prize_name?: string
          prize_terms?: string | null
          prize_value?: number | null
          prize_video_url?: string | null
          prizes?: Json | null
          reservation_time_minutes?: number | null
          search_vector?: unknown
          slug?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["raffle_status"] | null
          template_id?: string | null
          ticket_number_format?:
            | Database["public"]["Enums"]["ticket_number_format"]
            | null
          ticket_price?: number
          title?: string
          total_tickets?: number
          updated_at?: string | null
          winner_announced?: boolean | null
          winner_data?: Json | null
          winner_ticket_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raffles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_buyer_links: {
        Row: {
          buyer_email: string
          buyer_phone: string | null
          created_at: string | null
          id: string
          notify_announcements: boolean | null
          notify_draw_reminder: boolean | null
          notify_payment_approved: boolean | null
          notify_payment_rejected: boolean | null
          notify_payment_reminder: boolean | null
          notify_reservation: boolean | null
          notify_winner: boolean | null
          telegram_chat_id: string
          telegram_username: string | null
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          buyer_email: string
          buyer_phone?: string | null
          created_at?: string | null
          id?: string
          notify_announcements?: boolean | null
          notify_draw_reminder?: boolean | null
          notify_payment_approved?: boolean | null
          notify_payment_rejected?: boolean | null
          notify_payment_reminder?: boolean | null
          notify_reservation?: boolean | null
          notify_winner?: boolean | null
          telegram_chat_id: string
          telegram_username?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          buyer_email?: string
          buyer_phone?: string | null
          created_at?: string | null
          id?: string
          notify_announcements?: boolean | null
          notify_draw_reminder?: boolean | null
          notify_payment_approved?: boolean | null
          notify_payment_rejected?: boolean | null
          notify_payment_reminder?: boolean | null
          notify_reservation?: boolean | null
          notify_winner?: boolean | null
          telegram_chat_id?: string
          telegram_username?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      telegram_connections: {
        Row: {
          created_at: string | null
          created_by: string | null
          daily_summary_hour: number | null
          display_name: string | null
          id: string
          link_code: string | null
          link_code_expires_at: string | null
          notify_daily_summary: boolean | null
          notify_payment_approved: boolean | null
          notify_payment_proof: boolean | null
          notify_payment_rejected: boolean | null
          notify_raffle_ending: boolean | null
          notify_reservation_expired: boolean | null
          notify_ticket_reserved: boolean | null
          notify_winner_selected: boolean | null
          organization_id: string
          telegram_chat_id: string | null
          telegram_username: string | null
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          daily_summary_hour?: number | null
          display_name?: string | null
          id?: string
          link_code?: string | null
          link_code_expires_at?: string | null
          notify_daily_summary?: boolean | null
          notify_payment_approved?: boolean | null
          notify_payment_proof?: boolean | null
          notify_payment_rejected?: boolean | null
          notify_raffle_ending?: boolean | null
          notify_reservation_expired?: boolean | null
          notify_ticket_reserved?: boolean | null
          notify_winner_selected?: boolean | null
          organization_id: string
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          daily_summary_hour?: number | null
          display_name?: string | null
          id?: string
          link_code?: string | null
          link_code_expires_at?: string | null
          notify_daily_summary?: boolean | null
          notify_payment_approved?: boolean | null
          notify_payment_proof?: boolean | null
          notify_payment_rejected?: boolean | null
          notify_raffle_ending?: boolean | null
          notify_reservation_expired?: boolean | null
          notify_ticket_reserved?: boolean | null
          notify_winner_selected?: boolean | null
          organization_id?: string
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_order_messages: {
        Row: {
          created_at: string | null
          id: string
          message_id: number
          order_id: string
          telegram_chat_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: number
          order_id: string
          telegram_chat_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: number
          order_id?: string
          telegram_chat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptance: {
        Row: {
          accepted_at: string
          id: string
          ip_address: unknown
          organization_id: string | null
          privacy_version: string
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          privacy_version: string
          terms_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          privacy_version?: string
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_reservation_status: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_trs_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_trs_raffle"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "mv_top_raffles"
            referencedColumns: ["raffle_id"]
          },
          {
            foreignKeyName: "fk_trs_raffle"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "public_raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_trs_raffle"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_reservation_status_p0: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p1: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p10: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p11: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p12: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p13: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p14: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p15: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p16: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p17: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p18: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p19: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p2: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p20: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p21: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p22: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p23: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p24: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p25: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p26: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p27: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p28: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p29: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p3: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p30: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p31: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p4: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p5: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p6: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p7: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p8: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      ticket_reservation_status_p9: {
        Row: {
          created_at: string | null
          order_id: string
          raffle_id: string
          reserved_until: string | null
          status: string
          ticket_index: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          raffle_id: string
          reserved_until?: string | null
          status: string
          ticket_index: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          raffle_id?: string
          reserved_until?: string | null
          status?: string
          ticket_index?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cron_job_status: {
        Row: {
          active: boolean | null
          job_type: string | null
          jobid: number | null
          jobname: string | null
          last_run: string | null
          last_status: string | null
          schedule: string | null
        }
        Insert: {
          active?: boolean | null
          job_type?: never
          jobid?: number | null
          jobname?: string | null
          last_run?: never
          last_status?: never
          schedule?: string | null
        }
        Update: {
          active?: boolean | null
          job_type?: never
          jobid?: number | null
          jobname?: string | null
          last_run?: never
          last_status?: never
          schedule?: string | null
        }
        Relationships: []
      }
      mv_admin_stats: {
        Row: {
          active_raffles: number | null
          active_subscriptions: number | null
          canceled_subscriptions: number | null
          completed_raffles: number | null
          refreshed_at: string | null
          tier_basic: number | null
          tier_enterprise: number | null
          tier_none: number | null
          tier_premium: number | null
          tier_pro: number | null
          total_organizations: number | null
          total_raffles: number | null
          total_revenue: number | null
          total_tickets_sold: number | null
          total_users: number | null
          trial_subscriptions: number | null
        }
        Relationships: []
      }
      mv_daily_stats: {
        Row: {
          orders_count: number | null
          revenue: number | null
          stat_date: string | null
          tickets_sold: number | null
        }
        Relationships: []
      }
      mv_top_raffles: {
        Row: {
          created_at: string | null
          organization_id: string | null
          organization_name: string | null
          raffle_id: string | null
          revenue: number | null
          status: string | null
          tickets_sold: number | null
          title: string | null
          total_tickets: number | null
        }
        Relationships: [
          {
            foreignKeyName: "raffles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_custom_domains: {
        Row: {
          created_at: string | null
          domain: string | null
          id: string | null
          is_primary: boolean | null
          organization_id: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          id?: string | null
          is_primary?: boolean | null
          organization_id?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          id?: string | null
          is_primary?: boolean | null
          organization_id?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_raffles: {
        Row: {
          allow_individual_sale: boolean | null
          category: string | null
          close_sale_hours_before: number | null
          created_at: string | null
          currency_code: string | null
          customization: Json | null
          description: string | null
          draw_date: string | null
          draw_method: Database["public"]["Enums"]["draw_method"] | null
          id: string | null
          livestream_url: string | null
          lottery_digits: number | null
          lottery_draw_number: string | null
          lucky_numbers_config: Json | null
          lucky_numbers_enabled: boolean | null
          max_tickets_per_person: number | null
          max_tickets_per_purchase: number | null
          min_tickets_per_purchase: number | null
          numbering_config: Json | null
          organization_id: string | null
          prize_display_mode: string | null
          prize_images: string[] | null
          prize_name: string | null
          prize_terms: string | null
          prize_value: number | null
          prize_video_url: string | null
          prizes: Json | null
          reservation_time_minutes: number | null
          slug: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["raffle_status"] | null
          template_id: string | null
          ticket_price: number | null
          title: string | null
          total_tickets: number | null
          updated_at: string | null
          winner_announced: boolean | null
          winner_data: Json | null
          winner_ticket_number: string | null
        }
        Insert: {
          allow_individual_sale?: boolean | null
          category?: string | null
          close_sale_hours_before?: number | null
          created_at?: string | null
          currency_code?: string | null
          customization?: Json | null
          description?: string | null
          draw_date?: string | null
          draw_method?: Database["public"]["Enums"]["draw_method"] | null
          id?: string | null
          livestream_url?: string | null
          lottery_digits?: number | null
          lottery_draw_number?: string | null
          lucky_numbers_config?: Json | null
          lucky_numbers_enabled?: boolean | null
          max_tickets_per_person?: number | null
          max_tickets_per_purchase?: number | null
          min_tickets_per_purchase?: number | null
          numbering_config?: Json | null
          organization_id?: string | null
          prize_display_mode?: string | null
          prize_images?: string[] | null
          prize_name?: string | null
          prize_terms?: string | null
          prize_value?: number | null
          prize_video_url?: string | null
          prizes?: Json | null
          reservation_time_minutes?: number | null
          slug?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["raffle_status"] | null
          template_id?: string | null
          ticket_price?: number | null
          title?: string | null
          total_tickets?: number | null
          updated_at?: string | null
          winner_announced?: boolean | null
          winner_data?: Json | null
          winner_ticket_number?: string | null
        }
        Update: {
          allow_individual_sale?: boolean | null
          category?: string | null
          close_sale_hours_before?: number | null
          created_at?: string | null
          currency_code?: string | null
          customization?: Json | null
          description?: string | null
          draw_date?: string | null
          draw_method?: Database["public"]["Enums"]["draw_method"] | null
          id?: string | null
          livestream_url?: string | null
          lottery_digits?: number | null
          lottery_draw_number?: string | null
          lucky_numbers_config?: Json | null
          lucky_numbers_enabled?: boolean | null
          max_tickets_per_person?: number | null
          max_tickets_per_purchase?: number | null
          min_tickets_per_purchase?: number | null
          numbering_config?: Json | null
          organization_id?: string | null
          prize_display_mode?: string | null
          prize_images?: string[] | null
          prize_name?: string | null
          prize_terms?: string | null
          prize_value?: number | null
          prize_video_url?: string | null
          prizes?: Json | null
          reservation_time_minutes?: number | null
          slug?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["raffle_status"] | null
          template_id?: string | null
          ticket_price?: number | null
          title?: string | null
          total_tickets?: number | null
          updated_at?: string | null
          winner_announced?: boolean | null
          winner_data?: Json | null
          winner_ticket_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raffles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_order: {
        Args: { p_approved_by?: string; p_order_id: string }
        Returns: {
          error_message: string
          success: boolean
          ticket_count: number
        }[]
      }
      archive_old_raffles: { Args: { days_old?: number }; Returns: number }
      atomic_reserve_tickets: {
        Args: {
          p_buyer_city?: string
          p_buyer_email: string
          p_buyer_name: string
          p_buyer_phone?: string
          p_is_lucky_numbers?: boolean
          p_order_total?: number
          p_raffle_id: string
          p_reservation_minutes?: number
          p_ticket_indices: number[]
        }
        Returns: {
          conflict_indices: number[]
          error_message: string
          lucky_indices: number[]
          order_id: string
          reference_code: string
          reserved_until: string
          success: boolean
          ticket_count: number
          ticket_ranges: Json
        }[]
      }
      atomic_reserve_tickets_v2: {
        Args: {
          p_buyer_city?: string
          p_buyer_email: string
          p_buyer_name: string
          p_buyer_phone?: string
          p_is_lucky_numbers?: boolean
          p_order_total?: number
          p_raffle_id: string
          p_reservation_minutes?: number
          p_ticket_indices: number[]
        }
        Returns: {
          conflict_indices: number[]
          error_message: string
          order_id: string
          reference_code: string
          reserved_indices: number[]
          reserved_until: string
          success: boolean
          ticket_count: number
        }[]
      }
      calculate_churn_rate: {
        Args: { p_month?: string }
        Returns: {
          churn_rate: number
          churned_subscribers: number
          month: string
          starting_subscribers: number
        }[]
      }
      can_have_custom_domains: { Args: { org_id: string }; Returns: boolean }
      cancel_order_and_release_v2: {
        Args: { p_order_id: string }
        Returns: number
      }
      check_indices_available: {
        Args: { p_indices: number[]; p_raffle_id: string }
        Returns: {
          available: boolean
          conflicting_indices: number[]
        }[]
      }
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_key_prefix: string
          p_max_requests: number
          p_window_ms: number
        }
        Returns: Json
      }
      check_ticket_availability: {
        Args: { p_raffle_id: string; p_ticket_index: number }
        Returns: {
          buyer_name: string
          is_available: boolean
          order_id: string
          status: string
        }[]
      }
      check_tickets_available_v2: {
        Args: { p_raffle_id: string; p_ticket_indices: number[] }
        Returns: {
          available: boolean
          unavailable_indices: number[]
        }[]
      }
      cleanup_expired_reservations_batch: {
        Args: { p_batch_size?: number; p_max_batches?: number }
        Returns: {
          batches_processed: number
          total_released: number
          total_tickets_freed: number
          unique_raffles_affected: number
        }[]
      }
      cleanup_expired_tickets_batch: {
        Args: {
          p_auto_scale?: boolean
          p_batch_size?: number
          p_max_batches?: number
        }
        Returns: {
          affected_raffles: string[]
          batches_processed: number
          execution_time_ms: number
          total_released: number
        }[]
      }
      cleanup_rate_limit_entries: { Args: never; Returns: undefined }
      compress_ticket_indices: { Args: { p_indices: number[] }; Returns: Json }
      confirm_order_sale_v2: { Args: { p_order_id: string }; Returns: boolean }
      expand_order_to_indices: {
        Args: { p_lucky_indices: number[]; p_ticket_ranges: Json }
        Returns: {
          ticket_index: number
        }[]
      }
      format_virtual_ticket: {
        Args: {
          p_numbering_config: Json
          p_ticket_index: number
          p_total_tickets: number
        }
        Returns: string
      }
      generate_reference_code: { Args: never; Returns: string }
      get_admin_overview_stats: {
        Args: { p_from_date?: string; p_to_date?: string }
        Returns: Json
      }
      get_available_blocks: {
        Args: { p_raffle_id: string }
        Returns: {
          available_count: number
          block_start: number
        }[]
      }
      get_buyers_cursor: {
        Args: {
          p_cursor_created_at?: string
          p_cursor_id?: string
          p_limit?: number
          p_raffle_id: string
          p_search?: string
          p_status?: string
        }
        Returns: {
          buyer_city: string
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          created_at: string
          has_more: boolean
          id: string
          order_total: number
          payment_method: string
          payment_proof_url: string
          reference_code: string
          reserved_at: string
          sold_at: string
          status: string
          ticket_count: number
        }[]
      }
      get_buyers_paginated:
        | {
            Args: {
              p_page?: number
              p_page_size?: number
              p_raffle_id: string
              p_search?: string
              p_status_filter?: string
            }
            Returns: {
              buyer_city: string
              buyer_email: string
              buyer_name: string
              buyer_phone: string
              order_id: string
              payment_method: string
              payment_proof_url: string
              reference_code: string
              reserved_at: string
              sold_at: string
              status: string
              ticket_count: number
              ticket_numbers: string[]
              total_amount: number
            }[]
          }
        | {
            Args: {
              p_city?: string
              p_page?: number
              p_page_size?: number
              p_raffle_id: string
              p_search?: string
              p_status?: string
            }
            Returns: {
              approved_at: string
              approved_by: string
              approved_by_name: string
              buyer_city: string
              buyer_email: string
              buyer_name: string
              buyer_phone: string
              created_at: string
              lucky_indices: number[]
              order_id: string
              order_total: number
              payment_method: string
              payment_proof_uploaded_at: string
              payment_proof_url: string
              reference_code: string
              sold_at: string
              status: string
              ticket_count: number
              ticket_ranges: Json
            }[]
          }
      get_dashboard_charts: {
        Args: { p_end_date: string; p_org_id: string; p_start_date: string }
        Returns: Json
      }
      get_dashboard_stats: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          accepted_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_occupied_indices: { Args: { p_raffle_id: string }; Returns: number[] }
      get_order_by_reference: {
        Args: { p_reference_code: string }
        Returns: {
          approved_at: string
          buyer_city: string
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          created_at: string
          order_id: string
          order_total: number
          organization_slug: string
          raffle_id: string
          raffle_slug: string
          raffle_title: string
          status: string
          ticket_count: number
          ticket_numbers: string[]
        }[]
      }
      get_order_ticket_counts: {
        Args: { p_raffle_id: string }
        Returns: {
          available_count: number
          reserved_count: number
          sold_count: number
          total_tickets: number
        }[]
      }
      get_organization_by_domain: {
        Args: { p_domain: string }
        Returns: {
          brand_color: string
          custom_css: string
          favicon_url: string
          id: string
          logo_url: string
          meta_description: string
          meta_title: string
          name: string
          powered_by_visible: boolean
          slug: string
          white_label_enabled: boolean
        }[]
      }
      get_public_ticket_counts: {
        Args: { p_raffle_id: string }
        Returns: {
          available_count: number
          reserved_count: number
          sold_count: number
          total_count: number
        }[]
      }
      get_raffle_stats_list: {
        Args: { p_organization_id: string }
        Returns: {
          raffle_id: string
          tickets_reserved: number
          tickets_sold: number
          total_revenue: number
          unique_buyers: number
        }[]
      }
      get_secure_order_by_reference: {
        Args: { p_reference_code: string }
        Returns: {
          buyer_city: string
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          created_at: string
          id: string
          lucky_indices: number[]
          order_total: number
          payment_method: string
          payment_proof_url: string
          raffle_id: string
          reference_code: string
          reserved_until: string
          sold_at: string
          status: string
          ticket_count: number
          ticket_ranges: Json
        }[]
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_virtual_ticket_counts: {
        Args: { p_raffle_id: string }
        Returns: {
          available_count: number
          reserved_count: number
          sold_count: number
          total_count: number
        }[]
      }
      get_virtual_ticket_counts_v2: {
        Args: { p_raffle_id: string }
        Returns: {
          available_count: number
          pending_count: number
          reserved_count: number
          sold_count: number
          total_count: number
        }[]
      }
      get_virtual_tickets: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_raffle_id: string
          p_search?: string
          p_status_filter?: string
        }
        Returns: {
          buyer_city: string
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          order_id: string
          payment_reference: string
          reserved_at: string
          sold_at: string
          status: string
          ticket_index: number
          ticket_number: string
        }[]
      }
      get_virtual_tickets_by_range: {
        Args: {
          p_end_index: number
          p_raffle_id: string
          p_start_index: number
        }
        Returns: {
          buyer_city: string
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          order_id: string
          payment_proof_url: string
          reference_code: string
          reserved_until: string
          status: string
          ticket_index: number
          ticket_number: string
        }[]
      }
      get_virtual_tickets_v2: {
        Args: {
          p_page_number?: number
          p_page_size?: number
          p_raffle_id: string
        }
        Returns: {
          buyer_email: string
          buyer_name: string
          order_reference: string
          status: string
          ticket_index: number
          ticket_number: string
        }[]
      }
      has_org_access: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invoke_edge_function: {
        Args: { function_name: string; payload?: Json }
        Returns: undefined
      }
      is_index_in_order: {
        Args: {
          p_index: number
          p_lucky_indices: number[]
          p_ticket_ranges: Json
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_changes?: Json
          p_metadata?: Json
          p_organization_id?: string
          p_resource_id: string
          p_resource_name?: string
          p_resource_type: string
        }
        Returns: string
      }
      preview_ticket_numbers: {
        Args: {
          p_numbering_config: Json
          p_preview_count?: number
          p_total_tickets: number
        }
        Returns: {
          ticket_index: number
          ticket_number: string
        }[]
      }
      refresh_raffle_stats: {
        Args: never
        Returns: {
          duration_ms: number
          refreshed_at: string
        }[]
      }
      reject_order: {
        Args: { p_order_id: string }
        Returns: {
          error_message: string
          success: boolean
          ticket_count: number
        }[]
      }
      reserve_tickets_v2: {
        Args: {
          p_buyer_city?: string
          p_buyer_email: string
          p_buyer_name: string
          p_buyer_phone?: string
          p_is_lucky_numbers?: boolean
          p_order_total?: number
          p_raffle_id: string
          p_reservation_minutes?: number
          p_ticket_indices: number[]
        }
        Returns: {
          error_message: string
          order_id: string
          reference_code: string
          reserved_until: string
          success: boolean
          ticket_count: number
        }[]
      }
      search_public_tickets: {
        Args: { p_limit?: number; p_raffle_id: string; p_search: string }
        Returns: {
          buyer_name: string
          status: string
          ticket_index: number
          ticket_number: string
        }[]
      }
      search_public_tickets_paginated: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_raffle_id: string
          p_search: string
        }
        Returns: {
          buyer_name: string
          status: string
          ticket_index: number
          ticket_number: string
        }[]
      }
      set_primary_domain: {
        Args: { p_domain_id: string; p_organization_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_order_with_version: {
        Args: {
          p_approved_at?: string
          p_expected_version: number
          p_new_status?: string
          p_order_id: string
          p_payment_proof_url?: string
        }
        Returns: {
          current_data: Json
          error_message: string
          new_version: number
          success: boolean
        }[]
      }
      update_organization_from_webhook: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_org_id: string
          p_update_payload: Json
        }
        Returns: Json
      }
      validate_coupon_code: {
        Args: { p_code: string; p_raffle_id?: string; p_total?: number }
        Returns: Json
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member"
      draw_method: "lottery_nacional" | "manual" | "random_org"
      raffle_status: "draft" | "active" | "paused" | "completed" | "canceled"
      subscription_period: "monthly" | "annual"
      subscription_status:
        | "active"
        | "canceled"
        | "past_due"
        | "trial"
        | "incomplete"
      subscription_tier: "basic" | "pro" | "premium" | "enterprise"
      ticket_number_format: "sequential" | "prefixed" | "random"
      ticket_status: "available" | "reserved" | "sold" | "canceled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "member"],
      draw_method: ["lottery_nacional", "manual", "random_org"],
      raffle_status: ["draft", "active", "paused", "completed", "canceled"],
      subscription_period: ["monthly", "annual"],
      subscription_status: [
        "active",
        "canceled",
        "past_due",
        "trial",
        "incomplete",
      ],
      subscription_tier: ["basic", "pro", "premium", "enterprise"],
      ticket_number_format: ["sequential", "prefixed", "random"],
      ticket_status: ["available", "reserved", "sold", "canceled"],
    },
  },
} as const
