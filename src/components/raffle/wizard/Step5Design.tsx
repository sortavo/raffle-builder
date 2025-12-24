import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Palette, Type, Layout, ImagePlus } from 'lucide-react';
import { RAFFLE_TEMPLATES, GOOGLE_FONTS_TITLES, GOOGLE_FONTS_BODY, DESIGN_SECTIONS } from '@/lib/raffle-utils';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Step5Props {
  form: UseFormReturn<any>;
}

export const Step5Design = ({ form }: Step5Props) => {
  const selectedTemplate = form.watch('template_id') || 'modern';
  const customization = form.watch('customization') || {};
  const primaryColor = customization.primary_color || '#2563EB';
  const secondaryColor = customization.secondary_color || '#F97316';

  const updateCustomization = (key: string, value: unknown) => {
    const current = form.getValues('customization') || {};
    form.setValue('customization', { ...current, [key]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5" />
            Plantilla
          </CardTitle>
          <CardDescription>Selecciona un diseño base para tu sorteo</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="template_id"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value || 'modern'}
                    className="grid grid-cols-2 md:grid-cols-3 gap-4"
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Colores
          </CardTitle>
          <CardDescription>Personaliza los colores de tu sorteo</CardDescription>
        </CardHeader>
        <CardContent>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Tipografía
          </CardTitle>
          <CardDescription>Elige las fuentes para tu sorteo</CardDescription>
        </CardHeader>
        <CardContent>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="w-5 h-5" />
            Logo
          </CardTitle>
          <CardDescription>Sube tu logo y elige su posición</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <ImagePlus className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Arrastra tu logo aquí o haz clic para seleccionar
            </p>
          </div>

          <FormItem>
            <FormLabel>Posición del Logo</FormLabel>
            <RadioGroup
              defaultValue={customization.logo_position || 'top-left'}
              onValueChange={(v) => updateCustomization('logo_position', v)}
              className="flex gap-4"
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

      <Card>
        <CardHeader>
          <CardTitle>Secciones</CardTitle>
          <CardDescription>Activa o desactiva las secciones de tu página</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Textos Personalizados</CardTitle>
          <CardDescription>Personaliza los textos principales</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
    </div>
  );
};
