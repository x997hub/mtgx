import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Globe,
  Phone,
  MessageCircle,
  Facebook,
  Instagram,
} from "lucide-react";
import type { Venue } from "@/types/database.types";

interface VenueContactsProps {
  venue: Venue;
}

function ContactRow({
  icon: Icon,
  label,
  href,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  text: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover"
    >
      <Icon className="h-5 w-5 shrink-0 text-text-secondary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-sm text-accent truncate">{text}</p>
      </div>
    </a>
  );
}

export function VenueContacts({ venue }: VenueContactsProps) {
  const { t } = useTranslation("venue");

  const hasStructured =
    venue.website ||
    venue.phone ||
    venue.whatsapp_url ||
    venue.facebook_url ||
    venue.instagram_url;
  const hasLegacy =
    venue.contacts &&
    typeof venue.contacts === "object" &&
    Object.keys(venue.contacts as Record<string, string>).length > 0;

  if (!hasStructured && !hasLegacy) return null;

  const displayUrl = (url: string) =>
    url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-text-secondary">
          {t("contacts")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 -mx-3">
        {venue.website && (
          <ContactRow
            icon={Globe}
            label={t("website")}
            href={
              venue.website.startsWith("http")
                ? venue.website
                : `https://${venue.website}`
            }
            text={displayUrl(venue.website)}
          />
        )}
        {venue.phone && (
          <ContactRow
            icon={Phone}
            label={t("phone")}
            href={`tel:${venue.phone}`}
            text={venue.phone}
          />
        )}
        {venue.whatsapp_url && (
          <ContactRow
            icon={MessageCircle}
            label={t("whatsapp_group")}
            href={venue.whatsapp_url}
            text="WhatsApp"
          />
        )}
        {venue.facebook_url && (
          <ContactRow
            icon={Facebook}
            label={t("facebook")}
            href={venue.facebook_url}
            text={displayUrl(venue.facebook_url)}
          />
        )}
        {venue.instagram_url && (
          <ContactRow
            icon={Instagram}
            label={t("instagram")}
            href={venue.instagram_url}
            text={displayUrl(venue.instagram_url)}
          />
        )}
        {hasLegacy && hasStructured && (
          <div className="pt-2 px-3">
            <p className="text-xs text-text-secondary mb-1">
              {t("other_contacts")}
            </p>
          </div>
        )}
        {hasLegacy &&
          Object.entries(venue.contacts as Record<string, string>).map(
            ([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between px-3 py-1.5 text-sm"
              >
                <span className="text-text-secondary">{label}</span>
                <span className="text-text-primary">{value}</span>
              </div>
            ),
          )}
      </CardContent>
    </Card>
  );
}
