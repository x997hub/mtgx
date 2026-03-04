import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const { t } = useTranslation("common");
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-accent">404</p>
      <p className="text-lg text-text-secondary">{t("page_not_found")}</p>
      <Button asChild>
        <Link to="/">{t("go_home")}</Link>
      </Button>
    </div>
  );
}
