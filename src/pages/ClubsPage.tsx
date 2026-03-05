import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function ClubsPage() {
  const { t } = useTranslation(["common", "profile"]);

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <h1 className="text-2xl font-bold text-gray-100">{t("common:clubs")}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <Building2 className="h-12 w-12 text-text-muted" />
          <div className="space-y-1">
            <p className="text-lg font-medium text-text-primary">
              {t("profile:clubs_coming_soon")}
            </p>
            <p className="text-sm text-text-secondary">
              {t("profile:clubs_coming_soon_description")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
