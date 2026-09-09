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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          created_at: string
          detail: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          detail?: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          detail?: string
          id?: string
        }
        Relationships: []
      }
      complaints: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          order_code: string | null
          response: string | null
          status: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          order_code?: string | null
          response?: string | null
          status?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          order_code?: string | null
          response?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_code: string
          created_at: string
          discount: number
          id: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          coupon_code: string
          created_at?: string
          discount?: number
          id?: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          coupon_code?: string
          created_at?: string
          discount?: number
          id?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          amount: number
          code: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          kind: string
          max_discount: number | null
          min_order: number
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          amount?: number
          code: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          kind?: string
          max_discount?: number | null
          min_order?: number
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          amount?: number
          code?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          kind?: string
          max_discount?: number | null
          min_order?: number
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      loyalty_ledger: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          points?: number
          reason?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_materials: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          title: string
          url: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          title: string
          url?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          created_at: string
          customer_id: string
          from_staff: boolean
          id: string
          image_url: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_id: string
          from_staff?: boolean
          id?: string
          image_url?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_id?: string
          from_staff?: boolean
          id?: string
          image_url?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          emoji: string
          id: string
          label: string
          order_id: string
          progress: number
          quantity: number
          stage: string
          unit_price: number
          variant: string | null
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          label: string
          order_id: string
          progress?: number
          quantity?: number
          stage?: string
          unit_price?: number
          variant?: string | null
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          label?: string
          order_id?: string
          progress?: number
          quantity?: number
          stage?: string
          unit_price?: number
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          code: string
          coupon_code: string | null
          created_at: string
          delivery_address: string | null
          delivery_fee: number
          delivery_mode: string
          delivery_status: string
          discount: number
          eta: string | null
          id: string
          note: string | null
          payment_status: string
          pickup_address: string | null
          rider_id: string | null
          scheduled_at: string | null
          staff_id: string | null
          status: string
          subtotal: number
          total: number
          user_id: string
        }
        Insert: {
          code: string
          coupon_code?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_fee?: number
          delivery_mode?: string
          delivery_status?: string
          discount?: number
          eta?: string | null
          id?: string
          note?: string | null
          payment_status?: string
          pickup_address?: string | null
          rider_id?: string | null
          scheduled_at?: string | null
          staff_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          user_id: string
        }
        Update: {
          code?: string
          coupon_code?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_fee?: number
          delivery_mode?: string
          delivery_status?: string
          discount?: number
          eta?: string | null
          id?: string
          note?: string | null
          payment_status?: string
          pickup_address?: string | null
          rider_id?: string | null
          scheduled_at?: string | null
          staff_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          note: string | null
          order_id: string | null
          reference: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          order_id?: string | null
          reference?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          order_id?: string | null
          reference?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          latitude: number | null
          longitude: number | null
          phone: string
          referral_code: string | null
          referred_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id: string
          last_name?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string
          referral_code?: string | null
          referred_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string
          referral_code?: string | null
          referred_by?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission: number
          created_at: string
          customer_id: string
          customer_name: string
          id: string
          partner_id: string
          revenue: number
          status: string
        }
        Insert: {
          commission?: number
          created_at?: string
          customer_id: string
          customer_name?: string
          id?: string
          partner_id: string
          revenue?: number
          status?: string
        }
        Update: {
          commission?: number
          created_at?: string
          customer_id?: string
          customer_name?: string
          id?: string
          partner_id?: string
          revenue?: number
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          delivery: number
          id: string
          order_id: string
          overall: number
          quality: number
          service: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          delivery?: number
          id?: string
          order_id: string
          overall?: number
          quality?: number
          service?: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          delivery?: number
          id?: string
          order_id?: string
          overall?: number
          quality?: number
          service?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          base_price: number
          category: string
          created_at: string
          emoji: string
          id: string
          key: string
          name: string
          old_price: number | null
          options: Json
          sort_order: number
          subtitle: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          key: string
          name: string
          old_price?: number | null
          options?: Json
          sort_order?: number
          subtitle?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          key?: string
          name?: string
          old_price?: number | null
          options?: Json
          sort_order?: number
          subtitle?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          reason: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          destination: string
          id: string
          method: string
          note: string | null
          partner_id: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          destination?: string
          id?: string
          method?: string
          note?: string | null
          partner_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          destination?: string
          id?: string
          method?: string
          note?: string | null
          partner_id?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email_registered: { Args: { _email: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "customer" | "partner" | "admin" | "staff" | "rider"
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
    Enums: {
      app_role: ["customer", "partner", "admin", "staff", "rider"],
    },
  },
} as const
