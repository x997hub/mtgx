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
      admin_reports: {
        Row: {
          created_at: string
          id: number
          payload: Json
          report_date: string
        }
        Insert: {
          created_at?: string
          id?: never
          payload: Json
          report_date: string
        }
        Update: {
          created_at?: string
          id?: never
          payload?: Json
          report_date?: string
        }
        Relationships: []
      }
      auto_match_preferences: {
        Row: {
          created_at: string
          event_types: string[]
          formats: Database["public"]["Enums"]["mtg_format"][]
          is_active: boolean
          match_days: Json
          max_daily_notifications: number
          radius: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_types?: string[]
          formats?: Database["public"]["Enums"]["mtg_format"][]
          is_active?: boolean
          match_days?: Json
          max_daily_notifications?: number
          radius?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_types?: string[]
          formats?: Database["public"]["Enums"]["mtg_format"][]
          is_active?: boolean
          match_days?: Json
          max_daily_notifications?: number
          radius?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_match_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          day: Database["public"]["Enums"]["day_of_week"]
          id: number
          level: Database["public"]["Enums"]["availability_level"]
          slot: Database["public"]["Enums"]["time_slot"]
          user_id: string
        }
        Insert: {
          day: Database["public"]["Enums"]["day_of_week"]
          id?: never
          level?: Database["public"]["Enums"]["availability_level"]
          slot: Database["public"]["Enums"]["time_slot"]
          user_id: string
        }
        Update: {
          day?: Database["public"]["Enums"]["day_of_week"]
          id?: never
          level?: Database["public"]["Enums"]["availability_level"]
          slot?: Database["public"]["Enums"]["time_slot"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_generated_at: string | null
          organizer_id: string
          recurrence_rule: string
          template_data: Json
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          organizer_id: string
          recurrence_rule: string
          template_data: Json
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          organizer_id?: string
          recurrence_rule?: string
          template_data?: Json
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_templates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string
          cloned_from: string | null
          confirmation_sent_24h: boolean | null
          confirmation_sent_3h: boolean | null
          created_at: string
          description: string | null
          duration_min: number | null
          expires_at: string | null
          fee_text: string | null
          format: Database["public"]["Enums"]["mtg_format"]
          id: string
          max_players: number | null
          min_players: number | null
          mood_tags: string[] | null
          organizer_id: string
          proxy_policy: Database["public"]["Enums"]["proxy_policy"] | null
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          template_id: string | null
          title: string | null
          type: Database["public"]["Enums"]["event_type"]
          venue_id: string | null
        }
        Insert: {
          city: string
          cloned_from?: string | null
          confirmation_sent_24h?: boolean | null
          confirmation_sent_3h?: boolean | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          expires_at?: string | null
          fee_text?: string | null
          format: Database["public"]["Enums"]["mtg_format"]
          id?: string
          max_players?: number | null
          min_players?: number | null
          mood_tags?: string[] | null
          organizer_id: string
          proxy_policy?: Database["public"]["Enums"]["proxy_policy"] | null
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          template_id?: string | null
          title?: string | null
          type: Database["public"]["Enums"]["event_type"]
          venue_id?: string | null
        }
        Update: {
          city?: string
          cloned_from?: string | null
          confirmation_sent_24h?: boolean | null
          confirmation_sent_3h?: boolean | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          expires_at?: string | null
          fee_text?: string | null
          format?: Database["public"]["Enums"]["mtg_format"]
          id?: string
          max_players?: number | null
          min_players?: number | null
          mood_tags?: string[] | null
          organizer_id?: string
          proxy_policy?: Database["public"]["Enums"]["proxy_policy"] | null
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          template_id?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["event_type"]
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_cloned_from_fkey"
            columns: ["cloned_from"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "event_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reports: {
        Row: {
          admin_notes: string | null
          app_version: string | null
          body: string
          created_at: string
          id: number
          page_url: string | null
          screenshot_url: string | null
          status: string
          type: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          app_version?: string | null
          body: string
          created_at?: string
          id?: never
          page_url?: string | null
          screenshot_url?: string | null
          status?: string
          type: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          app_version?: string | null
          body?: string
          created_at?: string
          id?: never
          page_url?: string | null
          screenshot_url?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_preferences: {
        Row: {
          available_slots: Json
          created_at: string
          dnd_until: string | null
          formats: Database["public"]["Enums"]["mtg_format"][]
          is_open: boolean
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          available_slots?: Json
          created_at?: string
          dnd_until?: string | null
          formats?: Database["public"]["Enums"]["mtg_format"][]
          is_open?: boolean
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          available_slots?: Json
          created_at?: string
          dnd_until?: string | null
          formats?: Database["public"]["Enums"]["mtg_format"][]
          is_open?: boolean
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      looking_for_game: {
        Row: {
          city: string
          created_at: string
          duration_hours: number | null
          expires_at: string
          formats: Database["public"]["Enums"]["mtg_format"][]
          id: number
          is_instant: boolean | null
          preferred_slot: Database["public"]["Enums"]["time_slot"] | null
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          duration_hours?: number | null
          expires_at?: string
          formats: Database["public"]["Enums"]["mtg_format"][]
          id?: never
          is_instant?: boolean | null
          preferred_slot?: Database["public"]["Enums"]["time_slot"] | null
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          duration_hours?: number | null
          expires_at?: string
          formats?: Database["public"]["Enums"]["mtg_format"][]
          id?: never
          is_instant?: boolean | null
          preferred_slot?: Database["public"]["Enums"]["time_slot"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "looking_for_game_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_tags: {
        Row: {
          id: number
          is_active: boolean
          label_en: string
          label_he: string | null
          label_ru: string
          slug: string
        }
        Insert: {
          id?: never
          is_active?: boolean
          label_en: string
          label_he?: string | null
          label_ru: string
          slug: string
        }
        Update: {
          id?: never
          is_active?: boolean
          label_en?: string
          label_he?: string | null
          label_ru?: string
          slug?: string
        }
        Relationships: []
      }
      notification_outbox: {
        Row: {
          attempts: number
          created_at: string
          event_id: string | null
          id: string
          last_attempt_at: string | null
          payload: Json
          status: Database["public"]["Enums"]["outbox_status"]
          type: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_id?: string | null
          id?: string
          last_attempt_at?: string | null
          payload: Json
          status?: Database["public"]["Enums"]["outbox_status"]
          type: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_id?: string | null
          id?: string
          last_attempt_at?: string | null
          payload?: Json
          status?: Database["public"]["Enums"]["outbox_status"]
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_sent: {
        Row: {
          event_id: string
          reason: string
          sent_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          reason: string
          sent_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          reason?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_sent_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_sent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          event_id: string | null
          id: number
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          event_id?: string | null
          id?: never
          is_read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string | null
          id?: never
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_messages: {
        Row: {
          body: string
          created_at: string
          event_id: string
          id: number
          organizer_id: string
        }
        Insert: {
          body: string
          created_at?: string
          event_id: string
          id?: never
          organizer_id: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string
          id?: never
          organizer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_messages_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_invites: {
        Row: {
          created_at: string
          event_id: string | null
          format: Database["public"]["Enums"]["mtg_format"] | null
          from_user_id: string
          id: number
          message: string | null
          proposed_time: string | null
          responded_at: string | null
          status: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          format?: Database["public"]["Enums"]["mtg_format"] | null
          from_user_id: string
          id?: never
          message?: string | null
          proposed_time?: string | null
          responded_at?: string | null
          status?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          format?: Database["public"]["Enums"]["mtg_format"] | null
          from_user_id?: string
          id?: never
          message?: string | null
          proposed_time?: string | null
          responded_at?: string | null
          status?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_invites_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_invites_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          car_access: string | null
          city: string
          created_at: string
          display_name: string
          formats: Database["public"]["Enums"]["mtg_format"][]
          id: string
          interested_in_trading: boolean
          reliability_score: number
          role: Database["public"]["Enums"]["user_role"]
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          car_access?: string | null
          city: string
          created_at?: string
          display_name: string
          formats?: Database["public"]["Enums"]["mtg_format"][]
          id: string
          interested_in_trading?: boolean
          reliability_score?: number
          role?: Database["public"]["Enums"]["user_role"]
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          car_access?: string | null
          city?: string
          created_at?: string
          display_name?: string
          formats?: Database["public"]["Enums"]["mtg_format"][]
          id?: string
          interested_in_trading?: boolean
          reliability_score?: number
          role?: Database["public"]["Enums"]["user_role"]
          whatsapp?: string | null
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
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_history: {
        Row: {
          event_id: string
          from_status: Database["public"]["Enums"]["rsvp_status"] | null
          hours_before_event: number | null
          id: number
          recorded_at: string
          rsvp_id: number
          to_status: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Insert: {
          event_id: string
          from_status?: Database["public"]["Enums"]["rsvp_status"] | null
          hours_before_event?: number | null
          id?: never
          recorded_at?: string
          rsvp_id: number
          to_status: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Update: {
          event_id?: string
          from_status?: Database["public"]["Enums"]["rsvp_status"] | null
          hours_before_event?: number | null
          id?: never
          recorded_at?: string
          rsvp_id?: number
          to_status?: Database["public"]["Enums"]["rsvp_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_history_rsvp_id_fkey"
            columns: ["rsvp_id"]
            isOneToOne: false
            referencedRelation: "rsvps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          confirmed_at: string | null
          created_at: string
          event_id: string
          id: number
          power_level: number | null
          queue_position: number | null
          status: Database["public"]["Enums"]["rsvp_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          event_id: string
          id?: never
          power_level?: number | null
          queue_position?: number | null
          status: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          event_id?: string
          id?: never
          power_level?: number | null
          queue_position?: number | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          city: string | null
          created_at: string
          format: Database["public"]["Enums"]["mtg_format"] | null
          id: number
          target_id: string | null
          target_type: Database["public"]["Enums"]["subscription_target"]
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          format?: Database["public"]["Enums"]["mtg_format"] | null
          id?: never
          target_id?: string | null
          target_type: Database["public"]["Enums"]["subscription_target"]
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          format?: Database["public"]["Enums"]["mtg_format"] | null
          id?: never
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["subscription_target"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_photos: {
        Row: {
          id: string
          is_primary: boolean | null
          storage_path: string
          venue_id: string
        }
        Insert: {
          id?: string
          is_primary?: boolean | null
          storage_path: string
          venue_id: string
        }
        Update: {
          id?: string
          is_primary?: boolean | null
          storage_path?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string
          capacity: number | null
          city: string
          contacts: Json | null
          created_at: string
          hours: Json | null
          id: string
          name: string
          owner_id: string
          supported_formats: Database["public"]["Enums"]["mtg_format"][]
        }
        Insert: {
          address: string
          capacity?: number | null
          city: string
          contacts?: Json | null
          created_at?: string
          hours?: Json | null
          id?: string
          name: string
          owner_id: string
          supported_formats?: Database["public"]["Enums"]["mtg_format"][]
        }
        Update: {
          address?: string
          capacity?: number | null
          city?: string
          contacts?: Json | null
          created_at?: string
          hours?: Json | null
          id?: string
          name?: string
          owner_id?: string
          supported_formats?: Database["public"]["Enums"]["mtg_format"][]
        }
        Relationships: [
          {
            foreignKeyName: "venues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      organizer_stats: {
        Row: {
          avg_attendance: number | null
          cancel_rate: number | null
          events_cancelled: number | null
          events_total: number | null
          organizer_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      availability_match: {
        Args: { p_event_id: string }
        Returns: {
          user_id: string
        }[]
      }
      check_played_together: {
        Args: { p_user1: string; p_user2: string }
        Returns: boolean
      }
      count_available_players: {
        Args: {
          p_city: string
          p_day: string
          p_format: Database["public"]["Enums"]["mtg_format"]
          p_slot: string
        }
        Returns: number
      }
      get_public_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          city: string
          display_name: string
          formats: Database["public"]["Enums"]["mtg_format"][]
          id: string
          reliability_score: number
        }[]
      }
      get_recommended_invites: {
        Args: { p_event_id: string }
        Returns: {
          avatar_url: string
          city: string
          display_name: string
          formats: Database["public"]["Enums"]["mtg_format"][]
          played_together: boolean
          reliability_score: number
          user_id: string
        }[]
      }
      immutable_format_text: {
        Args: { val: Database["public"]["Enums"]["mtg_format"] }
        Returns: string
      }
      increment_reliability_score: {
        Args: { p_delta: number; p_user_id: string }
        Returns: undefined
      }
      join_waitlist: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: Json
      }
      promote_from_waitlist: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      rsvp_with_lock: {
        Args: {
          p_event_id: string
          p_power_level?: number
          p_status: Database["public"]["Enums"]["rsvp_status"]
          p_user_id: string
        }
        Returns: Json
      }
      send_bulk_invites: {
        Args: { p_event_id: string; p_message?: string; p_user_ids: string[] }
        Returns: Json
      }
      update_user_availability: {
        Args: { p_slots: Json; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      availability_level: "available" | "sometimes" | "unavailable"
      day_of_week: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"
      event_status: "active" | "cancelled" | "confirmed" | "expired"
      event_type: "big" | "quick"
      mtg_format: "pauper" | "commander" | "standard" | "draft"
      outbox_status: "pending" | "sent" | "dead"
      proxy_policy: "none" | "partial" | "full"
      rsvp_status:
        | "going"
        | "maybe"
        | "not_going"
        | "waitlisted"
        | "pending_confirmation"
      subscription_target: "organizer" | "venue" | "format_city"
      time_slot: "morning" | "day" | "evening"
      user_role: "player" | "organizer" | "club_owner" | "admin"
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
      availability_level: ["available", "sometimes", "unavailable"],
      day_of_week: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
      event_status: ["active", "cancelled", "confirmed", "expired"],
      event_type: ["big", "quick"],
      mtg_format: ["pauper", "commander", "standard", "draft"],
      outbox_status: ["pending", "sent", "dead"],
      proxy_policy: ["none", "partial", "full"],
      rsvp_status: [
        "going",
        "maybe",
        "not_going",
        "waitlisted",
        "pending_confirmation",
      ],
      subscription_target: ["organizer", "venue", "format_city"],
      time_slot: ["morning", "day", "evening"],
      user_role: ["player", "organizer", "club_owner", "admin"],
    },
  },
} as const

// ---------------------------------------------------------------------------
// Backward-compatible enum type aliases
// ---------------------------------------------------------------------------
export type UserRole = Enums<"user_role">;
export type MtgFormat = Enums<"mtg_format">;
export type EventType = Enums<"event_type">;
export type EventStatus = Enums<"event_status">;
export type RsvpStatus = Enums<"rsvp_status">;
export type SubscriptionTarget = Enums<"subscription_target">;
export type DayOfWeek = Enums<"day_of_week">;
export type TimeSlot = Enums<"time_slot">;
export type AvailabilityLevel = Enums<"availability_level">;
export type OutboxStatus = Enums<"outbox_status">;
export type ProxyPolicy = Enums<"proxy_policy">;

// Non-DB-enum types (text columns with CHECK constraints)
export type CarAccess = "yes" | "no" | "sometimes";
export type MatchDayPref = "always" | "if_free" | "never";
export type InviteVisibility = "all" | "played_together" | "my_venues" | "none";
export type InviteStatus = "pending" | "accepted" | "declined" | "expired";
export type MatchRadius = "my_city" | "nearby" | "all";
export type FeedbackStatus = "new" | "in_progress" | "resolved" | "closed";
export type FeedbackType = "bug" | "suggestion" | "question";

// ---------------------------------------------------------------------------
// Convenience table/view type aliases
// ---------------------------------------------------------------------------
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Availability = Database["public"]["Tables"]["availability"]["Row"];
export type AvailabilityInsert = Database["public"]["Tables"]["availability"]["Insert"];

export type Venue = Database["public"]["Tables"]["venues"]["Row"];
export type VenueInsert = Database["public"]["Tables"]["venues"]["Insert"];
export type VenueUpdate = Database["public"]["Tables"]["venues"]["Update"];

export type VenuePhoto = Database["public"]["Tables"]["venue_photos"]["Row"];

export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
export type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

export type Rsvp = Database["public"]["Tables"]["rsvps"]["Row"];
export type RsvpInsert = Database["public"]["Tables"]["rsvps"]["Insert"];

export type RsvpHistory = Database["public"]["Tables"]["rsvp_history"]["Row"];

export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"];

export type LookingForGame = Database["public"]["Tables"]["looking_for_game"]["Row"];
export type LookingForGameInsert = Database["public"]["Tables"]["looking_for_game"]["Insert"];

export type PushSubscription = Database["public"]["Tables"]["push_subscriptions"]["Row"];
export type PushSubscriptionInsert = Database["public"]["Tables"]["push_subscriptions"]["Insert"];

export type NotificationOutbox = Database["public"]["Tables"]["notification_outbox"]["Row"];
export type NotificationSent = Database["public"]["Tables"]["notification_sent"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type AdminReport = Database["public"]["Tables"]["admin_reports"]["Row"];

export type AutoMatchPreferences = Database["public"]["Tables"]["auto_match_preferences"]["Row"];
export type AutoMatchPreferencesInsert = Database["public"]["Tables"]["auto_match_preferences"]["Insert"];
export type AutoMatchPreferencesUpdate = Database["public"]["Tables"]["auto_match_preferences"]["Update"];

export type InvitePreferences = Database["public"]["Tables"]["invite_preferences"]["Row"];
export type InvitePreferencesInsert = Database["public"]["Tables"]["invite_preferences"]["Insert"];
export type InvitePreferencesUpdate = Database["public"]["Tables"]["invite_preferences"]["Update"];

export type PlayerInvite = Database["public"]["Tables"]["player_invites"]["Row"];
export type PlayerInviteInsert = Database["public"]["Tables"]["player_invites"]["Insert"];

export type RecommendedPlayer = Database["public"]["Functions"]["get_recommended_invites"]["Returns"][number];

export type OrganizerMessage = Database["public"]["Tables"]["organizer_messages"]["Row"];
export type OrganizerMessageInsert = Database["public"]["Tables"]["organizer_messages"]["Insert"];

export type FeedbackReport = Database["public"]["Tables"]["feedback_reports"]["Row"];
export type FeedbackReportInsert = Database["public"]["Tables"]["feedback_reports"]["Insert"];
export type FeedbackReportUpdate = Database["public"]["Tables"]["feedback_reports"]["Update"];

export type MoodTag = Database["public"]["Tables"]["mood_tags"]["Row"];
export type MoodTagInsert = Database["public"]["Tables"]["mood_tags"]["Insert"];

export type EventTemplate = Database["public"]["Tables"]["event_templates"]["Row"];
export type EventTemplateInsert = Database["public"]["Tables"]["event_templates"]["Insert"];
export type EventTemplateUpdate = Database["public"]["Tables"]["event_templates"]["Update"];

export type OrganizerStats = Database["public"]["Views"]["organizer_stats"]["Row"];
