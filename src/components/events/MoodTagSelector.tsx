import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type MoodTag = Database["public"]["Tables"]["mood_tags"]["Row"];

interface MoodTagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

const TAG_COLORS: Record<string, { active: string; inactive: string }> = {
  casual: { active: "bg-emerald-700 text-emerald-100", inactive: "bg-gray-700 text-gray-400" },
  competitive: { active: "bg-red-700 text-red-100", inactive: "bg-gray-700 text-gray-400" },
  deck_test: { active: "bg-blue-700 text-blue-100", inactive: "bg-gray-700 text-gray-400" },
  training: { active: "bg-purple-700 text-purple-100", inactive: "bg-gray-700 text-gray-400" },
};

const DEFAULT_COLORS = { active: "bg-accent text-white", inactive: "bg-gray-700 text-gray-400" };

export function MoodTagSelector({ value, onChange }: MoodTagSelectorProps) {
  const { t, i18n } = useTranslation("events");

  const { data: tags } = useQuery({
    queryKey: ["mood-tags"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("mood_tags") as any)
        .select("*")
        .eq("is_active", true)
        .order("id");
      if (error) throw error;
      return data as MoodTag[];
    },
  });

  const toggleTag = (slug: string) => {
    if (value.includes(slug)) {
      onChange(value.filter((t) => t !== slug));
    } else {
      onChange([...value, slug]);
    }
  };

  const getLabel = (tag: MoodTag): string => {
    const lang = i18n.language;
    if (lang === "ru" && tag.label_ru) return tag.label_ru;
    if (lang === "he" && tag.label_he) return tag.label_he;
    return tag.label_en;
  };

  if (!tags || tags.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>{t("mood_tags", "Mood")}</Label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const active = value.includes(tag.slug);
          const colors = TAG_COLORS[tag.slug] ?? DEFAULT_COLORS;
          return (
            <button
              key={tag.slug}
              type="button"
              aria-pressed={active}
              onClick={() => toggleTag(tag.slug)}
              className={cn(
                "rounded-full px-4 py-1.5 text-base font-medium transition-colors",
                active ? colors.active : colors.inactive
              )}
            >
              {getLabel(tag)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
