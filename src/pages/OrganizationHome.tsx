import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useOrganizationBySlug } from "@/hooks/useOrganizationBySlug";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2, Calendar, Ticket, Building2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/currency-utils";

export default function OrganizationHome() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: organization, isLoading, error } = useOrganizationBySlug(orgSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Building2 className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Organización no encontrada</h1>
        <p className="text-muted-foreground">La organización que buscas no existe o no está disponible.</p>
        <Button asChild variant="outline">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  const brandColor = organization.brand_color || "#2563EB";

  return (
    <>
      <Helmet>
        <title>{organization.name} - Sorteos</title>
        <meta name="description" content={`Participa en los sorteos de ${organization.name}. Compra tus boletos y gana increíbles premios.`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header with branding */}
        <header 
          className="relative py-12 px-4"
          style={{ 
            background: `linear-gradient(135deg, ${brandColor}20 0%, ${brandColor}05 100%)` 
          }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
                <AvatarFallback 
                  className="text-2xl font-bold"
                  style={{ backgroundColor: brandColor, color: "white" }}
                >
                  {organization.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h1 className="text-3xl font-bold text-foreground">{organization.name}</h1>
                <p className="text-muted-foreground mt-1">
                  {organization.raffles.length} {organization.raffles.length === 1 ? "sorteo activo" : "sorteos activos"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Raffles Grid */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {organization.raffles.length === 0 ? (
            <div className="text-center py-16">
              <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No hay sorteos activos
              </h2>
              <p className="text-muted-foreground">
                Esta organización no tiene sorteos disponibles en este momento.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-6">Sorteos Disponibles</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {organization.raffles.map((raffle) => {
                  const progressPercent = raffle.total_tickets > 0 
                    ? (raffle.tickets_sold / raffle.total_tickets) * 100 
                    : 0;
                  const prizeImage = raffle.prize_images?.[0];

                  return (
                    <Card 
                      key={raffle.id} 
                      className="overflow-hidden hover:shadow-lg transition-shadow group"
                    >
                      {/* Prize Image */}
                      <div className="aspect-video relative overflow-hidden bg-muted">
                        {prizeImage ? (
                          <img 
                            src={prizeImage} 
                            alt={raffle.prize_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Ticket className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge 
                          className="absolute top-3 right-3"
                          style={{ backgroundColor: brandColor }}
                        >
                          {formatCurrency(raffle.ticket_price, raffle.currency_code || "MXN")}
                        </Badge>
                      </div>

                      <CardContent className="p-4 space-y-4">
                        <div>
                          <h3 className="font-semibold text-foreground line-clamp-1">
                            {raffle.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {raffle.prize_name}
                          </p>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{raffle.tickets_sold} vendidos</span>
                            <span>{raffle.tickets_available} disponibles</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>

                        {/* Draw Date */}
                        {raffle.draw_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Sorteo: {format(new Date(raffle.draw_date), "d 'de' MMMM, yyyy", { locale: es })}
                            </span>
                          </div>
                        )}

                        {/* CTA Button */}
                        <Button 
                          asChild 
                          className="w-full group/btn"
                          style={{ backgroundColor: brandColor }}
                        >
                          <Link to={`/${orgSlug}/${raffle.slug}`}>
                            Participar
                            <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t bg-muted/30 py-6 px-4 mt-auto">
          <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} {organization.name}. Todos los derechos reservados.</p>
            {organization.email && (
              <p className="mt-1">
                Contacto: <a href={`mailto:${organization.email}`} className="underline hover:text-foreground">{organization.email}</a>
              </p>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}
