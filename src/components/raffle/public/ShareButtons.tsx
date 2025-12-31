import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Facebook, Twitter, Link2, MessageCircle } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
}

export function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const { toast } = useToast();

  const shareText = description 
    ? `${title} - ${description}` 
    : title;

  const handleWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const handleTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "¡Enlace copiado!",
        description: "El enlace se ha copiado al portapapeles",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="lg"
        onClick={handleWhatsApp}
        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/30"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={handleFacebook}
        className="bg-muted/50 hover:bg-muted text-foreground border-border/50"
      >
        <Facebook className="h-5 w-5" />
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={handleTwitter}
        className="bg-muted/50 hover:bg-muted text-foreground border-border/50"
      >
        <Twitter className="h-5 w-5" />
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={handleCopyLink}
        className="bg-muted/50 hover:bg-muted text-foreground border-border/50"
      >
        <Link2 className="h-5 w-5" />
      </Button>
    </div>
  );
}
