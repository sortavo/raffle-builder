import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Video, Dices, Globe, Hand } from 'lucide-react';
import { CLOSE_SALE_OPTIONS } from '@/lib/raffle-utils';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Step4Props {
  form: UseFormReturn<any>;
}

export const Step4Draw = ({ form }: Step4Props) => {
  const { organization } = useAuth();
  const drawMethod = form.watch('draw_method') || 'manual';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fechas del Sorteo</CardTitle>
          <CardDescription>Configura cuándo inicia y termina tu sorteo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha de Inicio
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local"
                      {...field}
                      value={field.value ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm") : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                    />
                  </FormControl>
                  <FormDescription>
                    Zona horaria: America/Mexico_City
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="draw_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Dices className="w-4 h-4" />
                    Fecha del Sorteo
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local"
                      {...field}
                      value={field.value ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm") : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
                <Select 
                  onValueChange={(v) => field.onChange(parseInt(v))} 
                  defaultValue={field.value?.toString() || '0'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CLOSE_SALE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Método de Sorteo</CardTitle>
          <CardDescription>Elige cómo se seleccionará al ganador</CardDescription>
        </CardHeader>
        <CardContent>
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
                                  <SelectItem value="2">2 dígitos</SelectItem>
                                  <SelectItem value="3">3 dígitos</SelectItem>
                                  <SelectItem value="4">4 dígitos</SelectItem>
                                  <SelectItem value="5">5 dígitos</SelectItem>
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
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción del método</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe cómo se realizará el sorteo..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="random_org" className="space-y-4 mt-4">
                      <p className="text-sm text-muted-foreground">
                        Sorteo automático usando Random.org con certificado de autenticidad verificable.
                      </p>
                      <div className="p-4 bg-muted rounded-lg">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transmisión en Vivo</CardTitle>
          <CardDescription>Opcional: Comparte el link de tu transmisión</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Publicar resultado automáticamente</FormLabel>
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
        </CardContent>
      </Card>
    </div>
  );
};
