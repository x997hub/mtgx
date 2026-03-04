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

export function AttendeeList({ attendees }: AttendeeListProps) {
  const { t } = useTranslation("events");

  const sorted = [...attendees].sort((a, b) => {
    const order: Record<RsvpStatus, number> = { going: 0, maybe: 1, not_going: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-300">
        {t("attendees")} ({attendees.filter((a) => a.status === "going").length})
      </h3>
      <div className="space-y-1">
        {sorted.map((attendee) => (
          <div
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
          </div>
        ))}
      </div>
    </div>
  );
}
