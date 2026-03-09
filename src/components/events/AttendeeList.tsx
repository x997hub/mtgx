import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PowerLevelBadge } from "@/components/events/PowerLevelPicker";
import { cn } from "@/lib/utils";
import { RSVP_STATUS_COLORS as STATUS_COLORS, RSVP_STATUS_ORDER as STATUS_ORDER } from "@/lib/constants";
import type { Database } from "@/types/database.types";

type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];

const PLAYSTYLE_ICON: Record<string, string> = {
  casual: "\uD83C\uDFB2",
  competitive: "\u2694\uFE0F",
};

interface Attendee {
  user_id: string;
  status: RsvpStatus;
  power_level?: number | null;
  confirmed_at?: string | null;
  checked_in_at?: string | null;
  profiles?: { display_name: string; playstyle?: string | null } | null;
}

interface AttendeeListProps {
  attendees: Attendee[];
  isOrganizer?: boolean;
}

export function AttendeeList({ attendees, isOrganizer }: AttendeeListProps) {
  const { t } = useTranslation(["events", "common"]);

  const grouped = useMemo(() => {
    const groups: Record<string, Attendee[]> = {
      going: [],
      maybe: [],
      not_going: [],
      waitlisted: [],
      pending_confirmation: [],
    };
    for (const a of attendees) {
      if (groups[a.status]) {
        groups[a.status].push(a);
      }
    }
    return groups;
  }, [attendees]);

  const goingCount = grouped.going.length;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium text-text-secondary">
        {t("attendees")} ({goingCount})
      </h3>
      {STATUS_ORDER.map((status) => {
        const group = grouped[status];
        if (group.length === 0) return null;
        return (
          <div key={status} className="space-y-1">
            <div className="text-sm font-medium text-text-secondary uppercase tracking-wide">
              {t(status)} ({group.length})
            </div>
            <ul className="space-y-1">
              {group.map((attendee) => {
                const isConfirmed = !!attendee.confirmed_at;
                const isCheckedIn = !!attendee.checked_in_at;
                return (
                  <li
                    key={attendee.user_id}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5"
                  >
                    <Avatar className={cn(
                      "h-10 w-10",
                      isOrganizer && attendee.status === "going" && !isConfirmed && !isCheckedIn && "opacity-40",
                    )}>
                      <AvatarFallback className={cn(
                        "text-sm",
                        isOrganizer && isCheckedIn && "bg-emerald-600 text-white",
                        isOrganizer && isConfirmed && !isCheckedIn && "bg-accent text-white",
                      )}>
                        {attendee.profiles?.display_name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-base text-text-primary">
                      {attendee.profiles?.display_name || t("common:unknown")}
                      {attendee.profiles?.playstyle && PLAYSTYLE_ICON[attendee.profiles.playstyle] && (
                        <span className="ms-1" title={attendee.profiles.playstyle}>
                          {PLAYSTYLE_ICON[attendee.profiles.playstyle]}
                        </span>
                      )}
                    </span>
                    {isOrganizer && attendee.status === "going" && isCheckedIn && (
                      <Badge className="border-none bg-emerald-700 text-emerald-100 text-xs">
                        {t("events:checked_in", "Checked in")}
                      </Badge>
                    )}
                    {isOrganizer && attendee.status === "going" && isConfirmed && !isCheckedIn && (
                      <Badge className="border-none bg-accent/20 text-accent text-xs">
                        {t("events:confirmed", "Confirmed")}
                      </Badge>
                    )}
                    {isOrganizer && attendee.status === "going" && !isConfirmed && !isCheckedIn && (
                      <Badge className="border-none bg-yellow-600/20 text-yellow-500 text-xs">
                        {t("events:unconfirmed", "Unconfirmed")}
                      </Badge>
                    )}
                    {attendee.power_level != null && attendee.power_level >= 1 && attendee.power_level <= 5 && (
                      <PowerLevelBadge level={attendee.power_level} />
                    )}
                    <Badge
                      className={`border-none text-white ${STATUS_COLORS[attendee.status] ?? "bg-border text-text-secondary"}`}
                    >
                      {t(attendee.status)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
