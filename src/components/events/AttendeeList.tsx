import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/types/database.types";

type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];

interface Attendee {
  user_id: string;
  status: RsvpStatus;
  profiles?: { display_name: string } | null;
}

interface AttendeeListProps {
  attendees: Attendee[];
}

const STATUS_COLORS: Record<RsvpStatus, string> = {
  going: "bg-emerald-700",
  maybe: "bg-amber-700",
  not_going: "bg-gray-600",
};

const STATUS_ORDER: RsvpStatus[] = ["going", "maybe", "not_going"];

export function AttendeeList({ attendees }: AttendeeListProps) {
  const { t } = useTranslation("events");

  const grouped = useMemo(() => {
    const groups: Record<RsvpStatus, Attendee[]> = {
      going: [],
      maybe: [],
      not_going: [],
    };
    for (const a of attendees) {
      groups[a.status]?.push(a);
    }
    return groups;
  }, [attendees]);

  const goingCount = grouped.going.length;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-300">
        {t("attendees")} ({goingCount})
      </h3>
      {STATUS_ORDER.map((status) => {
        const group = grouped[status];
        if (group.length === 0) return null;
        return (
          <div key={status} className="space-y-1">
            <div className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              {t(status)} ({group.length})
            </div>
            <ul className="space-y-1">
              {group.map((attendee) => (
                <li
                  key={attendee.user_id}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {attendee.profiles?.display_name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm text-gray-200">
                    {attendee.profiles?.display_name || "Unknown"}
                  </span>
                  <Badge
                    className={`border-none text-white ${STATUS_COLORS[attendee.status]}`}
                  >
                    {t(attendee.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
