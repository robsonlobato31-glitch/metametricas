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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ad_accounts: {
        Row: {
          account_id: string
          account_name: string
          created_at: string
          currency: string | null
          id: string
          integration_id: string
          is_active: boolean
          provider: Database["public"]["Enums"]["integration_provider"]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          account_name: string
          created_at?: string
          currency?: string | null
          id?: string
          integration_id: string
          is_active?: boolean
          provider: Database["public"]["Enums"]["integration_provider"]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string
          created_at?: string
          currency?: string | null
          id?: string
          integration_id?: string
          is_active?: boolean
          provider?: Database["public"]["Enums"]["integration_provider"]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_accounts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_alerts: {
        Row: {
          alert_type: string
          campaign_id: string
          created_at: string
          current_amount: number
          id: string
          is_active: boolean
          resolved_at: string | null
          threshold_amount: number
          triggered_at: string
        }
        Insert: {
          alert_type?: string
          campaign_id: string
          created_at?: string
          current_amount: number
          id?: string
          is_active?: boolean
          resolved_at?: string | null
          threshold_amount: number
          triggered_at?: string
        }
        Update: {
          alert_type?: string
          campaign_id?: string
          created_at?: string
          current_amount?: number
          id?: string
          is_active?: boolean
          resolved_at?: string | null
          threshold_amount?: number
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_alerts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ad_account_id: string
          budget: number | null
          campaign_id: string
          created_at: string
          daily_budget: number | null
          end_date: string | null
          id: string
          lifetime_budget: number | null
          name: string
          objective: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          budget?: number | null
          campaign_id: string
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          id?: string
          lifetime_budget?: number | null
          name: string
          objective?: string | null
          start_date?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          budget?: number | null
          campaign_id?: string
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          id?: string
          lifetime_budget?: number | null
          name?: string
          objective?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string | null
          id: string
          layout: Json
          updated_at: string | null
          user_id: string
          widgets: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout?: Json
          updated_at?: string | null
          user_id: string
          widgets?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          layout?: Json
          updated_at?: string | null
          user_id?: string
          widgets?: Json
        }
        Relationships: []
      }
      integrations: {
        Row: {
          access_token: string | null
          config: Json | null
          created_at: string
          expires_at: string | null
          id: string
          integration_source: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token: string | null
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          config?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          integration_source?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token?: string | null
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          config?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          integration_source?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_token?: string | null
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      metrics: {
        Row: {
          campaign_id: string
          clicks: number | null
          conversions: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          date: string
          id: string
          impressions: number | null
          initiated_checkout: number | null
          link_clicks: number | null
          page_views: number | null
          purchases: number | null
          spend: number | null
          updated_at: string
          video_views_100: number | null
          video_views_25: number | null
          video_views_50: number | null
          video_views_75: number | null
        }
        Insert: {
          campaign_id: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
          initiated_checkout?: number | null
          link_clicks?: number | null
          page_views?: number | null
          purchases?: number | null
          spend?: number | null
          updated_at?: string
          video_views_100?: number | null
          video_views_25?: number | null
          video_views_50?: number | null
          video_views_75?: number | null
        }
        Update: {
          campaign_id?: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          initiated_checkout?: number | null
          link_clicks?: number | null
          page_views?: number | null
          purchases?: number | null
          spend?: number | null
          updated_at?: string
          video_views_100?: number | null
          video_views_25?: number | null
          video_views_50?: number | null
          video_views_75?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string
          footer_text: string | null
          header_text: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          accounts_synced: number | null
          campaigns_synced: number | null
          created_at: string
          error_details: Json | null
          error_message: string | null
          finished_at: string | null
          function_name: string
          id: string
          integration_id: string
          metrics_synced: number | null
          started_at: string
          status: string
        }
        Insert: {
          accounts_synced?: number | null
          campaigns_synced?: number | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          function_name: string
          id?: string
          integration_id: string
          metrics_synced?: number | null
          started_at?: string
          status: string
        }
        Update: {
          accounts_synced?: number | null
          campaigns_synced?: number | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          function_name?: string
          id?: string
          integration_id?: string
          metrics_synced?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_schedules: {
        Row: {
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          next_sync_at: string | null
          provider: string
          sync_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          next_sync_at?: string | null
          provider: string
          sync_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          next_sync_at?: string | null
          provider?: string
          sync_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed_at: string | null
          completed_steps: string[] | null
          created_at: string | null
          current_step: number | null
          id: string
          started_at: string | null
          tour_completed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: string[] | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          started_at?: string | null
          tour_completed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: string[] | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          started_at?: string | null
          tour_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          max_accounts: number
          plan_type: Database["public"]["Enums"]["plan_type"]
          started_at: string
          status: Database["public"]["Enums"]["plan_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          max_accounts?: number
          plan_type?: Database["public"]["Enums"]["plan_type"]
          started_at?: string
          status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          max_accounts?: number
          plan_type?: Database["public"]["Enums"]["plan_type"]
          started_at?: string
          status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      get_all_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          plan_expires_at: string
          plan_max_accounts: number
          plan_status: Database["public"]["Enums"]["plan_status"]
          plan_type: Database["public"]["Enums"]["plan_type"]
          roles: Database["public"]["Enums"]["app_role"][]
        }[]
      }
      get_detailed_metrics: {
        Args: { p_date_from: string; p_date_to: string; p_user_id: string }
        Returns: {
          avg_cpc: number
          avg_ctr: number
          provider: string
          total_clicks: number
          total_conversions: number
          total_impressions: number
          total_initiated_checkout: number
          total_link_clicks: number
          total_page_views: number
          total_purchases: number
          total_spend: number
          total_video_views_100: number
          total_video_views_25: number
          total_video_views_50: number
          total_video_views_75: number
        }[]
      }
      get_user_plan: {
        Args: { p_user_id: string }
        Returns: {
          accounts_used: number
          can_add_account: boolean
          expires_at: string
          is_at_limit: boolean
          max_accounts: number
          plan_type: Database["public"]["Enums"]["plan_type"]
          status: Database["public"]["Enums"]["plan_status"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      remove_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      update_user_plan: {
        Args: {
          p_expires_at?: string
          p_max_accounts: number
          p_plan_type: Database["public"]["Enums"]["plan_type"]
          p_status: Database["public"]["Enums"]["plan_status"]
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin"
      integration_provider: "meta" | "google"
      integration_status: "active" | "expired" | "error" | "disconnected"
      plan_status: "active" | "expired" | "cancelled" | "suspended"
      plan_type: "survival" | "professional" | "agency" | "enterprise"
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
      app_role: ["user", "admin", "super_admin"],
      integration_provider: ["meta", "google"],
      integration_status: ["active", "expired", "error", "disconnected"],
      plan_status: ["active", "expired", "cancelled", "suspended"],
      plan_type: ["survival", "professional", "agency", "enterprise"],
    },
  },
} as const
