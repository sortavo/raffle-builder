import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export interface TelegramOptInProps {
  buyerEmail: string;
  organizationTier?: string | null;
}

export function TelegramOptIn({ buyerEmail, organizationTier }: TelegramOptInProps) {
  // Only show for Premium/Enterprise organizations
  const hasTelegram = organizationTier === 'premium' || organizationTier === 'enterprise';
  
  if (!hasTelegram || !buyerEmail) {
    return null;
  }

  const emailBase64 = btoa(buyerEmail);
  const telegramLink = `https://t.me/SortavoBot?start=buyer_${emailBase64}`;

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 w-full"
      onClick={() => window.open(telegramLink, "_blank")}
    >
      <Send className="h-4 w-4" />
      Recibe actualizaciones por Telegram
    </Button>
  );
}
