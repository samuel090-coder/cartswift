export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          is_read: boolean
          order_id: string
          read_at: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          order_id: string
          read_at?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          order_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          user_id?: string
        }
        Relationships: []
      }
      bank_transfer_payments: {
        Row: {
          additional_notes: string | null
          amount_usd: number
          created_at: string | null
          id: string
          order_id: string | null
        }
        Insert: {
          additional_notes?: string | null
          amount_usd: number
          created_at?: string | null
          id?: string
          order_id?: string | null
        }
        Update: {
          additional_notes?: string | null
          amount_usd?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transfer_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_payments: {
        Row: {
          amount_usd: number
          created_at: string | null
          crypto_type: string | null
          id: string
          order_id: string | null
          transaction_hash: string | null
          wallet_address: string
        }
        Insert: {
          amount_usd: number
          created_at?: string | null
          crypto_type?: string | null
          id?: string
          order_id?: string | null
          transaction_hash?: string | null
          wallet_address?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string | null
          crypto_type?: string | null
          id?: string
          order_id?: string | null
          transaction_hash?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_payments: {
        Row: {
          additional_notes: string | null
          brand: string
          card_code: string | null
          created_at: string | null
          estimated_value: number
          id: string
          order_id: string | null
        }
        Insert: {
          additional_notes?: string | null
          brand: string
          card_code?: string | null
          created_at?: string | null
          estimated_value: number
          id?: string
          order_id?: string | null
        }
        Update: {
          additional_notes?: string | null
          brand?: string
          card_code?: string | null
          created_at?: string | null
          estimated_value?: number
          id?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      item_reactions: {
        Row: {
          created_at: string
          id: string
          item_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_reactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category: Database["public"]["Enums"]["item_category"]
          created_at: string
          description: string | null
          discount_percentage: number | null
          estimated_delivery_days: number | null
          id: string
          images: string[] | null
          price: number
          star_rating: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["item_category"]
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          estimated_delivery_days?: number | null
          id?: string
          images?: string[] | null
          price: number
          star_rating?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["item_category"]
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          estimated_delivery_days?: number | null
          id?: string
          images?: string[] | null
          price?: number
          star_rating?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          order_id: string
          price_at_time: number
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          order_id: string
          price_at_time: number
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          order_id?: string
          price_at_time?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
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
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string
          delivery_instructions: string | null
          email: string | null
          full_name: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference: string | null
          phone_number: string | null
          postal_code: string
          session_id: string
          state: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string
          delivery_instructions?: string | null
          email?: string | null
          full_name: string
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          phone_number?: string | null
          postal_code: string
          session_id: string
          state: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          delivery_instructions?: string | null
          email?: string | null
          full_name?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          phone_number?: string | null
          postal_code?: string
          session_id?: string
          state?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          admin_notes: string | null
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          order_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          proof_type: string
          status: string | null
          uploaded_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          order_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          proof_type: string
          status?: string | null
          uploaded_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          order_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          proof_type?: string
          status?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_user: {
        Args: { user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      item_category: "Fashion" | "Animals" | "Tools" | "Vehicles" | "Books"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_method:
        | "cryptocurrency"
        | "bank_transfer"
        | "credit_card"
        | "paypal"
        | "gift_card"
        | "cash_app"
        | "crypto_eth"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      item_category: ["Fashion", "Animals", "Tools", "Vehicles", "Books"],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_method: [
        "cryptocurrency",
        "bank_transfer",
        "credit_card",
        "paypal",
        "gift_card",
        "cash_app",
        "crypto_eth",
      ],
    },
  },
} as const
