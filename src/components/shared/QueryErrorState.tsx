import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorStateProps {
  onRetry?: () => void;
  message?: string;
}

export function QueryErrorState({ onRetry, message }: QueryErrorStateProps) {
  const { t } = useTranslation("common");

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <AlertTriangle className="h-12 w-12 text-red-400" />
      <p className="text-base text-text-secondary">
        {message ?? t("error_occurred")}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="min-h-[44px]">
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
