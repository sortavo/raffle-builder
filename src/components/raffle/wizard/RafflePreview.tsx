import { useState, useRef, useEffect } from 'react';
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
import { getTemplateById } from '@/lib/raffle-utils';

type ViewMode = 'desktop' | 'mobile';

export type PreviewSection = 'template' | 'colors' | 'logo' | 'features' | 'faq';

interface RafflePreviewProps {
  form: UseFormReturn<any>;
  className?: string;
  activeSection?: PreviewSection;
  scrollProgress?: number;
}

export function RafflePreview({ form, className, activeSection, scrollProgress }: RafflePreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('mobile');
  const { organization } = useAuth();
  const values = form.watch();
  
  // Refs for scroll sync
  const headerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const packagesRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Anti-bounce: track if user is manually scrolling the preview
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoScrollingRef = useRef(false);
  const lastAutoScrollAtRef = useRef(0);
  const lastActiveSectionRef = useRef<PreviewSection | undefined>(undefined);
  
  // Listen for manual scroll on preview container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // Ignore scroll events triggered by auto-scroll (within 200ms)
      if (isAutoScrollingRef.current) return;
      if (performance.now() - lastAutoScrollAtRef.current < 200) return;
      
      isUserScrollingRef.current = true;
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Re-enable auto-scroll after 1.2s of no manual scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 1200);
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);
  
  // Proportional scroll sync (when scrollProgress is provided)
  useEffect(() => {
    console.log('🎨 Preview useEffect, scrollProgress:', scrollProgress);
    
    if (scrollProgress === undefined) {
      console.log('❌ scrollProgress es undefined');
      return;
    }
    
    if (isUserScrollingRef.current) {
      console.log('⏸️ Usuario scrolleando, pausando sync');
      return;
    }
    
    const container = containerRef.current;
    if (!container) {
      console.log('❌ No container ref');
      return;
    }
    
    const maxScroll = container.scrollHeight - container.clientHeight;
    console.log('📐 Preview metrics:', {
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      maxScroll
    });
    
    if (maxScroll <= 0) {
      console.log('⚠️ Preview no scrolleable, maxScroll:', maxScroll);
      return;
    }
    
    const targetTop = Math.round(scrollProgress * maxScroll);
    
    // Skip if already at the target (avoid jitter)
    if (Math.abs(container.scrollTop - targetTop) < 2) {
      console.log('🔄 Ya en target, skip. scrollTop:', container.scrollTop, 'targetTop:', targetTop);
      return;
    }
    
    console.log('🎯 Aplicando scroll:', {
      scrollProgress: Math.round(scrollProgress * 100) + '%',
      maxScroll,
      targetTop,
      currentScrollTop: container.scrollTop
    });
    
    // Mark timestamp and flag for anti-bounce
    lastAutoScrollAtRef.current = performance.now();
    isAutoScrollingRef.current = true;
    container.scrollTop = targetTop;
    
    console.log('✅ ScrollTop aplicado, nuevo scrollTop:', container.scrollTop);
    
    // Clear flag after a short delay
    setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 50);
  }, [scrollProgress]);
  
  // ResizeObserver to re-sync when preview content height changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || scrollProgress === undefined) return;
    
    const observer = new ResizeObserver(() => {
      if (isUserScrollingRef.current) return;
      
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 0) return;
      
      const targetTop = Math.round(scrollProgress * maxScroll);
      container.scrollTop = targetTop;
    });
    
    observer.observe(container);
    
    return () => observer.disconnect();
  }, [scrollProgress]);
  
  // Controlled scroll to section (fallback when scrollProgress is not used)
  useEffect(() => {
    // Skip if proportional scroll is active
    if (scrollProgress !== undefined) return;
    // Skip if user is scrolling manually or section hasn't changed
    if (!activeSection || isUserScrollingRef.current) return;
    if (activeSection === lastActiveSectionRef.current) return;
    
    lastActiveSectionRef.current = activeSection;
    
    const sectionToRef: Record<PreviewSection, React.RefObject<HTMLDivElement | null>> = {
      'template': heroRef,
      'colors': headerRef,
      'logo': headerRef,
      'features': packagesRef,
      'faq': faqRef,
    };
    
    const targetRef = sectionToRef[activeSection];
    const container = containerRef.current;
    const target = targetRef?.current;
    
    if (!target || !container) return;
    
    // Calculate scroll position within container
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const headerOffset = headerRef.current?.getBoundingClientRect().height || 0;
    
    const scrollTop = (targetRect.top - containerRect.top) + container.scrollTop - headerOffset - 8;
    
    // Mark as auto-scrolling to prevent triggering the manual scroll lock
    isAutoScrollingRef.current = true;
    
    container.scrollTo({
      top: Math.max(0, scrollTop),
      behavior: 'smooth'
    });
    
    // Clear auto-scroll flag after animation completes
    setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 400);
  }, [activeSection, scrollProgress]);
  
  // Get template from form selection
  const template = getTemplateById(values.template_id);
  const { colors, fonts, effects } = template;
  const isDarkTemplate = colors.background === '#030712' || colors.background.startsWith('rgba(3,');
  
  // Get values from form
  const title = values.title || 'Título del Sorteo';
  const description = values.description || 'Descripción del sorteo...';
  const ticketPrice = values.ticket_price || 0;
  const totalTickets = values.total_tickets || 100;
  const prizeImages = values.prize_images || [];
  const drawDate = values.draw_date;
  const currency = values.currency_code || organization?.currency_code || 'MXN';
  
  // Get prizes from new field or fallback to legacy
  const prizes = values.prizes || [];
  const firstPrize = prizes[0];
  const prizeName = firstPrize?.name || values.prize_name || 'Nombre del Premio';
  const prizeValue = firstPrize?.value || values.prize_value || 0;
  const prizeCurrency = firstPrize?.currency || currency;
  const hasMultiplePrizes = prizes.length > 1;
  
  // Customization - use template primary or custom override
  const customization = values.customization || {};
  const primaryColor = customization.primary_color || colors.primary;
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
          {scrollProgress !== undefined && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              {Math.round(scrollProgress * 100)}%
            </Badge>
          )}
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
      <div className="flex justify-center bg-muted/50 p-3">
        <div 
          ref={containerRef}
          data-preview-scroll="true"
          className={cn(
            "rounded-lg overflow-hidden shadow-lg transition-all duration-300 overscroll-contain",
            isMobile ? "w-[320px]" : "w-full max-w-[400px]"
          )}
          style={{
            backgroundColor: colors.background,
            fontFamily: `"${fonts.body}", sans-serif`,
            maxHeight: '600px',
            overflowY: 'auto',
            borderRadius: effects.borderRadius,
            boxShadow: effects.shadow,
          }}
        >
          {/* Device Frame for Mobile */}
          {isMobile && (
            <div 
              className="h-6 flex items-center justify-center gap-1"
              style={{ backgroundColor: isDarkTemplate ? '#030712' : '#111827' }}
            >
              <div className="w-12 h-1 bg-gray-700 rounded-full" />
            </div>
          )}
          
          {/* Mini Header - Full bar uses primary color tint */}
          <div 
            ref={headerRef}
            className="sticky top-0 z-10 border-b px-3 py-2 relative overflow-hidden"
            style={{ 
              backgroundColor: colors.background,
              backdropFilter: effects.glassmorphism?.enabled ? 'blur(12px)' : undefined,
              borderBottomColor: `${primaryColor}30`,
            }}
          >
            {/* Primary color overlay for entire header bar */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ 
                backgroundColor: primaryColor,
                opacity: isDarkTemplate ? 0.20 : 0.12,
              }}
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border-2 shadow-sm" style={{ borderColor: primaryColor }}>
                  <AvatarImage src={orgLogo || undefined} alt={orgName} />
                  <AvatarFallback 
                    className="text-[10px] font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {orgName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span 
                  className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}
                  style={{ color: colors.text }}
                >
                  {orgName}
                </span>
                <CheckCircle2 className="w-3 h-3" style={{ color: primaryColor }} />
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Share2 className="w-3 h-3" style={{ color: colors.textMuted }} />
              </Button>
            </div>
          </div>

          {/* Hero Section */}
          <div ref={heroRef} className="space-y-3 p-3">
            {/* Desktop: Compact two column layout */}
            {!isMobile ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Left: Image */}
                <div 
                  className="relative aspect-[4/5] rounded-lg overflow-hidden"
                  style={{ backgroundColor: isDarkTemplate ? '#1e293b' : '#f1f5f9' }}
                >
                  <img 
                    src={mainImage} 
                    alt={prizeName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {prizeValue > 0 && (
                    <div 
                      className="absolute bottom-2 left-2 px-2 py-1 rounded-md shadow text-white"
                      style={{ background: effects.gradient }}
                    >
                      <p className="text-[8px] opacity-80">Valor</p>
                      <p className="text-xs font-bold">{formatCurrency(Number(prizeValue), prizeCurrency)}</p>
                    </div>
                  )}
                </div>
                
                {/* Right: Info */}
                <div className="space-y-2 flex flex-col">
                  <Badge 
                    className="text-[10px] text-white w-fit"
                    style={{ background: effects.gradient }}
                  >
                    <Zap className="w-2.5 h-2.5 mr-1" />
                    Activo
                  </Badge>
                  <h2 
                    className="text-sm font-bold leading-tight"
                    style={{ color: colors.text, fontFamily: `"${fonts.title}", sans-serif` }}
                  >
                    {prizeName}
                    {hasMultiplePrizes && <span className="text-xs font-normal ml-1" style={{ color: colors.textMuted }}>+{prizes.length - 1} más</span>}
                  </h2>
                  <p className="text-[10px] line-clamp-1" style={{ color: colors.textMuted }}>{title}</p>
                  
                  <div className="grid grid-cols-2 gap-1.5 flex-1">
                    <div 
                      className="p-1.5 rounded border"
                      style={{ 
                        backgroundColor: colors.cardBg,
                        borderColor: `${primaryColor}15`,
                      }}
                    >
                      <p className="text-[8px]" style={{ color: colors.textMuted }}>Precio</p>
                      <p className="text-[10px] font-bold" style={{ color: colors.text }}>
                        {formatCurrency(Number(ticketPrice), currency)}
                      </p>
                    </div>
                    <div 
                      className="p-1.5 rounded border"
                      style={{ 
                        backgroundColor: colors.cardBg,
                        borderColor: `${primaryColor}15`,
                      }}
                    >
                      <p className="text-[8px]" style={{ color: colors.textMuted }}>Sorteo</p>
                      <p className="text-[10px] font-bold" style={{ color: colors.text }}>
                        {drawDate ? format(new Date(drawDate), 'dd MMM', { locale: es }) : 'Por definir'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px]" style={{ color: colors.textMuted }}>
                      <span className="font-medium">{ticketsSold}/{totalTickets}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                  
                  <Button size="sm" className="w-full text-white text-[10px] h-7" style={{ background: effects.gradient }}>
                    <ShoppingCart className="w-3 h-3 mr-1" />
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
                    style={{ background: effects.gradient }}
                  >
                    <Zap className="w-2.5 h-2.5 mr-1" />
                    Sorteo Activo
                  </Badge>
                </div>

                {/* Prize Image */}
                <div 
                  className="relative aspect-[4/3] rounded-xl overflow-hidden"
                  style={{ backgroundColor: isDarkTemplate ? '#1e293b' : '#f1f5f9' }}
                >
                  <img 
                    src={mainImage} 
                    alt={prizeName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* Tickets sold badge */}
                  <div 
                    className="absolute top-2 right-2 px-2 py-1 rounded-full shadow text-[10px] font-medium flex items-center gap-1"
                    style={{ backgroundColor: isDarkTemplate ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.95)' }}
                  >
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    {ticketsSold} vendidos
                  </div>
                  
                  {/* Prize value */}
                  {prizeValue > 0 && (
                    <div 
                      className="absolute bottom-2 left-2 px-3 py-1.5 rounded-lg shadow text-white"
                      style={{ background: effects.gradient }}
                    >
                      <p className="text-[8px] opacity-80">Valor del Premio</p>
                      <p className="text-sm font-bold">{formatCurrency(Number(prizeValue), prizeCurrency)}</p>
                    </div>
                  )}
                </div>

                {/* Prize Info */}
                <div className="space-y-1.5">
                  {headline && <p className="text-xs" style={{ color: colors.textMuted }}>{headline}</p>}
                  <h2 
                    className="text-lg font-bold leading-tight"
                    style={{ color: colors.text, fontFamily: `"${fonts.title}", sans-serif` }}
                  >
                    {prizeName}
                    {hasMultiplePrizes && <span className="text-sm font-normal ml-2" style={{ color: colors.textMuted }}>+{prizes.length - 1} más</span>}
                  </h2>
                  <p className="text-sm" style={{ color: colors.textMuted }}>{title}</p>
                  {description && description !== 'Descripción del sorteo...' && (
                    <p className="text-xs line-clamp-2" style={{ color: colors.textMuted }}>{description}</p>
                  )}
                  
                  {/* Show additional prizes if any */}
                  {hasMultiplePrizes && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {prizes.slice(1, 4).map((prize: any, idx: number) => (
                        <span 
                          key={prize.id || idx} 
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: colors.cardBg, color: colors.textMuted }}
                        >
                          {prize.name}
                        </span>
                      ))}
                      {prizes.length > 4 && (
                        <span 
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: colors.cardBg, color: colors.textMuted }}
                        >
                          +{prizes.length - 4} más
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div 
                    className="p-2.5 rounded-lg border"
                    style={{ 
                      backgroundColor: colors.cardBg,
                      borderColor: `${primaryColor}15`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        <Ticket className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: colors.textMuted }}>Precio</p>
                        <p className="text-sm font-bold" style={{ color: colors.text }}>
                          {formatCurrency(Number(ticketPrice), currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div 
                    className="p-2.5 rounded-lg border"
                    style={{ 
                      backgroundColor: colors.cardBg,
                      borderColor: `${primaryColor}15`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        <Calendar className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: colors.textMuted }}>Sorteo</p>
                        <p className="text-sm font-bold" style={{ color: colors.text }}>
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
                  <div className="flex justify-between text-[10px]" style={{ color: colors.textMuted }}>
                    <span className="font-medium">
                      {ticketsSold} de {totalTickets} vendidos
                    </span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* CTA Button */}
                <Button 
                  className="w-full text-white"
                  style={{ background: effects.gradient }}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {ctaText}
                </Button>
              </>
            )}

            {/* Countdown Preview */}
            {drawDate && (
              <Card 
                className="border p-2"
                style={{ 
                  background: isDarkTemplate 
                    ? `linear-gradient(to right, ${colors.cardBg}, ${colors.cardBg})`
                    : 'linear-gradient(to right, #f9fafb, #f3f4f6)',
                  borderColor: `${primaryColor}15`,
                }}
              >
                <div className="flex items-center justify-center gap-1.5 text-[10px]" style={{ color: colors.textMuted }}>
                  <Clock className="w-3 h-3" />
                  <span>Termina: </span>
                  <span className="font-mono font-bold" style={{ color: colors.text }}>
                    {format(new Date(drawDate), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </span>
                </div>
              </Card>
            )}

            {/* Ticket Grid Preview */}
            <div ref={packagesRef} className="space-y-1.5">
              <h3 
                className="font-semibold flex items-center gap-1.5 text-xs"
                style={{ color: colors.text, fontFamily: `"${fonts.title}", sans-serif` }}
              >
                <Trophy className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                Selecciona tus Boletos
              </h3>
              <div className="grid grid-cols-8 gap-0.5">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div 
                    key={i}
                    className="aspect-square rounded text-[7px] font-medium flex items-center justify-center"
                    style={{
                      backgroundColor: i < 5 
                        ? (isDarkTemplate ? 'rgba(100,116,139,0.3)' : '#e5e7eb')
                        : (isDarkTemplate ? 'rgba(16,185,129,0.2)' : '#dcfce7'),
                      color: i < 5 
                        ? colors.textMuted 
                        : (isDarkTemplate ? '#10B981' : '#15803d'),
                      border: i < 5 ? 'none' : `1px solid ${isDarkTemplate ? 'rgba(16,185,129,0.3)' : '#bbf7d0'}`,
                    }}
                  >
                    {String(i + 1).padStart(3, '0')}
                  </div>
                ))}
              </div>
              <p className="text-center text-[8px]" style={{ color: colors.textMuted }}>
                Vista previa de boletos
              </p>
            </div>

            {/* FAQ Preview */}
            <div ref={faqRef} className="space-y-1">
              <h3 
                className="font-semibold text-xs"
                style={{ color: colors.text, fontFamily: `"${fonts.title}", sans-serif` }}
              >
                Preguntas Frecuentes
              </h3>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem 
                  value="1" 
                  className="rounded-lg px-2"
                  style={{ 
                    backgroundColor: colors.cardBg,
                    borderColor: `${primaryColor}15`,
                  }}
                >
                  <AccordionTrigger 
                    className="py-1.5 hover:no-underline text-[10px]"
                    style={{ color: colors.text }}
                  >
                    ¿Cómo funciona el sorteo?
                  </AccordionTrigger>
                  <AccordionContent className="text-[9px]" style={{ color: colors.textMuted }}>
                    Selecciona tus boletos favoritos y completa el pago...
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
          
          {/* Mobile bottom bar */}
          {isMobile && (
            <div 
              className="h-4 flex items-center justify-center"
              style={{ backgroundColor: isDarkTemplate ? '#030712' : '#111827' }}
            >
              <div className="w-24 h-1 bg-gray-700 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
