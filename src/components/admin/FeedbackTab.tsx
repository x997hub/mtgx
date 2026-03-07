import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bug, Lightbulb, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  useAdminFeedback,
  type FeedbackType,
  type FeedbackStatus,
  type FeedbackReport,
} from "@/hooks/useFeedback";
import {
  FEEDBACK_TYPE_COLORS as TYPE_COLORS,
  FEEDBACK_STATUS_COLORS as STATUS_COLORS,
  FEEDBACK_STATUSES as STATUSES,
  FEEDBACK_TYPES as TYPES,
} from "@/lib/constants";

const TYPE_ICONS: Record<FeedbackType, typeof Bug> = {
  bug: Bug,
  suggestion: Lightbulb,
  question: HelpCircle,
};

export function FeedbackTab() {
  const { t } = useTranslation(["common"]);
  const [filterType, setFilterType] = useState<FeedbackType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { feedback, isLoading, updateStatus, updateNotes } = useAdminFeedback({
    type: filterType === "all" ? undefined : filterType,
    status: filterStatus === "all" ? undefined : filterStatus,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Filters */}
      <div className="flex gap-3">
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as FeedbackType | "all")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("common:type", "Type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common:all", "All")}</SelectItem>
            {TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as FeedbackStatus | "all")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("common:status", "Status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common:all", "All")}</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Feedback list */}
      {feedback.length === 0 && (
        <p className="p-4 text-center text-text-secondary">
          {t("common:no_results")}
        </p>
      )}

      {feedback.map((item) => (
        <FeedbackItem
          key={item.id}
          item={item}
          isExpanded={expandedId === item.id}
          onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
          onStatusChange={async (status) => {
            try {
              await updateStatus({ id: item.id, status });
            } catch {
              toast({ title: t("common:error_occurred"), variant: "destructive" });
            }
          }}
          onNotesSave={async (notes) => {
            try {
              await updateNotes({ id: item.id, admin_notes: notes });
              toast({ title: t("common:saved", "Saved") });
            } catch {
              toast({ title: t("common:error_occurred"), variant: "destructive" });
            }
          }}
        />
      ))}
    </div>
  );
}

function FeedbackItem({
  item,
  isExpanded,
  onToggle,
  onStatusChange,
  onNotesSave,
}: {
  item: FeedbackReport;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: FeedbackStatus) => Promise<void>;
  onNotesSave: (notes: string) => Promise<void>;
}) {
  const { t } = useTranslation(["common"]);
  const [notes, setNotes] = useState(item.admin_notes ?? "");
  const TypeIcon = TYPE_ICONS[item.type];

  const truncatedBody =
    item.body.length > 100 ? item.body.slice(0, 100) + "..." : item.body;

  return (
    <Card className="bg-surface-card border-surface-hover">
      <CardContent className="p-4">
        {/* Summary row */}
        <div
          className="flex items-center justify-between gap-3 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Badge className={cn("border-none shrink-0", TYPE_COLORS[item.type])}>
              <TypeIcon className="h-3.5 w-3.5 me-1" />
              {item.type}
            </Badge>
            <p className="text-base text-text-primary truncate">{truncatedBody}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn("border-none", STATUS_COLORS[item.status])}>
              {item.status}
            </Badge>
            <span className="text-xs text-text-secondary whitespace-nowrap">
              {new Date(item.created_at).toLocaleDateString()}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-text-secondary" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-secondary" />
            )}
          </div>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-4 space-y-4 border-t border-surface-hover pt-4">
            {/* Full body */}
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">
                {t("common:description", "Description")}
              </p>
              <p className="text-base text-text-primary whitespace-pre-wrap">
                {item.body}
              </p>
            </div>

            {/* Screenshot */}
            {item.screenshot_url && (
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">
                  {t("common:screenshot", "Screenshot")}
                </p>
                <a
                  href={item.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  {t("common:view_screenshot", "View screenshot")}
                </a>
              </div>
            )}

            {/* Meta info */}
            <div className="text-xs text-text-secondary space-y-0.5">
              {item.page_url && <p>URL: {item.page_url}</p>}
              {item.user_agent && (
                <p>UA: {item.user_agent.slice(0, 80)}...</p>
              )}
            </div>

            {/* Status change */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary">
                {t("common:status", "Status")}:
              </span>
              <Select
                value={item.status}
                onValueChange={(v) => onStatusChange(v as FeedbackStatus)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admin notes */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">
                {t("common:admin_notes", "Admin notes")}
              </p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("common:admin_notes_placeholder", "Add internal notes...")}
                className="resize-none min-h-[80px]"
              />
              <Button
                size="sm"
                onClick={() => onNotesSave(notes)}
                disabled={notes === (item.admin_notes ?? "")}
                className="min-h-[36px]"
              >
                {t("common:save", "Save notes")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
