import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { TICKET_COUNT_OPTIONS, RESERVATION_TIME_OPTIONS, getTicketLimitByTier } from '@/lib/raffle-utils';
import { CURRENCIES } from '@/lib/currency-utils';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

interface Step3Props {
  form: UseFormReturn<any>;
}

interface Package {
  quantity: number;
  price: number;
  discount_percent: number;
  label: string;
  display_order: number;
}

export const Step3Tickets = ({ form }: Step3Props) => {
  const { organization } = useAuth();
  const ticketLimit = getTicketLimitByTier(organization?.subscription_tier || null);
  const [packages, setPackages] = useState<Package[]>([
    { quantity: 3, price: 0, discount_percent: 10, label: 'Básico', display_order: 0 },
    { quantity: 5, price: 0, discount_percent: 15, label: 'Popular', display_order: 1 },
    { quantity: 10, price: 0, discount_percent: 20, label: 'Mejor Valor', display_order: 2 },
  ]);

  const currency = form.watch('currency_code') || 'MXN';
  const currencyData = CURRENCIES.find(c => c.code === currency);
  const basePrice = form.watch('ticket_price') || 0;
  const reservationTime = form.watch('reservation_time_minutes') || 15;

  const addPackage = () => {
    setPackages([...packages, {
      quantity: 1,
      price: basePrice,
      discount_percent: 0,
      label: '',
      display_order: packages.length,
    }]);
  };

  const removePackage = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const updatePackage = (index: number, field: keyof Package, value: string | number) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate price from discount or discount from price
    if (field === 'discount_percent') {
      const discount = Number(value);
      updated[index].price = Math.round(basePrice * updated[index].quantity * (1 - discount / 100));
    } else if (field === 'price') {
      const fullPrice = basePrice * updated[index].quantity;
      if (fullPrice > 0) {
        updated[index].discount_percent = Math.round(((fullPrice - Number(value)) / fullPrice) * 100);
      }
    }
    
    setPackages(updated);
    form.setValue('packages', updated);
  };

  const availableTicketOptions = TICKET_COUNT_OPTIONS.filter(opt => opt.value <= ticketLimit);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Boletos</CardTitle>
          <CardDescription>Define la cantidad y precio de los boletos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="total_tickets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total de Boletos *</FormLabel>
                  <Select 
                    onValueChange={(v) => field.onChange(parseInt(v))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona cantidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTicketOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          {opt.label} boletos
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Tu plan permite hasta {ticketLimit.toLocaleString()} boletos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ticket_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio por Boleto *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {currencyData?.symbol || '$'}
                      </span>
                      <Input 
                        type="number" 
                        placeholder="100" 
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
          </div>

          <FormField
            control={form.control}
            name="ticket_number_format"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Formato de Numeración</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value || 'sequential'}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sequential" id="sequential" />
                      <label htmlFor="sequential" className="text-sm">Secuencial (001, 002...)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="prefixed" id="prefixed" />
                      <label htmlFor="prefixed" className="text-sm">Con Prefijo (TKT-001...)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="random" id="random" />
                      <label htmlFor="random" className="text-sm">Aleatorio</label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="allow_individual_sale"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Permitir venta individual</FormLabel>
                  <FormDescription>
                    Los participantes pueden comprar boletos uno por uno
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value !== false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="max_tickets_per_purchase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máx. boletos por compra</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0 = Sin límite" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>0 = sin límite</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_tickets_per_person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máx. boletos por persona</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0 = Sin límite" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>0 = sin límite</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="reservation_time_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tiempo de reservación: {reservationTime} minutos</FormLabel>
                <FormControl>
                  <Slider
                    min={5}
                    max={60}
                    step={5}
                    defaultValue={[field.value || 15]}
                    onValueChange={(v) => field.onChange(v[0])}
                    className="py-4"
                  />
                </FormControl>
                <FormDescription>
                  Tiempo que el comprador tiene para completar el pago
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Paquetes de Boletos
          </CardTitle>
          <CardDescription>Ofrece descuentos por comprar múltiples boletos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-1">
              <div className="col-span-2">Cantidad</div>
              <div className="col-span-3">Precio</div>
              <div className="col-span-2">Descuento</div>
              <div className="col-span-4">Etiqueta</div>
              <div className="col-span-1"></div>
            </div>

            {packages.map((pkg, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={pkg.quantity}
                    onChange={(e) => updatePackage(index, 'quantity', parseInt(e.target.value) || 1)}
                    min={1}
                  />
                </div>
                <div className="col-span-3">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {currencyData?.symbol}
                    </span>
                    <Input
                      type="number"
                      value={pkg.price || Math.round(basePrice * pkg.quantity * (1 - pkg.discount_percent / 100))}
                      onChange={(e) => updatePackage(index, 'price', parseFloat(e.target.value) || 0)}
                      className="pl-6"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="relative">
                    <Input
                      type="number"
                      value={pkg.discount_percent}
                      onChange={(e) => updatePackage(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                      className="pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                </div>
                <div className="col-span-4">
                  <Input
                    placeholder="Ej: Mejor Valor"
                    value={pkg.label}
                    onChange={(e) => updatePackage(index, 'label', e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePackage(index)}
                    disabled={packages.length <= 1}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addPackage} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Paquete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Números de la Suerte</CardTitle>
          <CardDescription>Permite a los compradores elegir sus números favoritos</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="lucky_numbers_enabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Habilitar números de la suerte</FormLabel>
                  <FormDescription>
                    Los compradores podrán seleccionar números específicos
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
