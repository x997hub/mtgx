import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
export function useRSVP() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ eventId, status }) => {
            const { data: { user }, } = await supabase.auth.getUser();
            if (!user)
                throw new Error("Not authenticated");
            const { data, error } = await supabase
                .from("rsvps")
                .upsert({ event_id: eventId, user_id: user.id, status, updated_at: new Date().toISOString() }, { onConflict: "event_id,user_id" })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onMutate: async ({ eventId, status }) => {
            await queryClient.cancelQueries({ queryKey: ["rsvps", eventId] });
            const previous = queryClient.getQueryData(["rsvps", eventId]);
            queryClient.setQueryData(["rsvps", eventId], (old) => {
                if (!Array.isArray(old))
                    return old;
                return old.map((r) => {
                    const item = r;
                    return item.user_id === "optimistic" ? { ...item, status } : item;
                });
            });
            return { previous };
        },
        onError: (_err, { eventId }, context) => {
            if (context?.previous) {
                queryClient.setQueryData(["rsvps", eventId], context.previous);
            }
        },
        onSettled: (_data, _err, { eventId }) => {
            queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        },
    });
}
