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
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
          currency: string | null
          id: string
          order_id: string | null
        }
        Insert: {
          additional_notes?: string | null
          amount_usd: number
          created_at?: string | null
          currency?: string | null
          id?: string
          order_id?: string | null
        }
        Update: {
          additional_notes?: string | null
          amount_usd?: number
          created_at?: string | null
          currency?: string | null
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
      collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          item_id: string
          sort_order: number | null
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          item_id: string
          sort_order?: number | null
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          item_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_collection_items_collection_id"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_collection_items_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_seasonal: boolean
          name: string
          start_date: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_seasonal?: boolean
          name: string
          start_date?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_seasonal?: boolean
          name?: string
          start_date?: string | null
        }
        Relationships: []
      }
      crypto_payments: {
        Row: {
          amount_usd: number
          created_at: string | null
          crypto_type: string | null
          currency: string | null
          id: string
          order_id: string | null
          transaction_hash: string | null
          wallet_address: string
        }
        Insert: {
          amount_usd: number
          created_at?: string | null
          crypto_type?: string | null
          currency?: string | null
          id?: string
          order_id?: string | null
          transaction_hash?: string | null
          wallet_address?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string | null
          crypto_type?: string | null
          currency?: string | null
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
      downloads: {
        Row: {
          created_at: string | null
          download_token: string
          downloaded_at: string | null
          email: string
          expires_at: string
          id: string
          item_id: string
          payment_verified: boolean | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          download_token: string
          downloaded_at?: string | null
          email: string
          expires_at: string
          id?: string
          item_id: string
          payment_verified?: boolean | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          download_token?: string
          downloaded_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          item_id?: string
          payment_verified?: boolean | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "downloads_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_sales: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          is_active: boolean
          item_id: string
          max_quantity: number | null
          original_price: number
          sale_price: number
          sold_quantity: number
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          is_active?: boolean
          item_id: string
          max_quantity?: number | null
          original_price: number
          sale_price: number
          sold_quantity?: number
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          item_id?: string
          max_quantity?: number | null
          original_price?: number
          sale_price?: number
          sold_quantity?: number
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_flash_sales_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
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
          currency: string | null
          estimated_value: number
          id: string
          order_id: string | null
        }
        Insert: {
          additional_notes?: string | null
          brand: string
          card_code?: string | null
          created_at?: string | null
          currency?: string | null
          estimated_value: number
          id?: string
          order_id?: string | null
        }
        Update: {
          additional_notes?: string | null
          brand?: string
          card_code?: string | null
          created_at?: string | null
          currency?: string | null
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
      in_app_notifications: {
        Row: {
          body: string
          created_at: string
          icon_emoji: string | null
          id: string
          is_read: boolean
          link_url: string | null
          notification_id: string | null
          read_at: string | null
          session_id: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          icon_emoji?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          notification_id?: string | null
          read_at?: string | null
          session_id?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          icon_emoji?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          notification_id?: string | null
          read_at?: string | null
          session_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      item_popularity: {
        Row: {
          id: string
          item_id: string
          last_updated: string
          purchase_count: number
          share_count: number
          trending_score: number
          view_count: number
          wishlist_count: number
        }
        Insert: {
          id?: string
          item_id: string
          last_updated?: string
          purchase_count?: number
          share_count?: number
          trending_score?: number
          view_count?: number
          wishlist_count?: number
        }
        Update: {
          id?: string
          item_id?: string
          last_updated?: string
          purchase_count?: number
          share_count?: number
          trending_score?: number
          view_count?: number
          wishlist_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_item_popularity_item_id"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
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
          admin_download_link: string | null
          allowed_payment_methods: string[] | null
          category: Database["public"]["Enums"]["item_category"]
          created_at: string
          currency: string
          description: string | null
          discount_percentage: number | null
          download_count: number | null
          estimated_delivery_days: number | null
          file_size: number | null
          file_url: string | null
          id: string
          images: string[] | null
          item_type: string
          price: number
          star_rating: number | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_download_link?: string | null
          allowed_payment_methods?: string[] | null
          category: Database["public"]["Enums"]["item_category"]
          created_at?: string
          currency?: string
          description?: string | null
          discount_percentage?: number | null
          download_count?: number | null
          estimated_delivery_days?: number | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          images?: string[] | null
          item_type?: string
          price: number
          star_rating?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_download_link?: string | null
          allowed_payment_methods?: string[] | null
          category?: Database["public"]["Enums"]["item_category"]
          created_at?: string
          currency?: string
          description?: string | null
          discount_percentage?: number | null
          download_count?: number | null
          estimated_delivery_days?: number | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          images?: string[] | null
          item_type?: string
          price?: number
          star_rating?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string
          current_balance: number
          email: string | null
          id: string
          order_id: string | null
          points_earned: number
          points_spent: number
          session_id: string
          source: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          email?: string | null
          id?: string
          order_id?: string | null
          points_earned?: number
          points_spent?: number
          session_id: string
          source: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          email?: string | null
          id?: string
          order_id?: string | null
          points_earned?: number
          points_spent?: number
          session_id?: string
          source?: string
        }
        Relationships: []
      }
      marketing_emails: {
        Row: {
          country: string
          created_at: string
          email: string
          id: string
        }
        Insert: {
          country?: string
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          country?: string
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      media_files: {
        Row: {
          created_at: string
          file_name: string
          file_purpose: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          mime_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_purpose: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          mime_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_purpose?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          icon_emoji: string | null
          id: string
          image_url: string | null
          link_url: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          title: string
          total_clicked: number | null
          total_sent: number | null
          trigger_data: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          icon_emoji?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title: string
          total_clicked?: number | null
          total_sent?: number | null
          trigger_data?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          icon_emoji?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          total_clicked?: number | null
          total_sent?: number | null
          trigger_data?: Json | null
          trigger_type?: string
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
          currency: string | null
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
          currency?: string | null
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
          currency?: string | null
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
      payment_method_settings: {
        Row: {
          account_name: string | null
          account_number: string | null
          additional_info: Json | null
          bank_name: string | null
          created_at: string
          display_name: string
          email_address: string | null
          id: string
          instructions: string | null
          is_enabled: boolean
          payment_method: string
          routing_number: string | null
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          additional_info?: Json | null
          bank_name?: string | null
          created_at?: string
          display_name: string
          email_address?: string | null
          id?: string
          instructions?: string | null
          is_enabled?: boolean
          payment_method: string
          routing_number?: string | null
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          additional_info?: Json | null
          bank_name?: string | null
          created_at?: string
          display_name?: string
          email_address?: string | null
          id?: string
          instructions?: string | null
          is_enabled?: boolean
          payment_method?: string
          routing_number?: string | null
          updated_at?: string
          wallet_address?: string | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          session_id: string
          updated_at: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          session_id: string
          updated_at?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          order_id: string | null
          referral_code: string
          referred_email: string
          referrer_email: string | null
          referrer_session_id: string
          reward_amount: number | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          referral_code: string
          referred_email: string
          referrer_email?: string | null
          referrer_session_id: string
          reward_amount?: number | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          referral_code?: string
          referred_email?: string
          referrer_email?: string | null
          referrer_session_id?: string
          reward_amount?: number | null
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          images: string[] | null
          is_verified: boolean
          item_id: string
          rating: number
          reviewer_email: string | null
          reviewer_name: string | null
          session_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          is_verified?: boolean
          item_id: string
          rating: number
          reviewer_email?: string | null
          reviewer_name?: string | null
          session_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          is_verified?: boolean
          item_id?: string
          rating?: number
          reviewer_email?: string | null
          reviewer_name?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reviews_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      share_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          item_id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          item_id: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          item_id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      share_settings: {
        Row: {
          created_at: string
          cta_text: string | null
          hero_media_type: string | null
          hero_media_url: string | null
          id: string
          is_shareable: boolean
          item_id: string
          share_benefits: string[] | null
          share_headline: string | null
          social_proof_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_text?: string | null
          hero_media_type?: string | null
          hero_media_url?: string | null
          id?: string
          is_shareable?: boolean
          item_id: string
          share_benefits?: string[] | null
          share_headline?: string | null
          social_proof_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_text?: string | null
          hero_media_type?: string | null
          hero_media_url?: string | null
          id?: string
          is_shareable?: boolean
          item_id?: string
          share_benefits?: string[] | null
          share_headline?: string | null
          social_proof_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      share_shortlinks: {
        Row: {
          created_at: string
          id: number
          item_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          item_id: string
        }
        Update: {
          created_at?: string
          id?: number
          item_id?: string
        }
        Relationships: []
      }
      site_visitors: {
        Row: {
          browser: string | null
          city: string | null
          consent_given_at: string | null
          cookie_consent_given: boolean | null
          country: string | null
          device_type: string | null
          first_visit: string
          id: string
          language: string | null
          last_visit: string
          operating_system: string | null
          referrer: string | null
          screen_resolution: string | null
          user_agent: string | null
          visit_count: number
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          consent_given_at?: string | null
          cookie_consent_given?: boolean | null
          country?: string | null
          device_type?: string | null
          first_visit?: string
          id?: string
          language?: string | null
          last_visit?: string
          operating_system?: string | null
          referrer?: string | null
          screen_resolution?: string | null
          user_agent?: string | null
          visit_count?: number
          visitor_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          consent_given_at?: string | null
          cookie_consent_given?: boolean | null
          country?: string | null
          device_type?: string | null
          first_visit?: string
          id?: string
          language?: string | null
          last_visit?: string
          operating_system?: string | null
          referrer?: string | null
          screen_resolution?: string | null
          user_agent?: string | null
          visit_count?: number
          visitor_id?: string
        }
        Relationships: []
      }
      social_shares: {
        Row: {
          created_at: string
          id: string
          item_id: string
          platform: string
          reward_points: number | null
          session_id: string
          shared_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          platform: string
          reward_points?: number | null
          session_id: string
          shared_url: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          platform?: string
          reward_points?: number | null
          session_id?: string
          shared_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_social_shares_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
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
            foreignKeyName: "fk_wishlists_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_download_token: { Args: never; Returns: string }
      is_admin_user: { Args: { user_uuid: string }; Returns: boolean }
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
