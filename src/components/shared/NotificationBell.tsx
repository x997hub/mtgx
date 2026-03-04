import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const count = useUIStore((s) => s.notificationsCount);

  return (
    <Link
      to="/settings"
      className="relative flex min-h-[44px] min-w-[44px] items-center justify-center"
    >
      <Bell className="h-5 w-5 text-gray-300" />
      {count > 0 && (
        <span
          className={cn(
            "absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e94560] px-1 text-[10px] font-bold text-white"
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
