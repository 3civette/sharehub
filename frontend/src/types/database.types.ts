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
      access_tokens: {
        Row: {
          created_at: string
          event_id: string
          expires_at: string
          id: string
          last_used_at: string | null
          qr_code_data_url: string | null
          revoked_at: string | null
          revoked_by: string | null
          token: string
          type: string
          use_count: number
        }
        Insert: {
          created_at?: string
          event_id: string
          expires_at: string
          id?: string
          last_used_at?: string | null
          qr_code_data_url?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          token: string
          type: string
          use_count?: number
        }
        Update: {
          created_at?: string
          event_id?: string
          expires_at?: string
          id?: string
          last_used_at?: string | null
          qr_code_data_url?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          token?: string
          type?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "access_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_tokens_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action_type: string
          actor_type: string
          event_id: string
          file_size: number | null
          filename: string | null
          id: string
          metadata: Json | null
          retention_days: number
          session_id: string | null
          slide_id: string | null
          speech_id: string | null
          tenant_id: string
          timestamp: string
        }
        Insert: {
          action_type: string
          actor_type: string
          event_id: string
          file_size?: number | null
          filename?: string | null
          id?: string
          metadata?: Json | null
          retention_days?: number
          session_id?: string | null
          slide_id?: string | null
          speech_id?: string | null
          tenant_id: string
          timestamp?: string
        }
        Update: {
          action_type?: string
          actor_type?: string
          event_id?: string
          file_size?: number | null
          filename?: string | null
          id?: string
          metadata?: Json | null
          retention_days?: number
          session_id?: string | null
          slide_id?: string | null
          speech_id?: string | null
          tenant_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "slides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "slides_with_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_login: string | null
          role: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          last_login?: string | null
          role?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_login?: string | null
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          metadata: Json
          resource_id: string | null
          resource_type: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json
          resource_id?: string | null
          resource_type: string
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json
          resource_id?: string | null
          resource_type?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          click_url: string | null
          created_at: string
          deleted_at: string | null
          event_id: string
          file_size: number
          filename: string
          id: string
          is_active: boolean
          mime_type: string
          slot_number: number
          storage_path: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          click_url?: string | null
          created_at?: string
          deleted_at?: string | null
          event_id: string
          file_size: number
          filename: string
          id?: string
          is_active?: boolean
          mime_type: string
          slot_number: number
          storage_path: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          click_url?: string | null
          created_at?: string
          deleted_at?: string | null
          event_id?: string
          file_size?: number
          filename?: string
          id?: string
          is_active?: boolean
          mime_type?: string
          slot_number?: number
          storage_path?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cloudconvert_jobs: {
        Row: {
          cloudconvert_job_id: string
          completed_at: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          slide_id: string
          started_at: string
          status: string
          tenant_id: string
          webhook_received_at: string | null
        }
        Insert: {
          cloudconvert_job_id: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          slide_id: string
          started_at?: string
          status?: string
          tenant_id: string
          webhook_received_at?: string | null
        }
        Update: {
          cloudconvert_job_id?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          slide_id?: string
          started_at?: string
          status?: string
          tenant_id?: string
          webhook_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cloudconvert_jobs_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: true
            referencedRelation: "slides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloudconvert_jobs_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: true
            referencedRelation: "slides_with_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloudconvert_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_metrics: {
        Row: {
          access_timeline: Json
          device_types: Json
          event_id: string
          geographic_data: Json
          id: string
          page_views: number
          per_slide_downloads: Json
          per_speech_downloads: Json
          tenant_id: string
          total_slide_downloads: number
          unique_visitors: Json
          updated_at: string
        }
        Insert: {
          access_timeline?: Json
          device_types?: Json
          event_id: string
          geographic_data?: Json
          id?: string
          page_views?: number
          per_slide_downloads?: Json
          per_speech_downloads?: Json
          tenant_id: string
          total_slide_downloads?: number
          unique_visitors?: Json
          updated_at?: string
        }
        Update: {
          access_timeline?: Json
          device_types?: Json
          event_id?: string
          geographic_data?: Json
          id?: string
          page_views?: number
          per_slide_downloads?: Json
          per_speech_downloads?: Json
          tenant_id?: string
          total_slide_downloads?: number
          unique_visitors?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_metrics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          display_order: number
          event_id: string
          file_size: number
          filename: string
          id: string
          is_cover: boolean
          mime_type: string
          storage_path: string
          tenant_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          display_order?: number
          event_id: string
          file_size: number
          filename: string
          id?: string
          is_cover?: boolean
          mime_type: string
          storage_path: string
          tenant_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          display_order?: number
          event_id?: string
          file_size?: number
          filename?: string
          id?: string
          is_cover?: boolean
          mime_type?: string
          storage_path?: string
          tenant_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allowed_slide_formats: Json
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          end_date: string
          id: string
          name: string
          organizer: string | null
          retention_policy: string
          slug: string
          status: string
          tenant_id: string
          thumbnail_generation_enabled: boolean
          title: string
          token_expiration_date: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          allowed_slide_formats?: Json
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          organizer?: string | null
          retention_policy?: string
          slug: string
          status?: string
          tenant_id: string
          thumbnail_generation_enabled?: boolean
          title: string
          token_expiration_date?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          allowed_slide_formats?: Json
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          organizer?: string | null
          retention_policy?: string
          slug?: string
          status?: string
          tenant_id?: string
          thumbnail_generation_enabled?: boolean
          title?: string
          token_expiration_date?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_tokens: {
        Row: {
          created_at: string
          created_by: string
          event_id: string
          expires_at: string
          id: string
          status: string
          tenant_id: string
          token_hash: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id: string
          expires_at: string
          id?: string
          status?: string
          tenant_id: string
          token_hash: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string
          expires_at?: string
          id?: string
          status?: string
          tenant_id?: string
          token_hash?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "organizer_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      private_event_tokens: {
        Row: {
          created_at: string
          created_by: string
          event_id: string
          expires_at: string | null
          id: string
          status: string
          tenant_id: string
          token_value: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id: string
          expires_at?: string | null
          id?: string
          status?: string
          tenant_id: string
          token_value: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string
          expires_at?: string | null
          id?: string
          status?: string
          tenant_id?: string
          token_value?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "private_event_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_event_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          end_time: string | null
          event_id: string
          id: string
          room: string | null
          start_time: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          end_time?: string | null
          event_id: string
          id?: string
          room?: string | null
          start_time?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          end_time?: string | null
          event_id?: string
          id?: string
          room?: string | null
          start_time?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      slide_decks: {
        Row: {
          created_at: string
          deleted_at: string | null
          download_count: number
          event_id: string
          file_format: string
          file_name: string
          file_size_bytes: number
          id: string
          storage_path: string
          tenant_id: string
          uploaded_by_token: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          download_count?: number
          event_id: string
          file_format: string
          file_name: string
          file_size_bytes: number
          id?: string
          storage_path: string
          tenant_id: string
          uploaded_by_token?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          download_count?: number
          event_id?: string
          file_format?: string
          file_name?: string
          file_size_bytes?: number
          id?: string
          storage_path?: string
          tenant_id?: string
          uploaded_by_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_uploaded_by_token"
            columns: ["uploaded_by_token"]
            isOneToOne: false
            referencedRelation: "organizer_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slide_decks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      slides: {
        Row: {
          deleted_at: string | null
          display_order: number
          file_size: number
          filename: string
          id: string
          mime_type: string
          r2_key: string | null
          speech_id: string
          storage_path: string | null
          tenant_id: string
          thumbnail_generated_at: string | null
          thumbnail_r2_key: string | null
          thumbnail_status: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          deleted_at?: string | null
          display_order?: number
          file_size: number
          filename: string
          id?: string
          mime_type: string
          r2_key?: string | null
          speech_id: string
          storage_path?: string | null
          tenant_id: string
          thumbnail_generated_at?: string | null
          thumbnail_r2_key?: string | null
          thumbnail_status?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          deleted_at?: string | null
          display_order?: number
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          r2_key?: string | null
          speech_id?: string
          storage_path?: string | null
          tenant_id?: string
          thumbnail_generated_at?: string | null
          thumbnail_r2_key?: string | null
          thumbnail_status?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slides_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      speeches: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          id: string
          scheduled_time: string | null
          session_id: string
          speaker_name: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          scheduled_time?: string | null
          session_id: string
          speaker_name?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          scheduled_time?: string | null
          session_id?: string
          speaker_name?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speeches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speeches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ad_config: Json
          billing_info: Json | null
          branding: Json
          branding_config: Json | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          hotel_name: string
          id: string
          status: string
          subdomain: string
          thumbnail_quota_total: number
          thumbnail_quota_used: number
          updated_at: string
        }
        Insert: {
          ad_config?: Json
          billing_info?: Json | null
          branding?: Json
          branding_config?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          hotel_name: string
          id?: string
          status?: string
          subdomain: string
          thumbnail_quota_total?: number
          thumbnail_quota_used?: number
          updated_at?: string
        }
        Update: {
          ad_config?: Json
          billing_info?: Json | null
          branding?: Json
          branding_config?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          hotel_name?: string
          id?: string
          status?: string
          subdomain?: string
          thumbnail_quota_total?: number
          thumbnail_quota_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      thumbnail_failure_log: {
        Row: {
          error_message: string
          error_type: string
          event_id: string
          id: string
          occurred_at: string
          slide_id: string
          tenant_id: string
        }
        Insert: {
          error_message: string
          error_type: string
          event_id: string
          id?: string
          occurred_at?: string
          slide_id: string
          tenant_id: string
        }
        Update: {
          error_message?: string
          error_type?: string
          event_id?: string
          id?: string
          occurred_at?: string
          slide_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thumbnail_failure_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thumbnail_failure_log_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "slides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thumbnail_failure_log_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "slides_with_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thumbnail_failure_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      slides_with_metadata: {
        Row: {
          deleted_at: string | null
          display_order: number | null
          event_name: string | null
          file_size: number | null
          file_status: string | null
          filename: string | null
          id: string | null
          mime_type: string | null
          r2_key: string | null
          session_title: string | null
          speaker_name: string | null
          speech_id: string | null
          speech_title: string | null
          storage_path: string | null
          storage_type: string | null
          tenant_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slides_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_and_increment_thumbnail_quota: {
        Args: { p_tenant_id: string }
        Returns: {
          quota_available: boolean
          quota_remaining: number
          quota_total: number
          quota_used: number
        }[]
      }
      cleanup_expired_activity_logs: {
        Args: Record<PropertyKey, never>
        Returns: {
          deleted_count: number
          tenant_id: string
        }[]
      }
      delete_old_activity_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_event_hierarchy_json: {
        Args: { p_event_id: string }
        Returns: Json
      }
      get_event_metrics_summary: {
        Args: { p_event_id: string; p_include_premium?: boolean }
        Returns: Json
      }
      get_expired_slides: {
        Args: { older_than_hours?: number }
        Returns: {
          file_size: number
          filename: string
          id: string
          r2_key: string
          tenant_id: string
          uploaded_at: string
        }[]
      }
      get_next_display_order: {
        Args: { p_speech_id: string }
        Returns: number
      }
      increment_slide_downloads: {
        Args: { event_id_param: string }
        Returns: undefined
      }
      rollback_thumbnail_quota: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      test_rls_isolation: {
        Args: { test_tenant_id: string }
        Returns: {
          can_read: boolean
          can_write: boolean
          error_message: string
          table_name: string
        }[]
      }
      update_event_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          event_count: number
          status_change: string
        }[]
      }
      validate_token_access: {
        Args: { p_event_id: string; p_token: string }
        Returns: {
          is_valid: boolean
          token_id: string
          token_type: string
        }[]
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
    Enums: {},
  },
} as const
