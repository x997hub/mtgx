import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bug, Lightbulb, HelpCircle, ChevronDown, ChevronUp, Clock } from "lucide-react";
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function FeedbackTab() {
  const { t } = useTranslation(["common"]);
  const [filterType, setFilterType] = useState<FeedbackType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { feedback, isLoading, updateStatus, updateNotes } = useAdminFeedback({
    type: filterType === "all" ? undefined : filterType,
    status: filterStatus === "all" ? undefined : filterStatus,
  });

  // Get counts for "all" view
  const { feedback: allFeedback } = useAdminFeedback({});
  const newCount = allFeedback.filter((f) => f.status === "new").length;

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
    <div className="space-y-4 mt-2">
      {/* Filters */}
      <div className="flex gap-3">
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as FeedbackType | "all")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("common:type", "Type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common:all", "All")}</SelectItem>
            {TYPES.map((type) => {
              const Icon = TYPE_ICONS[type];
              return (
                <SelectItem key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {t(`common:feedback.type_${type}`, type)}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as FeedbackStatus | "all")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("common:status", "Status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common:all", "All")}</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`common:feedback.status_${status}`, status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* New count badge */}
        {newCount > 0 && (
          <Badge variant="danger" className="border-none self-center">
            {newCount} {t("common:feedback.status_new", "new")}
          </Badge>
        )}
      </div>

      {/* Count */}
      <p className="text-sm text-text-secondary">
        {feedback.length} {t("common:feedback.feedback_title", "feedback").toLowerCase()}
      </p>

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
  const TypeIcon = TYPE_ICONS[item.type as FeedbackType];

  const truncatedBody =
    item.body.length > 120 ? item.body.slice(0, 120) + "..." : item.body;

  return (
    <Card className={cn(
      "bg-surface-card transition-colors",
      item.status === "new" ? "border-accent/40" : "border-surface-hover"
    )}>
      <CardContent className="p-4">
        {/* Summary row */}
        <div
          className="flex items-start justify-between gap-3 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Badge className={cn("border-none shrink-0 mt-0.5", TYPE_COLORS[item.type as FeedbackType])}>
              <TypeIcon className="h-3.5 w-3.5 me-1" />
              {t(`common:feedback.type_${item.type}`, item.type)}
            </Badge>
            <div className="min-w-0">
              <p className="text-base text-text-primary">{truncatedBody}</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3 text-text-secondary" />
                <span className="text-xs text-text-secondary">
                  {timeAgo(item.created_at)}
                </span>
                {item.admin_notes && (
                  <Badge variant="info" className="border-none text-xs">
                    {t("common:feedback.admin_notes", "notes")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn("border-none", STATUS_COLORS[item.status as FeedbackStatus])}>
              {t(`common:feedback.status_${item.status}`, item.status)}
            </Badge>
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
              <p className="text-base text-text-primary whitespace-pre-wrap bg-surface-hover/50 rounded-lg p-3">
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
            {(item.page_url || item.user_agent) && (
              <div className="text-xs text-text-secondary bg-surface-hover/30 rounded p-2 space-y-0.5 font-mono">
                {item.page_url && <p>URL: {item.page_url}</p>}
                {item.user_agent && <p>UA: {item.user_agent.slice(0, 100)}</p>}
              </div>
            )}

            {/* Status change */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary">
                {t("common:status", "Status")}:
              </span>
              <Select
                value={item.status}
                onValueChange={(v) => onStatusChange(v as FeedbackStatus)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`common:feedback.status_${s}`, s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admin notes */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">
                {t("common:feedback.admin_notes", "Admin notes")}
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
                {t("common:save", "Save")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
