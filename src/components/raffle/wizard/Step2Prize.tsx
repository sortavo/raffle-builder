import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCIES } from '@/lib/currency-utils';
import { ImagePlus, Video } from 'lucide-react';

interface Step2Props {
  form: UseFormReturn<any>;
}

export const Step2Prize = ({ form }: Step2Props) => {
  const currency = form.watch('currency_code') || 'MXN';
  const currencyData = CURRENCIES.find(c => c.code === currency);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración del Premio</CardTitle>
        <CardDescription>Define qué van a ganar los participantes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="prize_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Premio *</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Toyota Corolla 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="prize_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor del Premio</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {currencyData?.symbol || '$'}
                    </span>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      className="pl-8"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Moneda</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || 'MXN'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.flag} {curr.code} - {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="prize_images"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Imágenes del Premio</FormLabel>
              <FormControl>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <ImagePlus className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Arrastra imágenes aquí o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Máximo 10 imágenes, 5MB cada una
                  </p>
                </div>
              </FormControl>
              <FormDescription>
                Las imágenes se mostrarán en la galería del sorteo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="prize_video_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video del Premio (Opcional)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    placeholder="https://youtube.com/watch?v=..." 
                    className="pl-10"
                    {...field} 
                  />
                </div>
              </FormControl>
              <FormDescription>
                Soporta YouTube y Vimeo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="prize_terms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Términos del Premio</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Condiciones de entrega, garantías, restricciones..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
