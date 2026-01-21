import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useTrackingEvents } from "@/hooks/useTrackingEvents";

export interface TelegramOptInProps {
  buyerEmail: string;
  organizationTier?: string | null;
  raffleName?: string;
}

export function TelegramOptIn({ buyerEmail, organizationTier, raffleName }: TelegramOptInProps) {
  const { trackLead } = useTrackingEvents();
  
  // Only show for Premium/Enterprise organizations
  const hasTelegram = organizationTier === 'premium' || organizationTier === 'enterprise';
  
  if (!hasTelegram || !buyerEmail) {
    return null;
  }

  const emailBase64 = btoa(buyerEmail);
  const telegramLink = `https://t.me/Sortavo_bot?start=buyer_${emailBase64}`;

  const handleClick = () => {
    // Track lead event when user opts in to Telegram notifications
    trackLead({
      leadType: 'telegram_optin',
      itemName: raffleName,
      userEmail: buyerEmail,
    });
    window.open(telegramLink, "_blank");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 w-full"
      onClick={handleClick}
    >
      <Send className="h-4 w-4" />
      Recibe actualizaciones por Telegram
    </Button>
  );
}
