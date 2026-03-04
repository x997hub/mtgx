import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface EventCountdownProps {
  startsAt: string;
}

function getTimeLeft(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  return { days, hours, minutes };
}

export function EventCountdown({ startsAt }: EventCountdownProps) {
  const { t } = useTranslation("events");
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(new Date(startsAt)));

  useEffect(() => {
    const target = new Date(startsAt);
    setTimeLeft(getTimeLeft(target));
    const interval = setInterval(() => {
      const remaining = getTimeLeft(target);
      setTimeLeft(remaining);
      if (!remaining) clearInterval(interval);
    }, 60000);
    return () => clearInterval(interval);
  }, [startsAt]);

  if (!timeLeft) return null;

  return (
    <div role="timer" aria-live="polite" className="flex items-center gap-1 text-sm text-gray-400">
      <span>{t("starts_in")}</span>
      {timeLeft.days > 0 && (
        <span className="font-medium text-gray-200">
          {timeLeft.days} {t("days")}
        </span>
      )}
      <span className="font-medium text-gray-200">
        {timeLeft.hours} {t("hours")}
      </span>
      <span className="font-medium text-gray-200">
        {timeLeft.minutes} {t("minutes")}
      </span>
    </div>
  );
}
