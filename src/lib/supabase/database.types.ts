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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      campaign_responses: {
        Row: {
          campaign_id: string
          id: string
          response_data: Json
          submitted_at: string
        }
        Insert: {
          campaign_id: string
          id: string
          response_data: Json
          submitted_at?: string
        }
        Update: {
          campaign_id?: string
          id?: string
          response_data?: Json
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          blocks: Json
          brief: Json | null
          created_at: string
          cta_clicks: number
          daily: Json
          duration_days: number | null
          expired_contact: string | null
          expired_message: string | null
          expires_at: string | null
          id: string
          owner_id: string
          purpose: string
          shares: number
          slug: string
          starts_at: string | null
          status: string
          template: Json | null
          theme: Json
          title: string
          updated_at: string
          views: number
          visibility: string
        }
        Insert: {
          blocks?: Json
          brief?: Json | null
          created_at?: string
          cta_clicks?: number
          daily?: Json
          duration_days?: number | null
          expired_contact?: string | null
          expired_message?: string | null
          expires_at?: string | null
          id: string
          owner_id: string
          purpose: string
          shares?: number
          slug: string
          starts_at?: string | null
          status?: string
          template?: Json | null
          theme: Json
          title: string
          updated_at?: string
          views?: number
          visibility?: string
        }
        Update: {
          blocks?: Json
          brief?: Json | null
          created_at?: string
          cta_clicks?: number
          daily?: Json
          duration_days?: number | null
          expired_contact?: string | null
          expired_message?: string | null
          expires_at?: string | null
          id?: string
          owner_id?: string
          purpose?: string
          shares?: number
          slug?: string
          starts_at?: string | null
          status?: string
          template?: Json | null
          theme?: Json
          title?: string
          updated_at?: string
          views?: number
          visibility?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          usage: Json
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id: string
          name?: string
          phone?: string | null
          updated_at?: string
          usage?: Json
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          usage?: Json
        }
        Relationships: []
      }
      template_registry: {
        Row: {
          created_at: string
          created_by: string
          current_version: string
          id: string
          name: string
          published_version: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_version: string
          id: string
          name: string
          published_version?: string | null
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_version?: string
          id?: string
          name?: string
          published_version?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_reviews: {
        Row: {
          id: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          template_id: string
          version: string
        }
        Insert: {
          id: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          template_id: string
          version: string
        }
        Update: {
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          template_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_reviews_template_id_version_fkey"
            columns: ["template_id", "version"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["template_id", "version"]
          },
        ]
      }
      template_versions: {
        Row: {
          config: Json
          created_at: string
          created_by: string
          is_published: boolean
          template_id: string
          version: string
        }
        Insert: {
          config: Json
          created_at?: string
          created_by: string
          is_published?: boolean
          template_id: string
          version: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string
          is_published?: boolean
          template_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_registry"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_campaigns: {
        Row: {
          blocks: Json | null
          expired_contact: string | null
          expired_message: string | null
          expires_at: string | null
          id: string | null
          purpose: string | null
          slug: string | null
          starts_at: string | null
          status: string | null
          template: Json | null
          theme: Json | null
          title: string | null
        }
        Insert: {
          blocks?: Json | null
          expired_contact?: string | null
          expired_message?: string | null
          expires_at?: string | null
          id?: string | null
          purpose?: string | null
          slug?: string | null
          starts_at?: string | null
          status?: string | null
          template?: Json | null
          theme?: Json | null
          title?: string | null
        }
        Update: {
          blocks?: Json | null
          expired_contact?: string | null
          expired_message?: string | null
          expires_at?: string | null
          id?: string | null
          purpose?: string | null
          slug?: string | null
          starts_at?: string | null
          status?: string | null
          template?: Json | null
          theme?: Json | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      review_template: {
        Args: {
          p_decision: string
          p_note?: string
          p_template_id: string
          p_version: string
        }
        Returns: undefined
      }
      submit_template_for_review: {
        Args: { p_config: Json }
        Returns: {
          created_at: string
          created_by: string
          current_version: string
          id: string
          name: string
          published_version: string | null
          source: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "template_registry"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

