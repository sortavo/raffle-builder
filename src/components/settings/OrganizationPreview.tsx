import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Ticket, Calendar, ArrowRight, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface OrganizationPreviewProps {
  name: string;
  slug: string;
  logoUrl?: string | null;
  brandColor: string;
  email?: string;
}

export function OrganizationPreview({ 
  name, 
  slug, 
  logoUrl, 
  brandColor,
  email 
}: OrganizationPreviewProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  
  // Mock raffle data for preview
  const mockRaffles = [
    { 
      id: 1, 
      title: "Gran Sorteo de Navidad", 
      prize: "iPhone 15 Pro Max",
      price: 50,
      sold: 75,
      total: 100,
      date: "15 Ene 2025"
    },
    { 
      id: 2, 
      title: "Rifa Benefica", 
      prize: "Pantalla Samsung 65\"",
      price: 25,
      sold: 30,
      total: 200,
      date: "20 Ene 2025"
    },
  ];

  return (
    <div className="space-y-3">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Vista previa de tu página</p>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode("desktop")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === "desktop" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("mobile")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === "mobile" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div 
        className={cn(
          "border rounded-xl overflow-hidden bg-background shadow-inner transition-all duration-300",
          viewMode === "mobile" ? "max-w-[320px] mx-auto" : "w-full"
        )}
      >
        {/* Browser Chrome */}
        <div className="bg-muted/50 border-b px-3 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-background rounded-md px-3 py-1 text-xs text-muted-foreground truncate">
            sortavo.com/{slug || "tu-slug"}
          </div>
        </div>

        {/* Page Content - Scaled Preview */}
        <div 
          className={cn(
            "origin-top-left overflow-hidden",
            viewMode === "mobile" ? "h-[400px]" : "h-[300px]"
          )}
          style={{ 
            transform: viewMode === "mobile" ? "scale(0.9)" : "scale(0.5)",
            width: viewMode === "mobile" ? "111%" : "200%",
          }}
        >
          <div className="bg-background min-h-full">
            {/* Header */}
            <header 
              className="py-8 px-6"
              style={{ 
                background: `linear-gradient(135deg, ${brandColor}20 0%, ${brandColor}05 100%)` 
              }}
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
                    <AvatarImage src={logoUrl || undefined} alt={name} />
                    <AvatarFallback 
                      className="text-lg font-bold"
                      style={{ backgroundColor: brandColor, color: "white" }}
                    >
                      {name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{name || "Tu Organización"}</h1>
                    <p className="text-muted-foreground text-sm">
                      {mockRaffles.length} sorteos activos
                    </p>
                  </div>
                </div>
              </div>
            </header>

            {/* Raffles Grid */}
            <main className="max-w-4xl mx-auto px-6 py-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Sorteos Disponibles</h2>
              <div className={cn(
                "grid gap-4",
                viewMode === "mobile" ? "grid-cols-1" : "grid-cols-2"
              )}>
                {mockRaffles.map((raffle) => (
                  <Card key={raffle.id} className="overflow-hidden">
                    {/* Mock Image */}
                    <div 
                      className="aspect-video flex items-center justify-center"
                      style={{ backgroundColor: `${brandColor}10` }}
                    >
                      <Ticket className="h-8 w-8" style={{ color: brandColor }} />
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <div>
                        <h3 className="font-semibold text-sm line-clamp-1">{raffle.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{raffle.prize}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{raffle.sold} vendidos</span>
                          <span>{raffle.total - raffle.sold} disponibles</span>
                        </div>
                        <Progress value={(raffle.sold / raffle.total) * 100} className="h-1.5" />
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{raffle.date}</span>
                      </div>
                      <Badge 
                        className="absolute top-2 right-2 text-xs"
                        style={{ backgroundColor: brandColor }}
                      >
                        ${raffle.price}
                      </Badge>
                      <Button 
                        size="sm" 
                        className="w-full text-xs h-7"
                        style={{ backgroundColor: brandColor }}
                      >
                        Participar
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </main>

            {/* Footer */}
            <footer className="border-t py-4 px-6 text-center text-xs text-muted-foreground">
              <p>© {new Date().getFullYear()} {name || "Tu Organización"}. Todos los derechos reservados.</p>
              {email && <p className="mt-1">Contacto: {email}</p>}
            </footer>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Esta es una vista previa. Los sorteos reales aparecerán cuando los publiques.
      </p>
    </div>
  );
}
