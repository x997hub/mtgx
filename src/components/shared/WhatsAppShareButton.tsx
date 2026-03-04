import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface WhatsAppShareButtonProps {
  eventTitle: string;
  eventUrl: string;
}

export function WhatsAppShareButton({ eventTitle, eventUrl }: WhatsAppShareButtonProps) {
  const { t } = useTranslation("events");

  const shareText = encodeURIComponent(`${eventTitle}\n${eventUrl}`);
  const whatsappUrl = `https://wa.me/?text=${shareText}`;

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      asChild
    >
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        {t("share_whatsapp")}
      </a>
    </Button>
  );
}
