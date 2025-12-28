import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Ticket, 
  Calendar, 
  Trophy, 
  Share2, 
  CheckCircle2,
  Zap,
  ShoppingCart,
  Clock,
  Eye,
  Sparkles,
  Monitor,
  Smartphone
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type ViewMode = 'desktop' | 'mobile';

interface RafflePreviewProps {
  form: UseFormReturn<any>;
  className?: string;
}

export function RafflePreview({ form, className }: RafflePreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('mobile');
  const { organization } = useAuth();
  const values = form.watch();
  
  // Get values from form
  const title = values.title || 'Título del Sorteo';
  const prizeName = values.prize_name || 'Nombre del Premio';
  const description = values.description || 'Descripción del sorteo...';
  const ticketPrice = values.ticket_price || 0;
  const totalTickets = values.total_tickets || 100;
  const prizeValue = values.prize_value || 0;
  const prizeImages = values.prize_images || [];
  const drawDate = values.draw_date;
  const currency = values.currency_code || organization?.currency_code || 'MXN';
  
  // Customization
  const customization = values.customization || {};
  const primaryColor = customization.primary_color || organization?.brand_color || '#2563EB';
  const headline = customization.headline || '';
  const ctaText = customization.cta_text || 'Comprar Boletos';
  
  // Organization branding
  const orgName = organization?.name || 'Tu Organización';
  const orgLogo = organization?.logo_url;
  
  // Simulated data
  const ticketsSold = Math.floor(totalTickets * 0.35);
  const progress = (ticketsSold / totalTickets) * 100;
  
  const mainImage = prizeImages[0] || '/placeholder.svg';

  const isMobile = viewMode === 'mobile';

  return (
    <div className={cn("bg-muted/30 rounded-lg overflow-hidden border", className)}>
      {/* Preview Header */}
      <div className="bg-background border-b px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Vista Previa</span>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="bg-muted rounded-md p-0.5"
          >
            <ToggleGroupItem 
              value="mobile" 
              aria-label="Vista móvil"
              className="h-6 w-6 p-0 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="desktop" 
              aria-label="Vista desktop"
              className="h-6 w-6 p-0 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <Monitor className="h-3.5 w-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Tiempo Real
          </Badge>
        </div>
      </div>
      
      {/* Preview Content - Scaled down version of public page */}
      <div className={cn(
        "flex justify-center bg-muted/50 overflow-hidden",
        isMobile ? "p-4" : "p-2"
      )}>
        {/* Desktop scaling container */}
        {!isMobile && (
          <div className="absolute top-12 right-3 z-10">
            <Badge variant="outline" className="text-[10px] bg-background/80 backdrop-blur-sm">
              Vista al 50%
            </Badge>
          </div>
        )}
        <div 
          className={cn(
            "bg-white rounded-lg overflow-hidden shadow-lg transition-all duration-300",
            isMobile ? "w-[320px]" : "w-[800px] origin-top"
          )}
          style={{
            maxHeight: isMobile ? '600px' : '1200px',
            overflowY: 'auto',
            transform: isMobile ? 'none' : 'scale(0.5)',
            marginBottom: isMobile ? '0' : '-300px'
          }}
        >
          {/* Device Frame for Mobile */}
          {isMobile && (
            <div className="bg-gray-900 h-6 flex items-center justify-center gap-1">
              <div className="w-12 h-1 bg-gray-700 rounded-full" />
            </div>
          )}
          
          {/* Mini Header */}
          <div 
            className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur-sm px-3 py-2"
            style={{ borderBottomColor: `${primaryColor}20` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border" style={{ borderColor: primaryColor }}>
                  <AvatarImage src={orgLogo || undefined} alt={orgName} />
                  <AvatarFallback 
                    className="text-[10px] font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {orgName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={cn("font-medium text-foreground", isMobile ? "text-xs" : "text-sm")}>{orgName}</span>
                <CheckCircle2 className="w-3 h-3 text-blue-500" />
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Share2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Hero Section */}
          <div className={cn("space-y-4", isMobile ? "p-4" : "p-6")}>
            {/* Desktop: Two column layout */}
            {!isMobile ? (
              <div className="grid grid-cols-2 gap-6">
                {/* Left: Image */}
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img 
                    src={mainImage} 
                    alt={prizeName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {prizeValue > 0 && (
                    <div 
                      className="absolute bottom-3 left-3 px-4 py-2 rounded-lg shadow text-white"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
                    >
                      <p className="text-[10px] opacity-80">Valor del Premio</p>
                      <p className="text-lg font-bold">{formatCurrency(Number(prizeValue), currency)}</p>
                    </div>
                  )}
                </div>
                
                {/* Right: Info */}
                <div className="space-y-4">
                  <Badge 
                    className="text-xs text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Sorteo Activo
                  </Badge>
                  
                  {headline && <p className="text-sm text-muted-foreground">{headline}</p>}
                  <h2 className="text-xl font-bold text-gray-900">{prizeName}</h2>
                  <p className="text-base text-gray-600">{title}</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded flex items-center justify-center"
                          style={{ backgroundColor: `${primaryColor}20` }}
                        >
                          <Ticket className="w-4 h-4" style={{ color: primaryColor }} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Precio</p>
                          <p className="text-base font-bold">{formatCurrency(Number(ticketPrice), currency)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded flex items-center justify-center"
                          style={{ backgroundColor: `${primaryColor}20` }}
                        >
                          <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Sorteo</p>
                          <p className="text-base font-bold">
                            {drawDate ? format(new Date(drawDate), 'dd MMM', { locale: es }) : 'Por definir'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{ticketsSold} de {totalTickets} vendidos</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  
                  <Button className="w-full text-white" style={{ backgroundColor: primaryColor }}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {ctaText}
                  </Button>
                </div>
              </div>
            ) : (
              /* Mobile: Single column layout */
              <>
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <Badge 
                    className="text-[10px] text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Zap className="w-2.5 h-2.5 mr-1" />
                    Sorteo Activo
                  </Badge>
                </div>

                {/* Prize Image */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                  <img 
                    src={mainImage} 
                    alt={prizeName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* Tickets sold badge */}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-white/95 rounded-full shadow text-[10px] font-medium flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    {ticketsSold} vendidos
                  </div>
                  
                  {/* Prize value */}
                  {prizeValue > 0 && (
                    <div 
                      className="absolute bottom-2 left-2 px-3 py-1.5 rounded-lg shadow text-white"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
                    >
                      <p className="text-[8px] opacity-80">Valor del Premio</p>
                      <p className="text-sm font-bold">{formatCurrency(Number(prizeValue), currency)}</p>
                    </div>
                  )}
                </div>

                {/* Prize Info */}
                <div className="space-y-1.5">
                  {headline && <p className="text-xs text-muted-foreground">{headline}</p>}
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">{prizeName}</h2>
                  <p className="text-sm text-gray-600">{title}</p>
                  {description && description !== 'Descripción del sorteo...' && (
                    <p className="text-xs text-gray-500 line-clamp-2">{description}</p>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        <Ticket className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500">Precio</p>
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(Number(ticketPrice), currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        <Calendar className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500">Sorteo</p>
                        <p className="text-sm font-bold text-gray-900">
                          {drawDate 
                            ? format(new Date(drawDate), 'dd MMM', { locale: es })
                            : 'Por definir'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-medium text-gray-700">
                      {ticketsSold} de {totalTickets} vendidos
                    </span>
                    <span className="text-gray-500">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* CTA Button */}
                <Button 
                  className="w-full text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {ctaText}
                </Button>
              </>
            )}

            {/* Countdown Preview */}
            {drawDate && (
              <Card className={cn("bg-gradient-to-r from-gray-50 to-gray-100 border", isMobile ? "p-3" : "p-4")}>
                <div className={cn("flex items-center justify-center gap-2 text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  <Clock className={cn(isMobile ? "w-3.5 h-3.5" : "w-4 h-4")} />
                  <span>Termina en: </span>
                  <span className="font-mono font-bold text-gray-900">
                    {format(new Date(drawDate), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </span>
                </div>
              </Card>
            )}

            {/* Ticket Grid Preview */}
            <div className="space-y-2">
              <h3 className={cn("font-semibold text-gray-900 flex items-center gap-2", isMobile ? "text-sm" : "text-base")}>
                <Trophy className={cn(isMobile ? "w-4 h-4" : "w-5 h-5")} style={{ color: primaryColor }} />
                Selecciona tus Boletos
              </h3>
              <div className={cn("grid gap-1", isMobile ? "grid-cols-5" : "grid-cols-8")}>
                {Array.from({ length: isMobile ? 15 : 24 }).map((_, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "aspect-square rounded font-medium flex items-center justify-center",
                      isMobile ? "text-[9px]" : "text-xs",
                      i < (isMobile ? 5 : 8) ? "bg-gray-200 text-gray-400" : "bg-green-100 text-green-700 border border-green-200"
                    )}
                  >
                    {String(i + 1).padStart(3, '0')}
                  </div>
                ))}
              </div>
              <p className={cn("text-center text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>
                Vista previa de boletos
              </p>
            </div>

            {/* FAQ Preview */}
            <div className="space-y-2">
              <h3 className={cn("font-semibold text-gray-900", isMobile ? "text-sm" : "text-base")}>Preguntas Frecuentes</h3>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="1" className="border rounded-lg px-3">
                  <AccordionTrigger className={cn("py-2 hover:no-underline", isMobile ? "text-xs" : "text-sm")}>
                    ¿Cómo funciona el sorteo?
                  </AccordionTrigger>
                  <AccordionContent className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>
                    Selecciona tus boletos favoritos y completa el pago...
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
          
          {/* Mobile bottom bar */}
          {isMobile && (
            <div className="bg-gray-900 h-4 flex items-center justify-center">
              <div className="w-24 h-1 bg-gray-700 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
