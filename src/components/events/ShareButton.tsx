import { useTranslation } from "react-i18next";
import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface ShareButtonProps {
  eventId: string;
  title: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ShareButton({ eventId, title, variant = "outline", size = "sm" }: ShareButtonProps) {
  const { t } = useTranslation("events");
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/events/${eventId}`;

  const handleShare = async () => {
    // Try Web Share API first (mobile browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or API failed — fall through to clipboard
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: t("link_copied", "Link copied to clipboard") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t("common:error"), variant: "destructive" });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className="gap-2"
      onClick={handleShare}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {t("share", "Share")}
    </Button>
  );
}
