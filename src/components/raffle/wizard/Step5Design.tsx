import { UseFormReturn } from 'react-hook-form';
import { Link } from 'react-router-dom';
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
import { Palette, Type, Layout, ImagePlus, Sparkles, Megaphone, Eye, ShoppingCart, Zap, Bell, Star, BarChart3, Trophy, Shuffle, Heart, AlertCircle, Settings, Wand2 } from 'lucide-react';
import { RAFFLE_TEMPLATES, GOOGLE_FONTS_TITLES, GOOGLE_FONTS_BODY, DESIGN_SECTIONS } from '@/lib/raffle-utils';
import { cn } from '@/lib/utils';
import { FAQEditor } from './FAQEditor';
import { ValidationSummary } from './ValidationSummary';
import { TemplatePreview } from './TemplatePreview';
import type { StepValidation } from '@/hooks/useWizardValidation';

interface OrganizationInfo {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Step5Props {
  form: UseFormReturn<any>;
  organization?: OrganizationInfo | null;
  stepValidations?: StepValidation[];
  canPublish?: boolean;
  hasPaymentMethods?: boolean;
  onNavigateToStep?: (step: number) => void;
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
  stepValidations, 
  canPublish, 
  hasPaymentMethods,
  onNavigateToStep 
}: Step5Props) => {
  const selectedTemplate = form.watch('template_id') || 'modern';
  const customization = form.watch('customization') || {};
  const primaryColor = customization.primary_color || '#2563EB';
  const secondaryColor = customization.secondary_color || '#F97316';

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
      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6 pt-0 md:pt-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Layout className="w-5 h-5" />
            Plantilla
          </CardTitle>
          <CardDescription>Selecciona un diseño base para tu sorteo</CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {/* Template selector with live preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Template options */}
            <div>
              <FormField
                control={form.control}
                name="template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value || 'modern'}
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 sm:gap-3"
                      >
                        {RAFFLE_TEMPLATES.map((template) => (
                          <div key={template.id}>
                            <RadioGroupItem
                              value={template.id}
                              id={template.id}
                              className="peer sr-only"
                            />
                            <label
                              htmlFor={template.id}
                              className={cn(
                                "flex flex-col items-center justify-center rounded-lg border-2 border-muted p-2 sm:p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                                "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:shadow-md"
                              )}
                            >
                              <div 
                                className="w-full aspect-video rounded mb-2 flex items-center justify-center relative overflow-hidden"
                                style={{ 
                                  background: `linear-gradient(135deg, ${template.colors.background}, ${template.colors.cardBg})`,
                                  borderRadius: template.effects.borderRadius,
                                }}
                              >
                                {/* Mini layout preview */}
                                <div className="absolute inset-1 flex gap-1">
                                  {template.layout.heroStyle === 'side-by-side' && (
                                    <>
                                      <div className="w-1/2 bg-gray-300/50 rounded" />
                                      <div className="w-1/2 flex flex-col gap-0.5 p-0.5">
                                        <div className="h-1.5 w-3/4 rounded" style={{ backgroundColor: template.colors.primary }} />
                                        <div className="h-1 w-full bg-gray-300/50 rounded" />
                                        <div className="flex-1" />
                                        <div className="h-2 rounded" style={{ background: template.effects.gradient }} />
                                      </div>
                                    </>
                                  )}
                                  {template.layout.heroStyle === 'centered' && (
                                    <div className="w-full flex flex-col items-center gap-0.5 p-0.5">
                                      <div className="w-3/4 h-6 bg-gray-300/50 rounded" />
                                      <div className="h-1.5 w-1/2 rounded" style={{ backgroundColor: template.colors.primary }} />
                                      <div className="h-2 w-2/3 rounded mt-auto" style={{ background: template.effects.gradient }} />
                                    </div>
                                  )}
                                  {template.layout.heroStyle === 'full-width' && (
                                    <div className="w-full flex flex-col gap-0.5">
                                      <div className="flex-1 bg-gray-300/50 rounded relative">
                                        <div className="absolute bottom-0.5 left-0.5 right-0.5 h-3 rounded" style={{ backgroundColor: template.colors.cardBg }} />
                                      </div>
                                    </div>
                                  )}
                                  {template.layout.heroStyle === 'asymmetric' && (
                                    <>
                                      <div className="w-2/5 flex flex-col gap-0.5 p-0.5">
                                        <div className="h-1.5 w-3/4 rounded" style={{ backgroundColor: template.colors.primary }} />
                                        <div className="h-1 w-full bg-gray-300/50 rounded" />
                                        <div className="flex-1" />
                                        <div className="h-2 rounded" style={{ background: template.effects.gradient }} />
                                      </div>
                                      <div className="w-3/5 bg-gray-300/50 rounded" />
                                    </>
                                  )}
                                </div>
                                
                                {/* Template icon overlay */}
                                <span className="text-lg relative z-10 opacity-30">
                                  {template.icon}
                                </span>
                              </div>
                              <span className="font-medium text-xs sm:text-sm">{template.name}</span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground text-center">
                                {template.description}
                              </span>
                              
                              {/* Layout badge */}
                              <Badge variant="outline" className="mt-1 text-[8px] sm:text-[10px] px-1.5 py-0">
                                {template.layout.heroStyle === 'side-by-side' && 'Lado a lado'}
                                {template.layout.heroStyle === 'centered' && 'Centrado'}
                                {template.layout.heroStyle === 'full-width' && 'Ancho completo'}
                                {template.layout.heroStyle === 'asymmetric' && 'Asimétrico'}
                              </Badge>
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Right: Live preview */}
            <div className="hidden lg:block">
              <div className="sticky top-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Vista Previa en Tiempo Real</span>
                  <Badge variant="secondary" className="text-[10px]">
                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                    Interactivo
                  </Badge>
                </div>
                <div className="w-full max-w-[200px] mx-auto">
                  <TemplatePreview
                    templateId={selectedTemplate}
                    prizeName={form.watch('prizes')?.[0]?.name || form.watch('prize_name') || 'Premio Principal'}
                    prizeImage={form.watch('prize_images')?.[0]}
                    organizationName={organization?.name || 'Tu Organización'}
                    organizationLogo={organization?.logo_url}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  El diseño se actualiza al seleccionar diferentes plantillas
                </p>
              </div>
            </div>
          </div>
          
          {/* Mobile preview - shows below template selector */}
          <div className="lg:hidden mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Vista Previa</span>
            </div>
            <div className="w-full max-w-[180px] mx-auto">
              <TemplatePreview
                templateId={selectedTemplate}
                prizeName={form.watch('prizes')?.[0]?.name || form.watch('prize_name') || 'Premio Principal'}
                prizeImage={form.watch('prize_images')?.[0]}
                organizationName={organization?.name || 'Tu Organización'}
                organizationLogo={organization?.logo_url}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Palette className="w-5 h-5" />
            Colores
          </CardTitle>
          <CardDescription>Personaliza los colores de tu sorteo</CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormItem>
              <FormLabel>Color Primario</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => updateCustomization('primary_color', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => updateCustomization('primary_color', e.target.value)}
                  placeholder="#2563EB"
                  className="flex-1"
                />
              </div>
              <FormDescription>
                Color principal de tu marca
              </FormDescription>
            </FormItem>

            <FormItem>
              <FormLabel>Color Secundario</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => updateCustomization('secondary_color', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => updateCustomization('secondary_color', e.target.value)}
                  placeholder="#F97316"
                  className="flex-1"
                />
              </div>
              <FormDescription>
                Color de acento para botones y highlights
              </FormDescription>
            </FormItem>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Type className="w-5 h-5" />
            Tipografía
          </CardTitle>
          <CardDescription>Elige las fuentes para tu sorteo</CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormItem>
              <FormLabel>Fuente de Títulos</FormLabel>
              <Select 
                defaultValue={customization.title_font || 'Montserrat'}
                onValueChange={(v) => updateCustomization('title_font', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOOGLE_FONTS_TITLES.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>

            <FormItem>
              <FormLabel>Fuente de Texto</FormLabel>
              <Select 
                defaultValue={customization.body_font || 'Open Sans'}
                onValueChange={(v) => updateCustomization('body_font', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOOGLE_FONTS_BODY.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <ImagePlus className="w-5 h-5" />
            Logo
          </CardTitle>
          <CardDescription>Tu logo se hereda de la configuración de tu organización</CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6 space-y-4">
          {organization?.logo_url ? (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
              <Avatar className="h-16 w-16">
                <AvatarImage src={organization.logo_url} alt="Logo" />
                <AvatarFallback>{organization.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">Logo de {organization.name}</p>
                <p className="text-xs text-muted-foreground mb-2">Este logo aparecerá en tu sorteo</p>
                <Link 
                  to="/dashboard/settings" 
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Settings className="w-3 h-3" />
                  Cambiar en Configuración
                </Link>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sin logo configurado</AlertTitle>
              <AlertDescription>
                Agrega un logo en{' '}
                <Link to="/dashboard/settings" className="font-medium underline hover:no-underline">
                  Configuración
                </Link>{' '}
                para que aparezca en tus rifas.
              </AlertDescription>
            </Alert>
          )}

          <FormItem>
            <FormLabel>Posición del Logo</FormLabel>
            <RadioGroup
              defaultValue={customization.logo_position || 'top-left'}
              onValueChange={(v) => updateCustomization('logo_position', v)}
              className="flex flex-col sm:flex-row gap-2 sm:gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="top-left" id="top-left" />
                <label htmlFor="top-left" className="text-sm">Arriba Izquierda</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="top-center" id="top-center" />
                <label htmlFor="top-center" className="text-sm">Arriba Centro</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="top-right" id="top-right" />
                <label htmlFor="top-right" className="text-sm">Arriba Derecha</label>
              </div>
            </RadioGroup>
          </FormItem>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6">
          <CardTitle className="text-lg md:text-xl">Secciones</CardTitle>
          <CardDescription>Activa o desactiva las secciones de tu página</CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {DESIGN_SECTIONS.map((section) => {
              const sections = customization.sections || {};
              const isEnabled = sections[section.id] !== false;

              return (
                <div key={section.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={section.id}
                    checked={isEnabled}
                    onCheckedChange={(checked) => {
                      const current = customization.sections || {};
                      updateCustomization('sections', { ...current, [section.id]: checked });
                    }}
                  />
                  <label htmlFor={section.id} className="text-sm cursor-pointer">
                    {section.label}
                  </label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Buyer Experience - Ticket Selector Features */}
      <Card className="border-0 shadow-none md:border md:border-primary/20 md:bg-gradient-to-br md:from-primary/5 md:to-accent/5">
        <CardHeader className="px-0 md:px-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Experiencia del Comprador
          </CardTitle>
          <CardDescription>
            Configura qué herramientas de selección verán tus compradores
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6 space-y-3">
          {TICKET_SELECTOR_FEATURES.map((feature) => {
            const Icon = feature.icon;
            const isEnabled = getFeatureValue(feature.id, feature.defaultValue);
            
            return (
              <div 
                key={feature.id} 
                className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors gap-3"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0",
                    isEnabled ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5",
                      isEnabled ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor={feature.id} className="font-medium cursor-pointer text-sm">
                      {feature.label}
                    </Label>
                    <p className="text-xs text-muted-foreground truncate">
                      {feature.description}
                    </p>
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
          
        </CardContent>
      </Card>

      {/* Marketing & Urgency Features */}
      <Card className="border-0 shadow-none md:border md:border-warning/20 md:bg-gradient-to-br md:from-warning/5 md:to-warning/10">
        <CardHeader className="px-0 md:px-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Megaphone className="w-5 h-5 text-warning" />
            Marketing y Urgencia
          </CardTitle>
          <CardDescription>
            Configura los elementos que incentivan la compra
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6 space-y-3">
          {MARKETING_FEATURES.map((feature) => {
            const Icon = feature.icon;
            const isEnabled = getFeatureValue(feature.id, feature.defaultValue);
            
            return (
              <div 
                key={feature.id} 
                className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:border-warning/50 transition-colors gap-3"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0",
                    isEnabled ? "bg-warning/10" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5",
                      isEnabled ? "text-warning" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor={feature.id} className="font-medium cursor-pointer text-sm">
                      {feature.label}
                    </Label>
                    <p className="text-xs text-muted-foreground truncate">
                      {feature.description}
                    </p>
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
        </CardContent>
      </Card>

      {/* FAQ Editor */}
      <FAQEditor form={form} />
    </div>
  );
};
