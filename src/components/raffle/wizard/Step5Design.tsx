import { UseFormReturn } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useCallback } from 'react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Palette, Type, Layout, ImagePlus, Sparkles, Megaphone, Eye, ShoppingCart, Zap, Bell, Star, BarChart3, Trophy, Shuffle, Heart, AlertCircle, Settings, Wand2, Lock } from 'lucide-react';
import { RAFFLE_TEMPLATES, GOOGLE_FONTS_TITLES, GOOGLE_FONTS_BODY, DESIGN_SECTIONS } from '@/lib/raffle-utils';
import { getSubscriptionLimits, SubscriptionTier } from '@/lib/subscription-limits';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FAQEditor } from './FAQEditor';
import { ValidationSummary } from './ValidationSummary';
import { TemplatePreview } from './TemplatePreview';
import type { StepValidation } from '@/hooks/useWizardValidation';

type WizardSection = 'template' | 'colors' | 'logo' | 'features' | 'faq';

interface OrganizationInfo {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Step5Props {
  form: UseFormReturn<any>;
  organization?: OrganizationInfo | null;
  subscriptionTier?: SubscriptionTier;
  stepValidations?: StepValidation[];
  canPublish?: boolean;
  hasPaymentMethods?: boolean;
  onNavigateToStep?: (step: number) => void;
  onSectionChange?: (section: 'template' | 'colors' | 'logo' | 'features' | 'faq') => void;
}

// Feature configuration definitions
const TICKET_SELECTOR_FEATURES = [
  {
    id: 'show_random_picker',
    label: 'Máquina de la Suerte',
    description: 'Animación slot machine para selección aleatoria',
    icon: Shuffle,
    defaultValue: true
  },
  {
    id: 'show_winners_history',
    label: 'Historial de Ganadores',
    description: 'Muestra números ganadores de sorteos anteriores',
    icon: Trophy,
    defaultValue: true
  },
  {
    id: 'show_probability_stats',
    label: 'Estadísticas de Probabilidad',
    description: 'Muestra probabilidades en tiempo real',
    icon: BarChart3,
    defaultValue: true
  }
];

const MARKETING_FEATURES = [
  {
    id: 'show_viewers_count',
    label: 'Visitantes en Tiempo Real',
    description: '"X personas viendo ahora"',
    icon: Eye,
    defaultValue: true
  },
  {
    id: 'show_purchase_toasts',
    label: 'Notificaciones de Compra',
    description: '"Juan acaba de comprar 3 boletos"',
    icon: ShoppingCart,
    defaultValue: true
  },
  {
    id: 'show_urgency_badge',
    label: 'Badge de Urgencia',
    description: '"¡Solo quedan X boletos!"',
    icon: Zap,
    defaultValue: true
  },
  {
    id: 'show_sticky_banner',
    label: 'Banner Sticky',
    description: 'Banner fijo con cuenta regresiva',
    icon: Bell,
    defaultValue: true
  },
  {
    id: 'show_social_proof',
    label: 'Prueba Social',
    description: 'Testimonios y estadísticas de confianza',
    icon: Star,
    defaultValue: true
  }
];

export const Step5Design = ({ 
  form, 
  organization,
  subscriptionTier,
  stepValidations, 
  canPublish, 
  hasPaymentMethods,
  onNavigateToStep,
  onSectionChange
}: Step5Props) => {
  const { toast } = useToast();
  const selectedTemplate = form.watch('template_id') || 'modern';
  const customization = form.watch('customization') || {};
  const primaryColor = customization.primary_color || '#2563EB';
  const secondaryColor = customization.secondary_color || '#F97316';

  // Get subscription limits for template access
  const limits = getSubscriptionLimits(subscriptionTier);
  const templatesAvailable = limits.templatesAvailable;

  // Refs for section observation
  const sectionsRef = useRef<Map<WizardSection, HTMLElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up intersection observer for section tracking
  useEffect(() => {
    if (!onSectionChange) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        
        if (visibleEntries.length > 0) {
          const mostVisible = visibleEntries.reduce((prev, current) => 
            current.intersectionRatio > prev.intersectionRatio ? current : prev
          );
          
          sectionsRef.current.forEach((element, section) => {
            if (element === mostVisible.target) {
              onSectionChange(section);
            }
          });
        }
      },
      {
        threshold: [0.1, 0.3, 0.5],
        rootMargin: '-80px 0px -50% 0px',
      }
    );

    sectionsRef.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [onSectionChange]);

  const registerSection = useCallback((section: WizardSection) => {
    return (el: HTMLElement | null) => {
      if (el) {
        sectionsRef.current.set(section, el);
        observerRef.current?.observe(el);
      }
    };
  }, []);

  const updateCustomization = (key: string, value: unknown) => {
    const current = form.getValues('customization') || {};
    form.setValue('customization', { ...current, [key]: value });
  };

  const getFeatureValue = (featureId: string, defaultValue: boolean): boolean => {
    return customization[featureId] !== undefined ? customization[featureId] : defaultValue;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Validation Summary */}
      {stepValidations && onNavigateToStep && (
        <ValidationSummary 
          stepValidations={stepValidations}
          canPublish={canPublish ?? false}
          hasPaymentMethods={hasPaymentMethods ?? true}
          onNavigateToStep={onNavigateToStep}
        />
      )}
      <Card ref={registerSection('template')} className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6 pt-0 md:pt-6 pb-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Layout className="w-4 h-4" />
            Plantilla
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <FormField
            control={form.control}
            name="template_id"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => {
                      const templateIndex = RAFFLE_TEMPLATES.findIndex(t => t.id === value);
                      if (templateIndex >= templatesAvailable) {
                        toast({
                          title: 'Template no disponible',
                          description: 'Este template está disponible desde el plan Pro.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      field.onChange(value);
                    }}
                    defaultValue={field.value || 'modern'}
                    className="grid grid-cols-3 gap-4"
                  >
                    {RAFFLE_TEMPLATES.map((template, index) => {
                      const isLocked = index >= templatesAvailable;
                      const isSelected = field.value === template.id;
                      return (
                        <div key={template.id} className="relative">
                          {isLocked && (
                            <div className="absolute -top-1 -right-1 z-10">
                              <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-muted/90">
                                <Lock className="w-2 h-2" />
                              </Badge>
                            </div>
                          )}
                          <RadioGroupItem
                            value={template.id}
                            id={template.id}
                            className="peer sr-only"
                            disabled={isLocked}
                          />
                          <label
                            htmlFor={template.id}
                            className={cn(
                              "flex flex-col items-center justify-center rounded-lg border-2 p-2 transition-all cursor-pointer",
                              isLocked 
                                ? "opacity-40 cursor-not-allowed border-muted" 
                                : "border-muted hover:border-primary/50",
                              isSelected && "border-primary bg-primary/5"
                            )}
                          >
                            <div 
                              className="w-full aspect-[4/3] rounded mb-1.5 flex items-center justify-center"
                              style={{ 
                                background: `linear-gradient(135deg, ${template.colors.background}, ${template.colors.cardBg})`,
                              }}
                            >
                              <span className="text-base opacity-50">{template.icon}</span>
                            </div>
                            <span className="font-medium text-[10px] sm:text-xs text-center leading-tight">{template.name}</span>
                          </label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Colores y Tipografía combinados */}
      <Card ref={registerSection('colors')} className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6 pb-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Palette className="w-4 h-4" />
            Colores y Tipografía
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormItem>
              <FormLabel className="text-xs">Color Primario</FormLabel>
              <div className="flex gap-1.5">
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => updateCustomization('primary_color', e.target.value)}
                  className="w-10 h-9 p-0.5 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => updateCustomization('primary_color', e.target.value)}
                  className="flex-1 text-xs h-9"
                />
              </div>
            </FormItem>

            <FormItem>
              <FormLabel className="text-xs">Color Secundario</FormLabel>
              <div className="flex gap-1.5">
                <Input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => updateCustomization('secondary_color', e.target.value)}
                  className="w-10 h-9 p-0.5 cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => updateCustomization('secondary_color', e.target.value)}
                  className="flex-1 text-xs h-9"
                />
              </div>
            </FormItem>

            <FormItem>
              <FormLabel className="text-xs">Fuente Títulos</FormLabel>
              <Select 
                defaultValue={customization.title_font || 'Montserrat'}
                onValueChange={(v) => updateCustomization('title_font', v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOOGLE_FONTS_TITLES.map((font) => (
                    <SelectItem key={font} value={font} className="text-xs">
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>

            <FormItem>
              <FormLabel className="text-xs">Fuente Texto</FormLabel>
              <Select 
                defaultValue={customization.body_font || 'Open Sans'}
                onValueChange={(v) => updateCustomization('body_font', v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOOGLE_FONTS_BODY.map((font) => (
                    <SelectItem key={font} value={font} className="text-xs">
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          </div>
        </CardContent>
      </Card>

      {/* Logo y Secciones combinados */}
      <Card ref={registerSection('logo')} className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6 pb-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <ImagePlus className="w-4 h-4" />
            Logo y Secciones
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 md:px-6 space-y-4">
          {/* Logo preview inline */}
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-3">
              {organization?.logo_url ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={organization.logo_url} alt="Logo" />
                  <AvatarFallback className="text-xs">{organization.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <ImagePlus className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{organization?.name || 'Tu Organización'}</p>
                <Link 
                  to="/dashboard/settings" 
                  className="text-xs text-primary hover:underline"
                >
                  Cambiar logo
                </Link>
              </div>
            </div>
            <RadioGroup
              defaultValue={customization.logo_position || 'top-left'}
              onValueChange={(v) => updateCustomization('logo_position', v)}
              className="flex gap-2"
            >
              {[
                { value: 'top-left', label: '←' },
                { value: 'top-center', label: '↑' },
                { value: 'top-right', label: '→' },
              ].map((pos) => (
                <div key={pos.value}>
                  <RadioGroupItem value={pos.value} id={pos.value} className="peer sr-only" />
                  <label
                    htmlFor={pos.value}
                    className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-muted text-xs cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                  >
                    {pos.label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Secciones - Lista con descripciones */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">Secciones de la página</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DESIGN_SECTIONS.map((section) => {
                const sections = customization.sections || {};
                const isEnabled = sections[section.id] !== false;

                return (
                  <div 
                    key={section.id} 
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      isEnabled ? "border-primary/30 bg-primary/5" : "border-border"
                    )}
                  >
                    <Checkbox
                      id={section.id}
                      checked={isEnabled}
                      onCheckedChange={(checked) => {
                        const current = customization.sections || {};
                        updateCustomization('sections', { ...current, [section.id]: checked });
                      }}
                      className="mt-0.5"
                    />
                    <label htmlFor={section.id} className="cursor-pointer flex-1 min-w-0">
                      <span className="text-sm font-medium block">{section.label}</span>
                      <span className="text-xs text-muted-foreground">{section.description}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features combinados - Experiencia y Marketing */}
      <Card ref={registerSection('features')} className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6 pb-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Sparkles className="w-4 h-4" />
            Funciones Opcionales
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 md:px-6 space-y-4">
          {/* Experiencia del Comprador */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              Experiencia del Comprador
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TICKET_SELECTOR_FEATURES.map((feature) => {
                const Icon = feature.icon;
                const isEnabled = getFeatureValue(feature.id, feature.defaultValue);
                
                return (
                  <div 
                    key={feature.id} 
                    className={cn(
                      "flex items-start justify-between p-3 rounded-lg border transition-colors gap-3",
                      isEnabled ? "border-primary/30 bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Icon className={cn(
                        "w-5 h-5 shrink-0 mt-0.5",
                        isEnabled ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">{feature.label}</span>
                        <span className="text-xs text-muted-foreground">{feature.description}</span>
                      </div>
                    </div>
                    <Switch
                      id={feature.id}
                      checked={isEnabled}
                      onCheckedChange={(checked) => updateCustomization(feature.id, checked)}
                      className="shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Marketing */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <Megaphone className="w-3 h-3 text-warning" />
              Marketing y Urgencia
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MARKETING_FEATURES.map((feature) => {
                const Icon = feature.icon;
                const isEnabled = getFeatureValue(feature.id, feature.defaultValue);
                
                return (
                  <div 
                    key={feature.id} 
                    className={cn(
                      "flex items-start justify-between p-3 rounded-lg border transition-colors gap-3",
                      isEnabled ? "border-warning/30 bg-warning/5" : "border-border"
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Icon className={cn(
                        "w-5 h-5 shrink-0 mt-0.5",
                        isEnabled ? "text-warning" : "text-muted-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">{feature.label}</span>
                        <span className="text-xs text-muted-foreground">{feature.description}</span>
                      </div>
                    </div>
                    <Switch
                      id={feature.id}
                      checked={isEnabled}
                      onCheckedChange={(checked) => updateCustomization(feature.id, checked)}
                      className="shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Editor */}
      <div ref={registerSection('faq')}>
        <FAQEditor form={form} />
      </div>
    </div>
  );
};
