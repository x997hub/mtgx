import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquarePlus, Bug, Lightbulb, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useFeedback, type FeedbackType } from "@/hooks/useFeedback";
import { useAuthStore } from "@/store/authStore";

const FEEDBACK_TYPES: { type: FeedbackType; icon: typeof Bug; labelKey: string }[] = [
  { type: "bug", icon: Bug, labelKey: "common:feedback_bug" },
  { type: "suggestion", icon: Lightbulb, labelKey: "common:feedback_suggestion" },
  { type: "question", icon: HelpCircle, labelKey: "common:feedback_question" },
];

const MAX_BODY = 2000;

export function FeedbackModal() {
  const { t } = useTranslation("common");
  const user = useAuthStore((s) => s.user);
  const { submitFeedback, isSubmitting } = useFeedback();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [body, setBody] = useState("");

  const charCount = body.length;
  const isOverLimit = charCount > MAX_BODY;
  const canSubmit = body.trim().length > 0 && !isOverLimit && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      await submitFeedback({
        type,
        body: body.trim(),
      });
      setBody("");
      setType("bug");
      setOpen(false);
      toast({ title: t("feedback_submitted", "Feedback submitted. Thank you!") });
    } catch {
      toast({
        title: t("error_occurred"),
        variant: "destructive",
      });
    }
  };

  // Don't render the floating button if user is not authenticated
  if (!user) return null;

  return (
    <>
      {/* Floating feedback button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 end-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform hover:scale-110 md:bottom-6"
        aria-label={t("feedback", "Feedback")}
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("feedback_title", "Send feedback")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type selector */}
            <div className="flex gap-2">
              {FEEDBACK_TYPES.map(({ type: ft, icon: Icon, labelKey }) => (
                <button
                  key={ft}
                  onClick={() => setType(ft)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors",
                    type === ft
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-gray-600 text-gray-400 hover:border-gray-500"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{t(labelKey)}</span>
                </button>
              ))}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("feedback_placeholder", "Describe your issue or suggestion...")}
                className="min-h-[120px] resize-none"
              />
              <div className="flex justify-end">
                <span
                  className={cn(
                    "text-xs",
                    isOverLimit ? "text-red-400" : "text-text-secondary"
                  )}
                >
                  {charCount}/{MAX_BODY}
                </span>
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full min-h-[44px]"
            >
              {isSubmitting
                ? t("submitting", "Submitting...")
                : t("submit_feedback", "Submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
