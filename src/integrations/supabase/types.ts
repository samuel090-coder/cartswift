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
      affiliate_conversions: {
        Row: {
          affiliate_id: string
          commission_earned: number
          created_at: string
          id: string
          order_amount: number
          order_id: string | null
          status: string | null
        }
        Insert: {
          affiliate_id: string
          commission_earned: number
          created_at?: string
          id?: string
          order_amount: number
          order_id?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          commission_earned?: number
          created_at?: string
          id?: string
          order_amount?: number
          order_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          commission_rate: number | null
          created_at: string
          id: string
          is_active: boolean | null
          payout_details: Json | null
          payout_method: string | null
          total_clicks: number | null
          total_conversions: number | null
          total_earnings: number | null
          user_id: string
        }
        Insert: {
          affiliate_code: string
          commission_rate?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          payout_details?: Json | null
          payout_method?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_earnings?: number | null
          user_id: string
        }
        Update: {
          affiliate_code?: string
          commission_rate?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          payout_details?: Json | null
          payout_method?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_earnings?: number | null
          user_id?: string
        }
        Relationships: []
      }
      allowed_admins: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      ambassador_applications: {
        Row: {
          admin_notes: string | null
          agreed_to_terms: boolean
          content_niche: string[] | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          extracted_photo_url: string | null
          facebook_url: string | null
          full_name: string | null
          gender: string | null
          id: string
          id_document_url: string
          id_scan_data: Json | null
          id_type: string | null
          instagram_followers: number | null
          instagram_handle: string | null
          motivation: string | null
          promotion_plan: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tiktok_followers: number | null
          tiktok_handle: string | null
          total_followers: number | null
          twitter_followers: number | null
          twitter_handle: string | null
          updated_at: string | null
          user_id: string
          youtube_channel: string | null
          youtube_subscribers: number | null
        }
        Insert: {
          admin_notes?: string | null
          agreed_to_terms?: boolean
          content_niche?: string[] | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          extracted_photo_url?: string | null
          facebook_url?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          id_document_url: string
          id_scan_data?: Json | null
          id_type?: string | null
          instagram_followers?: number | null
          instagram_handle?: string | null
          motivation?: string | null
          promotion_plan?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tiktok_followers?: number | null
          tiktok_handle?: string | null
          total_followers?: number | null
          twitter_followers?: number | null
          twitter_handle?: string | null
          updated_at?: string | null
          user_id: string
          youtube_channel?: string | null
          youtube_subscribers?: number | null
        }
        Update: {
          admin_notes?: string | null
          agreed_to_terms?: boolean
          content_niche?: string[] | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          extracted_photo_url?: string | null
          facebook_url?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          id_document_url?: string
          id_scan_data?: Json | null
          id_type?: string | null
          instagram_followers?: number | null
          instagram_handle?: string | null
          motivation?: string | null
          promotion_plan?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tiktok_followers?: number | null
          tiktok_handle?: string | null
          total_followers?: number | null
          twitter_followers?: number | null
          twitter_handle?: string | null
          updated_at?: string | null
          user_id?: string
          youtube_channel?: string | null
          youtube_subscribers?: number | null
        }
        Relationships: []
      }
      ambassadors: {
        Row: {
          ambassador_code: string
          commission_rate: number | null
          created_at: string
          discount_percentage: number | null
          follower_count: number | null
          id: string
          is_approved: boolean | null
          social_handles: Json | null
          tier: string | null
          total_sales: number | null
          user_id: string
        }
        Insert: {
          ambassador_code: string
          commission_rate?: number | null
          created_at?: string
          discount_percentage?: number | null
          follower_count?: number | null
          id?: string
          is_approved?: boolean | null
          social_handles?: Json | null
          tier?: string | null
          total_sales?: number | null
          user_id: string
        }
        Update: {
          ambassador_code?: string
          commission_rate?: number | null
          created_at?: string
          discount_percentage?: number | null
          follower_count?: number | null
          id?: string
          is_approved?: boolean | null
          social_handles?: Json | null
          tier?: string | null
          total_sales?: number | null
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
      boost_requests: {
        Row: {
          actual_views: number | null
          admin_notes: string | null
          admin_rating: number | null
          amount_paid: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          duration_days: number
          ends_at: string | null
          expected_buyers: number | null
          id: string
          payment_reference: string | null
          product_id: string
          seller_id: string
          starts_at: string | null
          status: string
          target_locations: string[] | null
          target_views: number
          updated_at: string
        }
        Insert: {
          actual_views?: number | null
          admin_notes?: string | null
          admin_rating?: number | null
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          duration_days?: number
          ends_at?: string | null
          expected_buyers?: number | null
          id?: string
          payment_reference?: string | null
          product_id: string
          seller_id: string
          starts_at?: string | null
          status?: string
          target_locations?: string[] | null
          target_views?: number
          updated_at?: string
        }
        Update: {
          actual_views?: number | null
          admin_notes?: string | null
          admin_rating?: number | null
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          duration_days?: number
          ends_at?: string | null
          expected_buyers?: number | null
          id?: string
          payment_reference?: string | null
          product_id?: string
          seller_id?: string
          starts_at?: string | null
          status?: string
          target_locations?: string[] | null
          target_views?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
        ]
      }
      browsing_history: {
        Row: {
          id: string
          item_id: string
          session_id: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          item_id: string
          session_id: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          session_id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "browsing_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_session_id: string
          created_at: string
          id: string
          message: string
          sender_type: string
        }
        Insert: {
          chat_session_id: string
          created_at?: string
          id?: string
          message: string
          sender_type: string
        }
        Update: {
          chat_session_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          session_id: string
          status: string
          subject: string | null
          user_id: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          session_id: string
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          session_id?: string
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          item_id: string | null
          last_message_at: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          item_id?: string | null
          last_message_at?: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          item_id?: string | null
          last_message_at?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
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
      deposit_payment_methods: {
        Row: {
          account_name: string | null
          account_number: string | null
          additional_info: Json | null
          bank_name: string | null
          created_at: string
          email_address: string | null
          id: string
          instructions: string | null
          is_enabled: boolean | null
          method_name: string
          method_type: string
          supported_currencies: string[] | null
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          additional_info?: Json | null
          bank_name?: string | null
          created_at?: string
          email_address?: string | null
          id?: string
          instructions?: string | null
          is_enabled?: boolean | null
          method_name: string
          method_type: string
          supported_currencies?: string[] | null
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          additional_info?: Json | null
          bank_name?: string | null
          created_at?: string
          email_address?: string | null
          id?: string
          instructions?: string | null
          is_enabled?: boolean | null
          method_name?: string
          method_type?: string
          supported_currencies?: string[] | null
          updated_at?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string | null
          id: string
          payment_method: string
          payment_reference: string | null
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          payment_method: string
          payment_reference?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          payment_method?: string
          payment_reference?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_auto_reply: boolean
          is_read: boolean
          message_type: string
          mime_type: string | null
          reply_to_id: string | null
          sender_id: string
          tagged_product_id: string | null
          tagged_seller_product_id: string | null
          voice_duration: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_auto_reply?: boolean
          is_read?: boolean
          message_type?: string
          mime_type?: string | null
          reply_to_id?: string | null
          sender_id: string
          tagged_product_id?: string | null
          tagged_seller_product_id?: string | null
          voice_duration?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_auto_reply?: boolean
          is_read?: boolean
          message_type?: string
          mime_type?: string | null
          reply_to_id?: string | null
          sender_id?: string
          tagged_product_id?: string | null
          tagged_seller_product_id?: string | null
          voice_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_tagged_product_id_fkey"
            columns: ["tagged_product_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_tagged_seller_product_id_fkey"
            columns: ["tagged_seller_product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
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
      email_send_log: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status?: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
        }
        Relationships: []
      }
      featured_payments: {
        Row: {
          amount: number
          created_at: string
          duration_days: number
          id: string
          payment_reference: string | null
          product_id: string
          seller_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          duration_days?: number
          id?: string
          payment_reference?: string | null
          product_id: string
          seller_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          duration_days?: number
          id?: string
          payment_reference?: string | null
          product_id?: string
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
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
      order_tracking: {
        Row: {
          created_at: string
          description: string | null
          estimated_delivery: string | null
          id: string
          location: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_delivery?: string | null
          id?: string
          location?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_delivery?: string | null
          id?: string
          location?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_order_id_fkey"
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
          tracking_code: string | null
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
          tracking_code?: string | null
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
          tracking_code?: string | null
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
      post_comments: {
        Row: {
          created_at: string
          id: string
          item_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          item_id: string
          notified_at: string | null
          session_id: string
          target_price: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          item_id: string
          notified_at?: string | null
          session_id: string
          target_price?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string
          notified_at?: string | null
          session_id?: string
          target_price?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          background_image_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          id: string
          is_seller: boolean | null
          last_seen: string | null
          phone: string | null
          preferred_currency: string | null
          preferred_language: string | null
          seller_application_approved: boolean | null
          seller_rating: number | null
          seller_verified: boolean | null
          store_description: string | null
          store_logo_url: string | null
          store_name: string | null
          total_sales: number | null
          total_status_earnings: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          background_image_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id: string
          is_seller?: boolean | null
          last_seen?: string | null
          phone?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          seller_application_approved?: boolean | null
          seller_rating?: number | null
          seller_verified?: boolean | null
          store_description?: string | null
          store_logo_url?: string | null
          store_name?: string | null
          total_sales?: number | null
          total_status_earnings?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          background_image_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          is_seller?: boolean | null
          last_seen?: string | null
          phone?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          seller_application_approved?: boolean | null
          seller_rating?: number | null
          seller_verified?: boolean | null
          store_description?: string | null
          store_logo_url?: string | null
          store_name?: string | null
          total_sales?: number | null
          total_status_earnings?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
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
      seller_applications: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          address: string
          admin_notes: string | null
          agreed_to_commission: boolean
          agreed_to_terms: boolean
          bank_name: string | null
          business_document_url: string | null
          business_registration_number: string | null
          business_type: string
          city: string
          country: string
          created_at: string | null
          crypto_wallet: string | null
          date_of_birth: string | null
          email: string
          estimated_monthly_products: number | null
          facebook_url: string | null
          full_name: string
          gender: string | null
          id: string
          id_document_url: string | null
          instagram_handle: string | null
          paypal_email: string | null
          phone: string
          postal_code: string | null
          preferred_payout_method: string
          product_categories: string[]
          product_source: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          routing_number: string | null
          state: string
          status: string
          store_description: string
          store_name: string
          tax_id: string | null
          updated_at: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          address: string
          admin_notes?: string | null
          agreed_to_commission?: boolean
          agreed_to_terms?: boolean
          bank_name?: string | null
          business_document_url?: string | null
          business_registration_number?: string | null
          business_type: string
          city: string
          country: string
          created_at?: string | null
          crypto_wallet?: string | null
          date_of_birth?: string | null
          email: string
          estimated_monthly_products?: number | null
          facebook_url?: string | null
          full_name: string
          gender?: string | null
          id?: string
          id_document_url?: string | null
          instagram_handle?: string | null
          paypal_email?: string | null
          phone: string
          postal_code?: string | null
          preferred_payout_method: string
          product_categories: string[]
          product_source?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          routing_number?: string | null
          state: string
          status?: string
          store_description: string
          store_name: string
          tax_id?: string | null
          updated_at?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string
          admin_notes?: string | null
          agreed_to_commission?: boolean
          agreed_to_terms?: boolean
          bank_name?: string | null
          business_document_url?: string | null
          business_registration_number?: string | null
          business_type?: string
          city?: string
          country?: string
          created_at?: string | null
          crypto_wallet?: string | null
          date_of_birth?: string | null
          email?: string
          estimated_monthly_products?: number | null
          facebook_url?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          id_document_url?: string | null
          instagram_handle?: string | null
          paypal_email?: string | null
          phone?: string
          postal_code?: string | null
          preferred_payout_method?: string
          product_categories?: string[]
          product_source?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          routing_number?: string | null
          state?: string
          status?: string
          store_description?: string
          store_name?: string
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      seller_auto_replies: {
        Row: {
          away_message: string | null
          created_at: string
          greeting_message: string
          id: string
          is_away: boolean
          is_enabled: boolean
          quick_replies: Json | null
          response_delay_seconds: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          away_message?: string | null
          created_at?: string
          greeting_message?: string
          id?: string
          is_away?: boolean
          is_enabled?: boolean
          quick_replies?: Json | null
          response_delay_seconds?: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          away_message?: string | null
          created_at?: string
          greeting_message?: string
          id?: string
          is_away?: boolean
          is_enabled?: boolean
          quick_replies?: Json | null
          response_delay_seconds?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_orders: {
        Row: {
          buyer_email: string | null
          buyer_session_id: string
          commission_amount: number
          created_at: string
          id: string
          price_at_purchase: number
          quantity: number
          seller_earnings: number
          seller_id: string
          seller_product_id: string
          shipping_address: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_session_id: string
          commission_amount: number
          created_at?: string
          id?: string
          price_at_purchase: number
          quantity?: number
          seller_earnings: number
          seller_id: string
          seller_product_id: string
          shipping_address?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_email?: string | null
          buyer_session_id?: string
          commission_amount?: number
          created_at?: string
          id?: string
          price_at_purchase?: number
          quantity?: number
          seller_earnings?: number
          seller_id?: string
          seller_product_id?: string
          shipping_address?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_orders_seller_product_id_fkey"
            columns: ["seller_product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_products: {
        Row: {
          category: Database["public"]["Enums"]["item_category"]
          commission_rate: number | null
          created_at: string
          currency: string
          description: string | null
          featured_until: string | null
          id: string
          images: string[] | null
          is_approved: boolean | null
          is_featured: boolean | null
          price: number
          seller_id: string
          stock_quantity: number
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["item_category"]
          commission_rate?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          price: number
          seller_id: string
          stock_quantity?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["item_category"]
          commission_rate?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          price?: number
          seller_id?: string
          stock_quantity?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      status_earnings: {
        Row: {
          amount: number
          created_at: string
          earning_type: string
          from_user_id: string | null
          id: string
          status_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          earning_type: string
          from_user_id?: string | null
          id?: string
          status_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          earning_type?: string
          from_user_id?: string | null
          id?: string
          status_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_earnings_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "user_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      status_music_library: {
        Row: {
          artist: string | null
          audio_url: string
          cover_image_url: string | null
          created_at: string
          duration_seconds: number | null
          genre: string | null
          id: string
          is_approved: boolean | null
          is_public: boolean | null
          is_trending: boolean | null
          play_count: number | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          artist?: string | null
          audio_url: string
          cover_image_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          genre?: string | null
          id?: string
          is_approved?: boolean | null
          is_public?: boolean | null
          is_trending?: boolean | null
          play_count?: number | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          artist?: string | null
          audio_url?: string
          cover_image_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          genre?: string | null
          id?: string
          is_approved?: boolean | null
          is_public?: boolean | null
          is_trending?: boolean | null
          play_count?: number | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      status_purchases: {
        Row: {
          amount: number
          buyer_id: string
          commission_amount: number | null
          completed_at: string | null
          created_at: string
          id: string
          item_id: string | null
          payment_method: string | null
          product_id: string | null
          seller_id: string
          shipping_address: Json | null
          status: string | null
          status_id: string
        }
        Insert: {
          amount: number
          buyer_id: string
          commission_amount?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          seller_id: string
          shipping_address?: Json | null
          status?: string | null
          status_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          commission_amount?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          seller_id?: string
          shipping_address?: Json | null
          status?: string | null
          status_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_purchases_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "user_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      status_reactions: {
        Row: {
          created_at: string
          id: string
          message: string | null
          reaction_type: string
          status_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          reaction_type: string
          status_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          reaction_type?: string
          status_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_reactions_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "user_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      status_sticker_packs: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_premium: boolean | null
          name: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean | null
          name: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean | null
          name?: string
        }
        Relationships: []
      }
      status_stickers: {
        Row: {
          created_at: string
          emoji_code: string | null
          id: string
          image_url: string
          is_animated: boolean | null
          name: string
          pack_id: string | null
        }
        Insert: {
          created_at?: string
          emoji_code?: string | null
          id?: string
          image_url: string
          is_animated?: boolean | null
          name: string
          pack_id?: string | null
        }
        Update: {
          created_at?: string
          emoji_code?: string | null
          id?: string
          image_url?: string
          is_animated?: boolean | null
          name?: string
          pack_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_stickers_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "status_sticker_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      status_view_earnings: {
        Row: {
          amount: number
          credited_at: string
          id: string
          owner_id: string
          status_id: string
          viewer_id: string
        }
        Insert: {
          amount?: number
          credited_at?: string
          id?: string
          owner_id: string
          status_id: string
          viewer_id: string
        }
        Update: {
          amount?: number
          credited_at?: string
          id?: string
          owner_id?: string
          status_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_view_earnings_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "user_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      status_views: {
        Row: {
          id: string
          reacted_with: string | null
          status_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          reacted_with?: string | null
          status_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          reacted_with?: string | null
          status_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_views_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "user_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          benefits: Json | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          payment_reference: string | null
          starts_at: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          benefits?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_reference?: string | null
          starts_at?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          benefits?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_reference?: string | null
          starts_at?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string
          created_at: string
          icon_emoji: string | null
          id: string
          is_read: boolean
          link_url: string | null
          read_at: string | null
          related_item_id: string | null
          related_status_id: string | null
          related_user_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          icon_emoji?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          read_at?: string | null
          related_item_id?: string | null
          related_status_id?: string | null
          related_user_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          icon_emoji?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          read_at?: string | null
          related_item_id?: string | null
          related_status_id?: string | null
          related_user_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_statuses: {
        Row: {
          background_color: string | null
          call_to_action: string | null
          caption: string | null
          content_type: string
          content_url: string | null
          created_at: string
          cta_link: string | null
          expires_at: string
          hidden_from: string[] | null
          id: string
          linked_item_id: string | null
          linked_product_id: string | null
          music_artist: string | null
          music_title: string | null
          music_url: string | null
          stickers: Json | null
          text_content: string | null
          user_id: string
          view_count: number | null
          visibility: string | null
          visible_to: string[] | null
        }
        Insert: {
          background_color?: string | null
          call_to_action?: string | null
          caption?: string | null
          content_type: string
          content_url?: string | null
          created_at?: string
          cta_link?: string | null
          expires_at?: string
          hidden_from?: string[] | null
          id?: string
          linked_item_id?: string | null
          linked_product_id?: string | null
          music_artist?: string | null
          music_title?: string | null
          music_url?: string | null
          stickers?: Json | null
          text_content?: string | null
          user_id: string
          view_count?: number | null
          visibility?: string | null
          visible_to?: string[] | null
        }
        Update: {
          background_color?: string | null
          call_to_action?: string | null
          caption?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          cta_link?: string | null
          expires_at?: string
          hidden_from?: string[] | null
          id?: string
          linked_item_id?: string | null
          linked_product_id?: string | null
          music_artist?: string | null
          music_title?: string | null
          music_url?: string | null
          stickers?: Json | null
          text_content?: string | null
          user_id?: string
          view_count?: number | null
          visibility?: string | null
          visible_to?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_statuses_linked_item_id_fkey"
            columns: ["linked_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_statuses_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          bonus_balance: number
          created_at: string
          id: string
          total_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          bonus_balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          bonus_balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      create_notification: {
        Args: {
          p_body: string
          p_icon_emoji?: string
          p_link_url?: string
          p_related_item_id?: string
          p_related_status_id?: string
          p_related_user_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      generate_download_token: { Args: never; Returns: string }
      generate_tracking_code: { Args: never; Returns: string }
      get_order_by_tracking_code: {
        Args: { _code: string }
        Returns: {
          city: string
          country: string
          created_at: string
          currency: string
          full_name: string
          id: string
          state: string
          status: string
          total_amount: number
          tracking_code: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_status_view_count: {
        Args: { p_status_id: string }
        Returns: undefined
      }
      is_admin_user: { Args: { user_uuid: string }; Returns: boolean }
      is_allowed_admin: { Args: { user_email: string }; Returns: boolean }
      map_notification_to_email_type: {
        Args: { p_type: string }
        Returns: string
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
      subscription_tier: "free" | "vip" | "premium"
      user_role: "buyer" | "seller" | "admin"
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
      subscription_tier: ["free", "vip", "premium"],
      user_role: ["buyer", "seller", "admin"],
    },
  },
} as const
