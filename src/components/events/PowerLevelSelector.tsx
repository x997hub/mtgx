import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PowerLevelPicker } from "@/components/events/PowerLevelPicker";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PowerLevelSelectorProps {
  eventId: string;
  userId: string;
  currentLevel: number | null;
}

export function PowerLevelSelector({ eventId, userId, currentLevel }: PowerLevelSelectorProps) {
  const { t } = useTranslation("events");
  const queryClient = useQueryClient();
  const [level, setLevel] = useState<number | null>(currentLevel);

  const handleChange = async (newLevel: number) => {
    setLevel(newLevel);
    const { error } = await supabase
      .from("rsvps")
      .update({ power_level: newLevel })
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (error) {
      toast({ title: t("common:error_occurred"), variant: "destructive" });
      setLevel(currentLevel);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
  };

  return <PowerLevelPicker value={level} onChange={handleChange} />;
}
