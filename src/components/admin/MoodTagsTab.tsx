import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import type { Database } from "@/types/database.types";

type MoodTag = Database["public"]["Tables"]["mood_tags"]["Row"];

interface EditState {
  slug: string;
  label_en: string;
  label_ru: string;
  label_he: string;
  is_active: boolean;
}

const emptyTag: EditState = {
  slug: "",
  label_en: "",
  label_ru: "",
  label_he: "",
  is_active: true,
};

export function MoodTagsTab() {
  const { t } = useTranslation(["common", "events"]);
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [editState, setEditState] = useState<EditState>(emptyTag);

  const { data: tags, isLoading, isError } = useQuery({
    queryKey: ["admin-mood-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mood_tags")
        .select("*")
        .order("id");
      if (error) throw error;
      return data;
    },
  });

  const invalidateTags = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-mood-tags"] });
    queryClient.invalidateQueries({ queryKey: ["mood-tags"] });
  };

  const upsertMutation = useMutation({
    mutationFn: async ({ id, ...tag }: EditState & { id?: number }) => {
      const payload = {
        slug: tag.slug,
        label_en: tag.label_en,
        label_ru: tag.label_ru,
        label_he: tag.label_he || null,
        is_active: tag.is_active,
      };
      if (id) {
        const { error } = await supabase
          .from("mood_tags")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mood_tags")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setEditingId(null);
      setEditState(emptyTag);
      toast({ title: t("common:saved", "Saved") });
    },
    onSettled: invalidateTags,
    onError: () => {
      toast({ title: t("common:error_occurred"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("mood_tags")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("common:deleted", "Deleted") });
    },
    onSettled: invalidateTags,
    onError: () => {
      toast({ title: t("common:error_occurred"), variant: "destructive" });
    },
  });

  const handleDelete = (tag: MoodTag) => {
    if (!window.confirm(t("common:confirm_delete", { name: tag.slug }))) return;
    deleteMutation.mutate(tag.id);
  };

  const startEdit = (tag: MoodTag) => {
    setEditingId(tag.id);
    setEditState({
      slug: tag.slug,
      label_en: tag.label_en,
      label_ru: tag.label_ru,
      label_he: tag.label_he ?? "",
      is_active: tag.is_active,
    });
  };

  const startNew = () => {
    setEditingId("new");
    setEditState(emptyTag);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(emptyTag);
  };

  const saveEdit = () => {
    if (!editState.slug || !editState.label_en || !editState.label_ru) {
      toast({ title: t("common:fill_required", "Fill required fields"), variant: "destructive" });
      return;
    }
    const id = editingId === "new" ? undefined : (editingId as number);
    upsertMutation.mutate({ ...editState, id });
  };

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="p-4 text-danger">{t("common:error_occurred")}</p>;
  }

  return (
    <div className="space-y-3 mt-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={startNew} disabled={editingId !== null}>
          <Plus className="h-4 w-4 me-1" />
          {t("common:add", "Add")}
        </Button>
      </div>

      {editingId === "new" && (
        <Card className="bg-surface-card border-accent/40">
          <CardContent className="p-4">
            <TagEditRow
              state={editState}
              onChange={setEditState}
              onSave={saveEdit}
              onCancel={cancelEdit}
              isSaving={upsertMutation.isPending}
            />
          </CardContent>
        </Card>
      )}

      {tags?.map((tag) => (
        <Card key={tag.id} className="bg-surface-card border-surface-hover">
          <CardContent className="p-4">
            {editingId === tag.id ? (
              <TagEditRow
                state={editState}
                onChange={setEditState}
                onSave={saveEdit}
                onCancel={cancelEdit}
                isSaving={upsertMutation.isPending}
              />
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge
                    variant={tag.is_active ? "success" : "outline"}
                    className="border-none"
                  >
                    {tag.slug}
                  </Badge>
                  <span className="text-base text-text-primary truncate">
                    {tag.label_en}
                  </span>
                  <span className="text-base text-text-secondary truncate hidden sm:inline">
                    / {tag.label_ru}
                  </span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(tag)}
                    disabled={editingId !== null}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(tag)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {tags && tags.length === 0 && !editingId && (
        <p className="p-4 text-center text-text-secondary">{t("common:no_results")}</p>
      )}
    </div>
  );
}

function TagEditRow({
  state,
  onChange,
  onSave,
  onCancel,
  isSaving,
}: {
  state: EditState;
  onChange: (s: EditState) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation(["common"]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="slug"
          value={state.slug}
          onChange={(e) => onChange({ ...state, slug: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={state.is_active}
            onChange={(e) => onChange({ ...state, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-border bg-surface-hover text-accent"
          />
          {t("common:active", "Active")}
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input
          placeholder="label_en *"
          value={state.label_en}
          onChange={(e) => onChange({ ...state, label_en: e.target.value })}
        />
        <Input
          placeholder="label_ru *"
          value={state.label_ru}
          onChange={(e) => onChange({ ...state, label_ru: e.target.value })}
        />
        <Input
          placeholder="label_he"
          value={state.label_he}
          onChange={(e) => onChange({ ...state, label_he: e.target.value })}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 me-1" />
          {t("common:cancel", "Cancel")}
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          <Check className="h-4 w-4 me-1" />
          {isSaving ? "..." : t("common:save", "Save")}
        </Button>
      </div>
    </div>
  );
}
