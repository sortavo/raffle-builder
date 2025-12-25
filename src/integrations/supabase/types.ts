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
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
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
          brand_color: string | null
          country_code: string | null
          created_at: string | null
          currency_code: string | null
          email: string
          id: string
          logo_url: string | null
          max_active_raffles: number | null
          max_tickets_per_raffle: number | null
          name: string
          onboarding_completed: boolean | null
          phone: string | null
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
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          brand_color?: string | null
          country_code?: string | null
          created_at?: string | null
          currency_code?: string | null
          email: string
          id?: string
          logo_url?: string | null
          max_active_raffles?: number | null
          max_tickets_per_raffle?: number | null
          name: string
          onboarding_completed?: boolean | null
          phone?: string | null
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
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          brand_color?: string | null
          country_code?: string | null
          created_at?: string | null
          currency_code?: string | null
          email?: string
          id?: string
          logo_url?: string | null
          max_active_raffles?: number | null
          max_tickets_per_raffle?: number | null
          name?: string
          onboarding_completed?: boolean | null
          phone?: string | null
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
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          verified?: boolean | null
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
          organization_id: string
          prize_images: string[] | null
          prize_name: string
          prize_terms: string | null
          prize_value: number | null
          prize_video_url: string | null
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
          organization_id: string
          prize_images?: string[] | null
          prize_name: string
          prize_terms?: string | null
          prize_value?: number | null
          prize_video_url?: string | null
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
          organization_id?: string
          prize_images?: string[] | null
          prize_name?: string
          prize_terms?: string | null
          prize_value?: number | null
          prize_video_url?: string | null
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
          payment_method: string | null
          payment_proof_url: string | null
          payment_reference: string | null
          raffle_id: string
          reserved_at: string | null
          reserved_until: string | null
          sold_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
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
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          raffle_id: string
          reserved_at?: string | null
          reserved_until?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
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
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          raffle_id?: string
          reserved_at?: string | null
          reserved_until?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
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
      [_ in never]: never
    }
    Functions: {
      generate_reference_code: { Args: never; Returns: string }
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
      release_expired_tickets: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "owner" | "admin" | "member"
      draw_method: "lottery_nacional" | "manual" | "random_org"
      raffle_status: "draft" | "active" | "paused" | "completed" | "canceled"
      subscription_period: "monthly" | "annual"
      subscription_status: "active" | "canceled" | "past_due" | "trial"
      subscription_tier: "basic" | "pro" | "premium"
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
      subscription_tier: ["basic", "pro", "premium"],
      ticket_number_format: ["sequential", "prefixed", "random"],
      ticket_status: ["available", "reserved", "sold", "canceled"],
    },
  },
} as const
