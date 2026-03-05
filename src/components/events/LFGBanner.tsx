import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { Zap } from "lucide-react";

export function LFGBanner() {
  const { t } = useTranslation("events");
  const profile = useAuthStore((s) => s.profile);

  const { data: count } = useQuery({
    queryKey: ["lfg-count", profile?.city],
    queryFn: async () => {
      if (!profile?.city) return 0;
      const { count, error } = await supabase
        .from("looking_for_game")
        .select("*", { count: "exact", head: true })
        .eq("city", profile.city)
        .gt("expires_at", new Date().toISOString());
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!profile?.city,
    refetchInterval: 30000,
  });

  if (!count || count === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/30 px-4 py-3 text-base text-accent">
      <Zap className="h-5 w-5 shrink-0" />
      <span>{t("lfg_banner", { count })}</span>
    </div>
  );
}
