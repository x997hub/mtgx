// Hand-written types matching the Supabase schema
// Replace with `supabase gen types typescript` in production

export type UserRole = "player" | "organizer" | "club_owner" | "admin";
export type MtgFormat = "pauper" | "commander" | "standard" | "draft";
export type EventType = "big" | "quick";
export type EventStatus = "active" | "cancelled" | "confirmed" | "expired";
export type RsvpStatus = "going" | "maybe" | "not_going";
export type SubscriptionTarget = "organizer" | "venue" | "format_city";
export type DayOfWeek = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export type TimeSlot = "morning" | "day" | "evening";
export type CarAccess = "yes" | "no" | "sometimes";
export type AvailabilityLevel = "available" | "sometimes" | "unavailable";
export type OutboxStatus = "pending" | "sent" | "dead";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          city: string;
          formats: MtgFormat[];
          whatsapp: string | null;
          role: UserRole;
          reliability_score: number;
          bio: string | null;
          avatar_url: string | null;
          car_access: CarAccess | null;
          interested_in_trading: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          city: string;
          formats?: MtgFormat[];
          whatsapp?: string | null;
          role?: UserRole;
          reliability_score?: number;
          bio?: string | null;
          avatar_url?: string | null;
          car_access?: CarAccess | null;
          interested_in_trading?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          city?: string;
          formats?: MtgFormat[];
          whatsapp?: string | null;
          role?: UserRole;
          reliability_score?: number;
          bio?: string | null;
          avatar_url?: string | null;
          car_access?: CarAccess | null;
          interested_in_trading?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      availability: {
        Row: {
          id: number;
          user_id: string;
          day: DayOfWeek;
          slot: TimeSlot;
          level: AvailabilityLevel;
        };
        Insert: {
          user_id: string;
          day: DayOfWeek;
          slot: TimeSlot;
          level?: AvailabilityLevel;
        };
        Update: {
          user_id?: string;
          day?: DayOfWeek;
          slot?: TimeSlot;
          level?: AvailabilityLevel;
        };
        Relationships: [];
      };
      venues: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          city: string;
          address: string;
          hours: Record<string, string> | null;
          capacity: number | null;
          contacts: Record<string, string> | null;
          supported_formats: MtgFormat[];
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          city: string;
          address: string;
          hours?: Record<string, string> | null;
          capacity?: number | null;
          contacts?: Record<string, string> | null;
          supported_formats?: MtgFormat[];
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          city?: string;
          address?: string;
          hours?: Record<string, string> | null;
          capacity?: number | null;
          contacts?: Record<string, string> | null;
          supported_formats?: MtgFormat[];
          created_at?: string;
        };
        Relationships: [];
      };
      venue_photos: {
        Row: {
          id: string;
          venue_id: string;
          storage_path: string;
          is_primary: boolean;
        };
        Insert: {
          id?: string;
          venue_id: string;
          storage_path: string;
          is_primary?: boolean;
        };
        Update: {
          id?: string;
          venue_id?: string;
          storage_path?: string;
          is_primary?: boolean;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organizer_id: string;
          venue_id: string | null;
          type: EventType;
          title: string | null;
          format: MtgFormat;
          city: string;
          starts_at: string;
          duration_min: number | null;
          min_players: number;
          max_players: number | null;
          fee_text: string | null;
          description: string | null;
          status: EventStatus;
          cloned_from: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organizer_id: string;
          venue_id?: string | null;
          type: EventType;
          title?: string | null;
          format: MtgFormat;
          city: string;
          starts_at: string;
          duration_min?: number | null;
          min_players?: number;
          max_players?: number | null;
          fee_text?: string | null;
          description?: string | null;
          status?: EventStatus;
          cloned_from?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organizer_id?: string;
          venue_id?: string | null;
          type?: EventType;
          title?: string | null;
          format?: MtgFormat;
          city?: string;
          starts_at?: string;
          duration_min?: number | null;
          min_players?: number;
          max_players?: number | null;
          fee_text?: string | null;
          description?: string | null;
          status?: EventStatus;
          cloned_from?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      rsvps: {
        Row: {
          id: number;
          event_id: string;
          user_id: string;
          status: RsvpStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          user_id: string;
          status: RsvpStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          event_id?: string;
          user_id?: string;
          status?: RsvpStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rsvp_history: {
        Row: {
          id: number;
          rsvp_id: number;
          user_id: string;
          event_id: string;
          from_status: RsvpStatus | null;
          to_status: RsvpStatus;
          hours_before_event: number | null;
          recorded_at: string;
        };
        Insert: {
          rsvp_id: number;
          user_id: string;
          event_id: string;
          from_status?: RsvpStatus | null;
          to_status: RsvpStatus;
          hours_before_event?: number | null;
          recorded_at?: string;
        };
        Update: {
          rsvp_id?: number;
          user_id?: string;
          event_id?: string;
          from_status?: RsvpStatus | null;
          to_status?: RsvpStatus;
          hours_before_event?: number | null;
          recorded_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: number;
          user_id: string;
          target_type: SubscriptionTarget;
          target_id: string | null;
          format: MtgFormat | null;
          city: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          target_type: SubscriptionTarget;
          target_id?: string | null;
          format?: MtgFormat | null;
          city?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          target_type?: SubscriptionTarget;
          target_id?: string | null;
          format?: MtgFormat | null;
          city?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      looking_for_game: {
        Row: {
          id: number;
          user_id: string;
          city: string;
          formats: MtgFormat[];
          preferred_slot: TimeSlot | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          city: string;
          formats: MtgFormat[];
          preferred_slot?: TimeSlot | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          city?: string;
          formats?: MtgFormat[];
          preferred_slot?: TimeSlot | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_outbox: {
        Row: {
          id: string;
          event_id: string | null;
          type: string;
          payload: Record<string, unknown>;
          status: OutboxStatus;
          attempts: number;
          last_attempt_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id?: string | null;
          type: string;
          payload: Record<string, unknown>;
          status?: OutboxStatus;
          attempts?: number;
          last_attempt_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string | null;
          type?: string;
          payload?: Record<string, unknown>;
          status?: OutboxStatus;
          attempts?: number;
          last_attempt_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_sent: {
        Row: {
          user_id: string;
          event_id: string;
          reason: string;
          sent_at: string;
        };
        Insert: {
          user_id: string;
          event_id: string;
          reason: string;
          sent_at?: string;
        };
        Update: {
          user_id?: string;
          event_id?: string;
          reason?: string;
          sent_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: number;
          user_id: string;
          event_id: string | null;
          type: string;
          title: string;
          body: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          event_id?: string | null;
          type: string;
          title: string;
          body: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          event_id?: string | null;
          type?: string;
          title?: string;
          body?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_reports: {
        Row: {
          id: number;
          report_date: string;
          payload: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          report_date: string;
          payload: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          report_date?: string;
          payload?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      availability_match: {
        Args: { p_event_id: string };
        Returns: { user_id: string }[];
      };
      update_user_availability: {
        Args: { p_user_id: string; p_slots: Record<string, unknown>[] };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      mtg_format: MtgFormat;
      event_type: EventType;
      event_status: EventStatus;
      rsvp_status: RsvpStatus;
      subscription_target: SubscriptionTarget;
      day_of_week: DayOfWeek;
      time_slot: TimeSlot;
      car_access: CarAccess;
      availability_level: AvailabilityLevel;
      outbox_status: OutboxStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience type aliases
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
