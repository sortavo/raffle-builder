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
      admin_simulations: {
        Row: {
          actions_taken: Json | null
          admin_user_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          mode: string
          simulated_org_id: string
          simulated_user_id: string
          started_at: string | null
        }
        Insert: {
          actions_taken?: Json | null
          admin_user_id: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          mode?: string
          simulated_org_id: string
          simulated_user_id: string
          started_at?: string | null
        }
        Update: {
          actions_taken?: Json | null
          admin_user_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          mode?: string
          simulated_org_id?: string
          simulated_user_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_simulations_simulated_org_id_fkey"
            columns: ["simulated_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
      buyers: {
        Row: {
          auth_user_id: string | null
          city: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          full_name: string
          id: string
          is_guest: boolean | null
          last_login: string | null
          phone: string | null
        }
        Insert: {
          auth_user_id?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          full_name: string
          id?: string
          is_guest?: boolean | null
          last_login?: string | null
          phone?: string | null
        }
        Update: {
          auth_user_id?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string
          id?: string
          is_guest?: boolean | null
          last_login?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          discount_applied: number
          id: string
          ticket_id: string | null
          used_at: string
          user_email: string | null
        }
        Insert: {
          coupon_id: string
          discount_applied: number
          id?: string
          ticket_id?: string | null
          used_at?: string
          user_email?: string | null
        }
        Update: {
          coupon_id?: string
          discount_applied?: number
          id?: string
          ticket_id?: string | null
          used_at?: string
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          min_purchase: number | null
          name: string
          organization_id: string
          raffle_id: string | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          max_uses?: number | null
          min_purchase?: number | null
          name: string
          organization_id: string
          raffle_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          min_purchase?: number | null
          name?: string
          organization_id?: string
          raffle_id?: string | null
          updated_at?: string
          valid_from?: string
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
      organizations: {
        Row: {
          address: string | null
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
          templates_available: number | null
          tiktok_url: string | null
          timezone: string | null
          total_raffles_completed: number | null
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
          templates_available?: number | null
          tiktok_url?: string | null
          timezone?: string | null
          total_raffles_completed?: number | null
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
          templates_available?: number | null
          tiktok_url?: string | null
          timezone?: string | null
          total_raffles_completed?: number | null
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
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
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
      stripe_events: {
        Row: {
          created_at: string | null
          event_id: string
          event_type: string
          id: string
          processed_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          event_type: string
          id?: string
          processed_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
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
          daily_summary_hour: number | null
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
          telegram_chat_id: string
          telegram_username: string | null
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_summary_hour?: number | null
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
          telegram_chat_id: string
          telegram_username?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_summary_hour?: number | null
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
          telegram_chat_id?: string
          telegram_username?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_generation_jobs: {
        Row: {
          batch_size: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_batch: number
          error_message: string | null
          generated_count: number
          id: string
          raffle_id: string
          started_at: string | null
          status: string
          ticket_format: string
          ticket_prefix: string | null
          total_batches: number
          total_tickets: number
        }
        Insert: {
          batch_size?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_batch?: number
          error_message?: string | null
          generated_count?: number
          id?: string
          raffle_id: string
          started_at?: string | null
          status?: string
          ticket_format?: string
          ticket_prefix?: string | null
          total_batches: number
          total_tickets: number
        }
        Update: {
          batch_size?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_batch?: number
          error_message?: string | null
          generated_count?: number
          id?: string
          raffle_id?: string
          started_at?: string | null
          status?: string
          ticket_format?: string
          ticket_prefix?: string | null
          total_batches?: number
          total_tickets?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_generation_jobs_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "public_raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_generation_jobs_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
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
          id: string
          notes: string | null
          order_total: number | null
          payment_method: string | null
          payment_proof_url: string | null
          payment_reference: string | null
          raffle_id: string
          reserved_at: string | null
          reserved_until: string | null
          sold_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          ticket_index: number | null
          ticket_number: string
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
          id?: string
          notes?: string | null
          order_total?: number | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          raffle_id: string
          reserved_at?: string | null
          reserved_until?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_index?: number | null
          ticket_number: string
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
          id?: string
          notes?: string | null
          order_total?: number | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          raffle_id?: string
          reserved_at?: string | null
          reserved_until?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_index?: number | null
          ticket_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "public_raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
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
          lucky_numbers_enabled: boolean | null
          max_tickets_per_person: number | null
          max_tickets_per_purchase: number | null
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
          lucky_numbers_enabled?: boolean | null
          max_tickets_per_person?: number | null
          max_tickets_per_purchase?: number | null
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
          lucky_numbers_enabled?: boolean | null
          max_tickets_per_person?: number | null
          max_tickets_per_purchase?: number | null
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
      apply_custom_numbers: { Args: { p_raffle_id: string }; Returns: number }
      apply_random_permutation: {
        Args: { p_numbering_config?: Json; p_raffle_id: string }
        Returns: number
      }
      can_have_custom_domains: { Args: { org_id: string }; Returns: boolean }
      generate_reference_code: { Args: never; Returns: string }
      generate_ticket_batch: {
        Args: {
          p_end_number: number
          p_format?: string
          p_prefix?: string
          p_raffle_id: string
          p_start_number: number
        }
        Returns: number
      }
      generate_ticket_batch_v2: {
        Args: {
          p_end_index: number
          p_numbering_config?: Json
          p_raffle_id: string
          p_start_index: number
        }
        Returns: number
      }
      get_buyers_paginated: {
        Args: {
          p_city?: string
          p_end_date?: string
          p_page?: number
          p_page_size?: number
          p_raffle_id: string
          p_search?: string
          p_start_date?: string
          p_status?: string
        }
        Returns: {
          buyer_city: string
          buyer_email: string
          buyer_key: string
          buyer_name: string
          buyer_phone: string
          first_reserved_at: string
          has_payment_proof: boolean
          order_total: number
          payment_method: string
          payment_reference: string
          sold_at: string
          status: string
          ticket_count: number
          ticket_numbers: string[]
          total_count: number
        }[]
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
      get_order_by_reference: {
        Args: { p_reference_code: string }
        Returns: Json
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
      get_public_tickets: {
        Args: { p_page?: number; p_page_size?: number; p_raffle_id: string }
        Returns: {
          buyer_city: string
          buyer_name: string
          id: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_index: number
          ticket_number: string
        }[]
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
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
      register_buyer: {
        Args: {
          p_city?: string
          p_email: string
          p_full_name: string
          p_phone?: string
        }
        Returns: string
      }
      release_expired_tickets: { Args: never; Returns: undefined }
      search_public_tickets: {
        Args: { p_limit?: number; p_raffle_id: string; p_search: string }
        Returns: {
          buyer_city: string
          buyer_name: string
          id: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_index: number
          ticket_number: string
        }[]
      }
      set_primary_domain: {
        Args: { p_domain_id: string; p_organization_id: string }
        Returns: boolean
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
      subscription_status: "active" | "canceled" | "past_due" | "trial"
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
      subscription_status: ["active", "canceled", "past_due", "trial"],
      subscription_tier: ["basic", "pro", "premium", "enterprise"],
      ticket_number_format: ["sequential", "prefixed", "random"],
      ticket_status: ["available", "reserved", "sold", "canceled"],
    },
  },
} as const
