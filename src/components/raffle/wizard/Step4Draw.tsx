import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { Calendar, Clock, Video, Dices, Globe, Hand, Sparkles, Loader2, Gift } from 'lucide-react';
import { CLOSE_SALE_OPTIONS, CLOSE_SALE_TIME_UNITS, MAX_CLOSE_SALE_HOURS, formatCloseSaleTime } from '@/lib/raffle-utils';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { REQUIRED_FIELDS } from '@/hooks/useWizardValidation';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FieldLockBadge } from './FieldLockBadge';
import { isPublished, getFieldRestriction } from '@/lib/raffle-edit-restrictions';
import { PreDrawScheduler } from './PreDrawScheduler';
import { Prize } from '@/types/prize';

interface Step4Props {
  form: UseFormReturn<any>;
  raffleStatus?: string;
  originalDrawDate?: string | null;
  originalStartDate?: string | null;
}

export const Step4Draw = ({ form, raffleStatus, originalDrawDate, originalStartDate }: Step4Props) => {
  const { organization } = useAuth();
  const isRafflePublished = isPublished(raffleStatus);
  const drawMethod = form.watch('draw_method') || 'manual';
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  
  // Estado para tiempo de cierre personalizado
  const [isCustomCloseSale, setIsCustomCloseSale] = useState(false);
  const [customCloseSaleValue, setCustomCloseSaleValue] = useState(24);
  const [customCloseSaleUnit, setCustomCloseSaleUnit] = useState<'hours' | 'days'>('hours');
  const closeSaleHours = form.watch('close_sale_hours_before') || 0;

  // Detectar si el valor actual es personalizado
  useEffect(() => {
    const matchesPreset = CLOSE_SALE_OPTIONS.some(opt => opt.value === closeSaleHours);
    if (!matchesPreset && closeSaleHours > 0) {
      setIsCustomCloseSale(true);
      if (closeSaleHours >= 24 && closeSaleHours % 24 === 0) {
        setCustomCloseSaleValue(closeSaleHours / 24);
        setCustomCloseSaleUnit('days');
      } else {
        setCustomCloseSaleValue(closeSaleHours);
        setCustomCloseSaleUnit('hours');
      }
    }
  }, []);

  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: string): string | null => {
    if (!touchedFields[field]) return null;
    const value = form.watch(field);
    
    if (field === 'draw_date') {
      if (!value) {
        return 'La fecha del sorteo es requerida';
      }
      const date = new Date(value);
      if (isNaN(date.getTime()) || date <= new Date()) {
        return 'La fecha del sorteo debe ser en el futuro';
      }
    }
    
    if (field === 'start_date') {
      const startDate = form.watch('start_date');
      const drawDate = form.watch('draw_date');
      if (startDate && drawDate && new Date(startDate) >= new Date(drawDate)) {
        return 'La fecha de inicio debe ser anterior a la fecha del sorteo';
      }
    }
    return null;
  };

  const handleCloseSaleChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomCloseSale(true);
      form.setValue('close_sale_hours_before', 24);
      setCustomCloseSaleValue(24);
      setCustomCloseSaleUnit('hours');
    } else {
      setIsCustomCloseSale(false);
      form.setValue('close_sale_hours_before', parseInt(value));
    }
  };

  const handleCustomCloseSaleChange = (value: number, unit: 'hours' | 'days') => {
    const multiplier = unit === 'days' ? 24 : 1;
    const hours = value * multiplier;
    const clampedHours = Math.min(Math.max(1, hours), MAX_CLOSE_SALE_HOURS);
    form.setValue('close_sale_hours_before', clampedHours);
    setCustomCloseSaleValue(value);
    setCustomCloseSaleUnit(unit);
  };

  const drawDateError = getFieldError('draw_date');
  const startDateError = getFieldError('start_date');

  const handleGenerateMethodDescription = async () => {
    setIsGeneratingDescription(true);
    try {
      const raffleName = form.watch('title') || 'Sorteo';
      const prizeName = form.watch('prize_name') || 'Premio';
      const orgName = organization?.name || '';
      
      const { data, error } = await supabase.functions.invoke('generate-description', {
        body: {
          type: 'draw_method_description',
          title: raffleName,
          prizeName: prizeName,
          organizationName: orgName
        }
      });

      if (error) throw error;
      
      const generatedDescription = data?.description || data?.text || '';
      if (generatedDescription) {
        // Get current customization and update draw_method_description
        const currentCustomization = form.getValues('customization') || {};
        form.setValue('customization', {
          ...currentCustomization,
          draw_method_description: generatedDescription
        });
        toast.success('Descripción generada con IA');
      }
    } catch (error) {
      console.error('Error generating description:', error);
      toast.error('No se pudo generar la descripción');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Dates Section */}
      <div>
        <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight">Fechas del Sorteo</h2>
            <p className="text-sm text-muted-foreground">Configura cuándo inicia y termina tu sorteo</p>
          </div>
        </div>
        
        <div className="space-y-5 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => {
                // Block editing if date already passed
                const startDatePassed = originalStartDate && new Date(originalStartDate) < new Date();
                const isStartDateLocked = isRafflePublished && startDatePassed;
                
                return (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha de Inicio
                    {isStartDateLocked && (
                      <FieldLockBadge 
                        type="locked"
                        message="La fecha de inicio ya pasó y no puede modificarse"
                        shortMessage="Fecha pasada"
                      />
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local"
                      {...field}
                      value={field.value ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm") : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                      onBlur={() => handleBlur('start_date')}
                      disabled={isStartDateLocked}
                      className={cn(startDateError && "border-destructive focus-visible:ring-destructive")}
                    />
                  </FormControl>
                  <FormDescription>
                    Zona horaria: America/Mexico_City
                  </FormDescription>
                  {startDateError && (
                    <p className="text-sm font-medium text-destructive">{startDateError}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}}
            />

            <FormField
              control={form.control}
              name="draw_date"
              render={({ field }) => {
                const drawDateRestriction = getFieldRestriction('draw_date', raffleStatus);
                
                return (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Dices className="w-4 h-4" />
                    Fecha del Sorteo
                    <span className="text-destructive">*</span>
                    <HelpTooltip content="Fecha y hora exacta en que se realizará el sorteo. Los compradores verán una cuenta regresiva hacia este momento." />
                    {drawDateRestriction && (
                      <FieldLockBadge 
                        type="restricted"
                        message={drawDateRestriction.message}
                        shortMessage={drawDateRestriction.shortMessage}
                      />
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local"
                      {...field}
                      value={field.value ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm") : ''}
                      onChange={(e) => {
                        const newValue = e.target.value ? new Date(e.target.value).toISOString() : null;
                        // If published, only allow postponing (new date >= original date)
                        if (isRafflePublished && originalDrawDate && newValue) {
                          const newDate = new Date(newValue);
                          const origDate = new Date(originalDrawDate);
                          if (newDate < origDate) {
                            toast.error('La fecha solo puede posponerse, no adelantarse');
                            return;
                          }
                        }
                        field.onChange(newValue);
                      }}
                      onBlur={() => handleBlur('draw_date')}
                      min={isRafflePublished && originalDrawDate 
                        ? format(new Date(originalDrawDate), "yyyy-MM-dd'T'HH:mm") 
                        : undefined
                      }
                      className={cn(drawDateError && "border-destructive focus-visible:ring-destructive")}
                    />
                  </FormControl>
                  {isRafflePublished && originalDrawDate && (
                    <FormDescription className="text-amber-600 dark:text-amber-400">
                      Fecha original: {format(new Date(originalDrawDate), "dd/MM/yyyy HH:mm")} - Solo puede posponerse
                    </FormDescription>
                  )}
                  {drawDateError && (
                    <p className="text-sm font-medium text-destructive">{drawDateError}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}}
            />
          </div>

          <FormField
            control={form.control}
            name="close_sale_hours_before"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Cerrar ventas antes del sorteo
                </FormLabel>
                <div className="space-y-3">
                  <Select
                    value={isCustomCloseSale ? 'custom' : (field.value?.toString() || '0')}
                    onValueChange={handleCloseSaleChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {isCustomCloseSale 
                            ? `Personalizado: ${formatCloseSaleTime(closeSaleHours)}`
                            : formatCloseSaleTime(field.value || 0)
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CLOSE_SALE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          {opt.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">
                        <div className="flex flex-col">
                          <span>Personalizado</span>
                          <span className="text-xs text-muted-foreground">Define tu propio tiempo</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {isCustomCloseSale && (
                    <div className="flex flex-wrap gap-2 items-center p-3 rounded-lg border bg-muted/50">
                      <Input
                        type="number"
                        min={1}
                        max={customCloseSaleUnit === 'days' ? 7 : MAX_CLOSE_SALE_HOURS}
                        value={customCloseSaleValue}
                        onChange={(e) => handleCustomCloseSaleChange(parseInt(e.target.value) || 1, customCloseSaleUnit)}
                        className="w-20"
                      />
                      <Select
                        value={customCloseSaleUnit}
                        onValueChange={(v) => handleCustomCloseSaleChange(customCloseSaleValue, v as 'hours' | 'days')}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLOSE_SALE_TIME_UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">
                        = {formatCloseSaleTime(closeSaleHours)}
                      </span>
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Draw Method Section */}
      <div>
        <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-success/10 to-success/5 text-success">
            <Dices className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold tracking-tight">Método de Sorteo</h2>
              {isRafflePublished && (
                <FieldLockBadge 
                  type="locked"
                  message="El método de sorteo anunciado no puede cambiar después de publicar"
                  shortMessage="Método bloqueado"
                />
              )}
            </div>
            <p className="text-sm text-muted-foreground">Elige cómo se seleccionará al ganador</p>
          </div>
        </div>

        {isRafflePublished ? (
          // Show locked state for published raffles
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              {drawMethod === 'lottery_nacional' && <Globe className="h-5 w-5 text-muted-foreground" />}
              {drawMethod === 'manual' && <Hand className="h-5 w-5 text-muted-foreground" />}
              {drawMethod === 'random_org' && <Dices className="h-5 w-5 text-muted-foreground" />}
              <div>
                <p className="font-medium">
                  {drawMethod === 'lottery_nacional' && 'Lotería Nacional'}
                  {drawMethod === 'manual' && 'Sorteo Manual'}
                  {drawMethod === 'random_org' && 'Random.org'}
                </p>
                <p className="text-sm text-muted-foreground">
                  El método de sorteo no puede modificarse después de publicar.
                </p>
              </div>
            </div>
            
            {/* Show lottery details if applicable (read-only) */}
            {drawMethod === 'lottery_nacional' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded bg-background border">
                  <p className="text-xs text-muted-foreground mb-1">Número de Sorteo</p>
                  <p className="font-medium">{form.watch('lottery_draw_number') || '—'}</p>
                </div>
                <div className="p-3 rounded bg-background border">
                  <p className="text-xs text-muted-foreground mb-1">Dígitos a Usar</p>
                  <p className="font-medium">
                    {form.watch('lottery_digits') === 0 
                      ? 'Sin dígitos' 
                      : `${form.watch('lottery_digits') || 3} dígitos`}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Show editable form for draft raffles
          <FormField
            control={form.control}
            name="draw_method"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Tabs 
                    defaultValue={field.value || 'manual'} 
                    onValueChange={field.onChange}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="lottery_nacional" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                        <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span className="hidden sm:inline">Lotería Nacional</span>
                        <span className="sm:hidden">Lotería</span>
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                        <Hand className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        Manual
                      </TabsTrigger>
                      <TabsTrigger value="random_org" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                        <Dices className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span className="hidden sm:inline">Random.org</span>
                        <span className="sm:hidden">Random</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="lottery_nacional" className="space-y-4 mt-4">
                      <p className="text-sm text-muted-foreground">
                        El ganador se determina con los últimos dígitos del premio mayor de la Lotería Nacional.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="lottery_draw_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de Sorteo</FormLabel>
                              <FormControl>
                                <Input placeholder="Ej: Sorteo Especial 257" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lottery_digits"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dígitos a Usar</FormLabel>
                              <Select 
                                onValueChange={(v) => field.onChange(parseInt(v))} 
                                defaultValue={field.value?.toString() || '3'}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from({ length: 11 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                      {i === 0 ? 'Sin dígitos' : i === 1 ? '1 dígito' : `${i} dígitos`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>

                  <TabsContent value="manual" className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Selecciona al ganador manualmente durante un evento en vivo o por otros medios.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Descripción del método</label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateMethodDescription}
                          disabled={isGeneratingDescription}
                          className="h-7 gap-1.5 text-xs text-primary hover:text-primary/80"
                        >
                          {isGeneratingDescription ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Generar con IA</span>
                          <span className="sm:hidden">IA</span>
                        </Button>
                      </div>
                      <Textarea 
                        placeholder="Describe cómo se realizará el sorteo..."
                        value={form.watch('customization')?.draw_method_description || ''}
                        onChange={(e) => {
                          const currentCustomization = form.getValues('customization') || {};
                          form.setValue('customization', {
                            ...currentCustomization,
                            draw_method_description: e.target.value
                          });
                        }}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="random_org" className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Sorteo automático usando Random.org con certificado de autenticidad verificable.
                    </p>
                    <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border/50">
                      <p className="text-sm">
                        ✓ Generación de números verdaderamente aleatorios<br />
                        ✓ Certificado digital descargable<br />
                        ✓ Verificable por cualquier participante
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        )}
      </div>

      {/* Pre-Draws Section - only show if multiple prizes */}
      {(() => {
        const prizes: Prize[] = form.watch('prizes') || [];
        if (prizes.length <= 1) return null;
        
        return (
          <div>
            <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold tracking-tight">Pre-Sorteos</h2>
                <p className="text-sm text-muted-foreground">Programa sorteos intermedios para cada premio</p>
              </div>
            </div>
            
            <PreDrawScheduler
              form={form}
              prizes={prizes}
              drawDate={form.watch('draw_date')}
              startDate={form.watch('start_date')}
              isPublished={isRafflePublished}
            />
          </div>
        );
      })()}

      {/* Livestream Section */}
      <div>
        <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 text-secondary">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight">Transmisión en Vivo</h2>
            <p className="text-sm text-muted-foreground">Opcional: Comparte el link de tu transmisión</p>
          </div>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="livestream_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  URL de Transmisión
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://youtube.com/live/..." {...field} />
                </FormControl>
                <FormDescription>
                  YouTube Live, Facebook Live, Instagram Live, etc.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="auto_publish_result"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-xl border border-border/50 p-4 bg-muted/30">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-semibold">Publicar resultado automáticamente</FormLabel>
                  <FormDescription>
                    El ganador se mostrará en la página del sorteo al finalizar
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value === true}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};
