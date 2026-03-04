import type { Database } from "@/types/database.types";
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<Database, "public", "public", {
    Tables: {
        profiles: {
            Row: {
                id: string;
                display_name: string;
                city: string;
                formats: import("@/types/database.types").MtgFormat[];
                whatsapp: string | null;
                role: import("@/types/database.types").UserRole;
                reliability_score: number;
                created_at: string;
            };
            Insert: {
                id: string;
                display_name: string;
                city: string;
                formats?: import("@/types/database.types").MtgFormat[];
                whatsapp?: string | null;
                role?: import("@/types/database.types").UserRole;
                reliability_score?: number;
                created_at?: string;
            };
            Update: {
                id?: string;
                display_name?: string;
                city?: string;
                formats?: import("@/types/database.types").MtgFormat[];
                whatsapp?: string | null;
                role?: import("@/types/database.types").UserRole;
                reliability_score?: number;
                created_at?: string;
            };
            Relationships: [];
        };
        availability: {
            Row: {
                id: number;
                user_id: string;
                day: import("@/types/database.types").DayOfWeek;
                slot: import("@/types/database.types").TimeSlot;
                level: import("@/types/database.types").AvailabilityLevel;
            };
            Insert: {
                user_id: string;
                day: import("@/types/database.types").DayOfWeek;
                slot: import("@/types/database.types").TimeSlot;
                level?: import("@/types/database.types").AvailabilityLevel;
            };
            Update: {
                user_id?: string;
                day?: import("@/types/database.types").DayOfWeek;
                slot?: import("@/types/database.types").TimeSlot;
                level?: import("@/types/database.types").AvailabilityLevel;
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
                supported_formats: import("@/types/database.types").MtgFormat[];
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
                supported_formats?: import("@/types/database.types").MtgFormat[];
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
                supported_formats?: import("@/types/database.types").MtgFormat[];
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
                type: import("@/types/database.types").EventType;
                title: string | null;
                format: import("@/types/database.types").MtgFormat;
                city: string;
                starts_at: string;
                duration_min: number | null;
                min_players: number;
                max_players: number | null;
                fee_text: string | null;
                description: string | null;
                status: import("@/types/database.types").EventStatus;
                cloned_from: string | null;
                expires_at: string | null;
                created_at: string;
            };
            Insert: {
                id?: string;
                organizer_id: string;
                venue_id?: string | null;
                type: import("@/types/database.types").EventType;
                title?: string | null;
                format: import("@/types/database.types").MtgFormat;
                city: string;
                starts_at: string;
                duration_min?: number | null;
                min_players?: number;
                max_players?: number | null;
                fee_text?: string | null;
                description?: string | null;
                status?: import("@/types/database.types").EventStatus;
                cloned_from?: string | null;
                expires_at?: string | null;
                created_at?: string;
            };
            Update: {
                id?: string;
                organizer_id?: string;
                venue_id?: string | null;
                type?: import("@/types/database.types").EventType;
                title?: string | null;
                format?: import("@/types/database.types").MtgFormat;
                city?: string;
                starts_at?: string;
                duration_min?: number | null;
                min_players?: number;
                max_players?: number | null;
                fee_text?: string | null;
                description?: string | null;
                status?: import("@/types/database.types").EventStatus;
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
                status: import("@/types/database.types").RsvpStatus;
                created_at: string;
                updated_at: string;
            };
            Insert: {
                event_id: string;
                user_id: string;
                status: import("@/types/database.types").RsvpStatus;
                created_at?: string;
                updated_at?: string;
            };
            Update: {
                event_id?: string;
                user_id?: string;
                status?: import("@/types/database.types").RsvpStatus;
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
                from_status: import("@/types/database.types").RsvpStatus | null;
                to_status: import("@/types/database.types").RsvpStatus;
                hours_before_event: number | null;
                recorded_at: string;
            };
            Insert: {
                rsvp_id: number;
                user_id: string;
                event_id: string;
                from_status?: import("@/types/database.types").RsvpStatus | null;
                to_status: import("@/types/database.types").RsvpStatus;
                hours_before_event?: number | null;
                recorded_at?: string;
            };
            Update: {
                rsvp_id?: number;
                user_id?: string;
                event_id?: string;
                from_status?: import("@/types/database.types").RsvpStatus | null;
                to_status?: import("@/types/database.types").RsvpStatus;
                hours_before_event?: number | null;
                recorded_at?: string;
            };
            Relationships: [];
        };
        subscriptions: {
            Row: {
                id: number;
                user_id: string;
                target_type: import("@/types/database.types").SubscriptionTarget;
                target_id: string | null;
                format: import("@/types/database.types").MtgFormat | null;
                city: string | null;
                created_at: string;
            };
            Insert: {
                user_id: string;
                target_type: import("@/types/database.types").SubscriptionTarget;
                target_id?: string | null;
                format?: import("@/types/database.types").MtgFormat | null;
                city?: string | null;
                created_at?: string;
            };
            Update: {
                user_id?: string;
                target_type?: import("@/types/database.types").SubscriptionTarget;
                target_id?: string | null;
                format?: import("@/types/database.types").MtgFormat | null;
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
                formats: import("@/types/database.types").MtgFormat[];
                expires_at: string;
                created_at: string;
            };
            Insert: {
                user_id: string;
                city: string;
                formats: import("@/types/database.types").MtgFormat[];
                expires_at?: string;
                created_at?: string;
            };
            Update: {
                user_id?: string;
                city?: string;
                formats?: import("@/types/database.types").MtgFormat[];
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
                status: import("@/types/database.types").OutboxStatus;
                attempts: number;
                last_attempt_at: string | null;
                created_at: string;
            };
            Insert: {
                id?: string;
                event_id?: string | null;
                type: string;
                payload: Record<string, unknown>;
                status?: import("@/types/database.types").OutboxStatus;
                attempts?: number;
                last_attempt_at?: string | null;
                created_at?: string;
            };
            Update: {
                id?: string;
                event_id?: string | null;
                type?: string;
                payload?: Record<string, unknown>;
                status?: import("@/types/database.types").OutboxStatus;
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
            Args: {
                p_event_id: string;
            };
            Returns: {
                user_id: string;
            }[];
        };
    };
    Enums: {
        user_role: import("@/types/database.types").UserRole;
        mtg_format: import("@/types/database.types").MtgFormat;
        event_type: import("@/types/database.types").EventType;
        event_status: import("@/types/database.types").EventStatus;
        rsvp_status: import("@/types/database.types").RsvpStatus;
        subscription_target: import("@/types/database.types").SubscriptionTarget;
        day_of_week: import("@/types/database.types").DayOfWeek;
        time_slot: import("@/types/database.types").TimeSlot;
        availability_level: import("@/types/database.types").AvailabilityLevel;
        outbox_status: import("@/types/database.types").OutboxStatus;
    };
    CompositeTypes: Record<string, never>;
}, {
    PostgrestVersion: "12";
}>;
//# sourceMappingURL=supabase.d.ts.map