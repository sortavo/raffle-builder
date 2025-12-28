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
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Palette, Type, Layout, ImagePlus, Sparkles, Megaphone, Eye, ShoppingCart, Zap, Bell, Star, BarChart3, Trophy, Shuffle, Heart, AlertCircle, Settings } from 'lucide-react';
import { RAFFLE_TEMPLATES, GOOGLE_FONTS_TITLES, GOOGLE_FONTS_BODY, DESIGN_SECTIONS } from '@/lib/raffle-utils';
import { cn } from '@/lib/utils';
import { FAQEditor } from './FAQEditor';
import { ValidationSummary } from './ValidationSummary';
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
          <FormField
            control={form.control}
            name="template_id"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value || 'modern'}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
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
                            "flex flex-col items-center justify-center rounded-lg border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                          )}
                        >
                          <div className="w-full h-24 bg-gradient-to-br from-muted to-muted-foreground/20 rounded mb-3 flex items-center justify-center">
                            <span className="text-2xl">
                              {template.id === 'modern' && '◼️'}
                              {template.id === 'classic' && '🏛️'}
                              {template.id === 'minimal' && '⬜'}
                              {template.id === 'festive' && '🎉'}
                              {template.id === 'elegant' && '✨'}
                              {template.id === 'sports' && '⚽'}
                            </span>
                          </div>
                          <span className="font-medium">{template.name}</span>
                          <span className="text-xs text-muted-foreground text-center mt-1">
                            {template.description}
                          </span>
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
        <CardContent className="px-0 md:px-6 space-y-4">
          {TICKET_SELECTOR_FEATURES.map((feature) => {
            const Icon = feature.icon;
            const isEnabled = getFeatureValue(feature.id, feature.defaultValue);
            
            return (
              <div 
                key={feature.id} 
                className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isEnabled ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5",
                      isEnabled ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <Label htmlFor={feature.id} className="font-medium cursor-pointer">
                      {feature.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={feature.id}
                  checked={isEnabled}
                  onCheckedChange={(checked) => updateCustomization(feature.id, checked)}
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
        <CardContent className="px-0 md:px-6 space-y-4">
          {MARKETING_FEATURES.map((feature) => {
            const Icon = feature.icon;
            const isEnabled = getFeatureValue(feature.id, feature.defaultValue);
            
            return (
              <div 
                key={feature.id} 
                className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:border-warning/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isEnabled ? "bg-warning/10" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5",
                      isEnabled ? "text-warning" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <Label htmlFor={feature.id} className="font-medium cursor-pointer">
                      {feature.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={feature.id}
                  checked={isEnabled}
                  onCheckedChange={(checked) => updateCustomization(feature.id, checked)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6">
          <CardTitle className="text-lg md:text-xl">Textos Personalizados</CardTitle>
          <CardDescription>Personaliza los textos principales</CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6 space-y-4">
          <FormItem>
            <FormLabel>Titular Principal</FormLabel>
            <Input
              placeholder="¡Gana un increíble premio!"
              value={customization.headline || ''}
              onChange={(e) => updateCustomization('headline', e.target.value)}
            />
          </FormItem>

          <FormItem>
            <FormLabel>Subtitular</FormLabel>
            <Input
              placeholder="Participa ahora y sé parte de este gran sorteo"
              value={customization.subheadline || ''}
              onChange={(e) => updateCustomization('subheadline', e.target.value)}
            />
          </FormItem>

          <FormItem>
            <FormLabel>Texto del Botón</FormLabel>
            <Input
              placeholder="¡Comprar Boletos!"
              value={customization.cta_text || ''}
              onChange={(e) => updateCustomization('cta_text', e.target.value)}
            />
          </FormItem>
        </CardContent>
      </Card>

      {/* FAQ Editor */}
      <FAQEditor form={form} />
    </div>
  );
};
