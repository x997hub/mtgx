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
  const target = new Date(startsAt);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(target));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(target));
    }, 60000);
    return () => clearInterval(interval);
  }, [startsAt]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-1 text-sm text-gray-400">
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
