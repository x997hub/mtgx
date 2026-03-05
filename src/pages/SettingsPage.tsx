import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { usePush } from "@/hooks/usePush";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Globe, Bell, BellOff, LogOut, Trash2, User, MapPin, Layers } from "lucide-react";
import type { SubscriptionTarget } from "@/types/database.types";

const TARGET_TYPE_ICONS: Record<SubscriptionTarget, typeof User> = {
  organizer: User,
  venue: MapPin,
  format_city: Layers,
};

function getSubscriptionLabel(sub: { target_type: SubscriptionTarget; target_id: string | null; format: string | null; city: string | null }, t: (key: string) => string): string {
  switch (sub.target_type) {
    case "format_city":
      return `${sub.format ?? "?"} — ${sub.city ?? "?"}`;
    case "organizer":
      return sub.target_id ? `ID: ${sub.target_id.slice(0, 8)}...` : t("common:unknown");
    case "venue":
      return sub.target_id ? `ID: ${sub.target_id.slice(0, 8)}...` : t("common:unknown");
    default:
      return String(sub.target_id ?? "");
  }
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation(["common", "profile"]);
  const { logout } = useAuth();
  const { subscriptions, unsubscribe } = useSubscription();
  const { permission, requestPermission, isSupported } = usePush();

  const currentLang = i18n.language;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold text-text-primary">{t("common:settings")}</h1>

      {/* Language */}
      <Card className="bg-surface-card border-surface-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <Globe className="h-5 w-5" />
            {t("profile:language")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            variant={currentLang.startsWith("en") ? "default" : "outline"}
            onClick={() => i18n.changeLanguage("en")}
            className="min-h-[44px]"
          >
            EN
          </Button>
          <Button
            variant={currentLang.startsWith("ru") ? "default" : "outline"}
            onClick={() => i18n.changeLanguage("ru")}
            className="min-h-[44px]"
          >
            RU
          </Button>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card className="bg-surface-card border-surface-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <Bell className="h-5 w-5" />
            {t("common:notifications")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isSupported ? (
            <p className="text-base text-text-secondary">
              {t("profile:push_not_supported", "Push notifications not supported in this browser")}
            </p>
          ) : permission === "granted" ? (
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-400" />
              <span className="text-base text-emerald-400">
                {t("profile:push_enabled", "Push notifications enabled")}
              </span>
            </div>
          ) : permission === "denied" ? (
            <div className="flex items-center gap-2">
              <BellOff className="h-5 w-5 text-red-400" />
              <span className="text-base text-red-400">
                {t("profile:push_denied", "Push notifications blocked by browser")}
              </span>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={requestPermission}
              className="min-h-[44px]"
            >
              <Bell className="mr-2 h-4 w-4" />
              {t("profile:push_enable", "Enable Push Notifications")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Subscriptions */}
      <Card className="bg-surface-card border-surface-hover">
        <CardHeader>
          <CardTitle className="text-text-primary">
            {t("common:subscriptions", "Subscriptions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-base text-text-secondary">{t("common:no_subscriptions", "No subscriptions yet")}</p>
          ) : (
            <ul className="space-y-2">
              {subscriptions.map((sub) => {
                const Icon = TARGET_TYPE_ICONS[sub.target_type] ?? Bell;
                return (
                  <li key={sub.id} className="flex items-center justify-between rounded-lg bg-surface p-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-text-secondary" />
                      <Badge variant="outline">{sub.target_type}</Badge>
                      <span className="text-base text-text-secondary">
                        {getSubscriptionLabel(sub, t)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unsubscribe(sub.id)}
                      className="min-h-[44px] min-w-[44px] text-red-400 hover:text-red-300"
                      aria-label={t("common:unsubscribe")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Separator className="bg-surface-hover" />

      {/* Logout */}
      <Button
        variant="destructive"
        onClick={logout}
        className="w-full min-h-[44px]"
      >
        <LogOut className="mr-2 h-4 w-4" />
        {t("common:logout")}
      </Button>
    </div>
  );
}
