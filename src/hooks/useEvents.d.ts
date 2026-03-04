export declare function useEvents(): {
    events: ({
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
    } & {
        venues?: {
            name: string;
            city: string;
        } | null;
        profiles?: {
            display_name: string;
        } | null;
    })[];
    isLoading: boolean;
    fetchNextPage: (options?: import("@tanstack/query-core").FetchNextPageOptions) => Promise<import("@tanstack/query-core").InfiniteQueryObserverResult<import("@tanstack/query-core").InfiniteData<({
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
    } & {
        venues?: {
            name: string;
            city: string;
        } | null;
        profiles?: {
            display_name: string;
        } | null;
    })[], unknown>, Error>>;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    createEvent: import("@tanstack/react-query").UseMutateAsyncFunction<{
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
    }, Error, {
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
    }, unknown>;
    isCreating: boolean;
};
export declare function useEvent(eventId: string): import("@tanstack/react-query").UseQueryResult<{
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
} & {
    venues?: {
        name: string;
        city: string;
        address: string;
    } | null;
    profiles?: {
        display_name: string;
    } | null;
}, Error>;
export declare function useEventRsvps(eventId: string): import("@tanstack/react-query").UseQueryResult<({
    id: number;
    event_id: string;
    user_id: string;
    status: import("@/types/database.types").RsvpStatus;
    created_at: string;
    updated_at: string;
} & {
    profiles?: {
        display_name: string;
    } | null;
})[], Error>;
//# sourceMappingURL=useEvents.d.ts.map