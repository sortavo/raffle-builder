import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Sparkles, Clock } from 'lucide-react';
import { 
  TICKET_COUNT_OPTIONS, 
  RESERVATION_TIME_OPTIONS, 
  RESERVATION_TIME_UNITS,
  MAX_RESERVATION_MINUTES,
  formatReservationTime,
  getTicketLimitByTier 
} from '@/lib/raffle-utils';
import { CURRENCIES } from '@/lib/currency-utils';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { REQUIRED_FIELDS } from '@/hooks/useWizardValidation';

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
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const currency = form.watch('currency_code') || 'MXN';
  const currencyData = CURRENCIES.find(c => c.code === currency);
  const basePrice = form.watch('ticket_price') || 0;
  const reservationTime = form.watch('reservation_time_minutes') || 15;
  
  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: string): string | null => {
    if (!touchedFields[field]) return null;
    const value = form.watch(field);
    
    if (field === 'ticket_price') {
      if (typeof value !== 'number' || value <= 0) {
        return REQUIRED_FIELDS.ticket_price.message;
      }
    }
    if (field === 'total_tickets') {
      if (typeof value !== 'number' || value <= 0) {
        return REQUIRED_FIELDS.total_tickets.message;
      }
    }
    return null;
  };

  const ticketPriceError = getFieldError('ticket_price');
  const totalTicketsError = getFieldError('total_tickets');
  
  // Custom reservation time state
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customValue, setCustomValue] = useState(15);
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  // Check if current value matches a preset
  useEffect(() => {
    const matchesPreset = RESERVATION_TIME_OPTIONS.some(opt => opt.value === reservationTime);
    if (!matchesPreset && reservationTime > 0) {
      setIsCustomTime(true);
      // Determine best unit for display
      if (reservationTime >= 1440 && reservationTime % 1440 === 0) {
        setCustomValue(reservationTime / 1440);
        setCustomUnit('days');
      } else if (reservationTime >= 60 && reservationTime % 60 === 0) {
        setCustomValue(reservationTime / 60);
        setCustomUnit('hours');
      } else {
        setCustomValue(reservationTime);
        setCustomUnit('minutes');
      }
    }
  }, []);

  const handleReservationTimeChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomTime(true);
      // Keep current value when switching to custom
    } else {
      setIsCustomTime(false);
      form.setValue('reservation_time_minutes', parseInt(value));
    }
  };

  const handleCustomValueChange = (value: number, unit: 'minutes' | 'hours' | 'days') => {
    const unitData = RESERVATION_TIME_UNITS.find(u => u.value === unit);
    const minutes = value * (unitData?.multiplier || 1);
    const clampedMinutes = Math.min(Math.max(1, minutes), MAX_RESERVATION_MINUTES);
    form.setValue('reservation_time_minutes', clampedMinutes);
    setCustomValue(value);
    setCustomUnit(unit);
  };

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
                  <FormLabel className="flex items-center gap-1">
                    Total de Boletos
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select 
                    onValueChange={(v) => {
                      field.onChange(parseInt(v));
                      handleBlur('total_tickets');
                    }} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(totalTicketsError && "border-destructive")}>
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
                  {totalTicketsError && (
                    <p className="text-sm font-medium text-destructive">{totalTicketsError}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ticket_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Precio por Boleto
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {currencyData?.symbol || '$'}
                      </span>
                      <Input 
                        type="number" 
                        placeholder="100" 
                        className={cn("pl-8", ticketPriceError && "border-destructive focus-visible:ring-destructive")}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        onBlur={() => handleBlur('ticket_price')}
                      />
                    </div>
                  </FormControl>
                  {ticketPriceError && (
                    <p className="text-sm font-medium text-destructive">{ticketPriceError}</p>
                  )}
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
                <FormLabel className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Tiempo de reservación
                </FormLabel>
                <FormDescription className="mt-1 mb-3">
                  Tiempo que el comprador tiene para completar el pago antes de que expire su reservación
                </FormDescription>
                <div className="space-y-3">
                  <Select
                    value={isCustomTime ? 'custom' : field.value?.toString()}
                    onValueChange={handleReservationTimeChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tiempo de reservación">
                          {isCustomTime 
                            ? `Personalizado: ${formatReservationTime(reservationTime)}`
                            : formatReservationTime(field.value || 15)
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RESERVATION_TIME_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-xs text-muted-foreground">{opt.description}</span>
                          </div>
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

                  {isCustomTime && (
                    <div className="flex gap-2 items-center p-3 rounded-lg border bg-muted/50">
                      <Input
                        type="number"
                        min={1}
                        max={customUnit === 'days' ? 7 : customUnit === 'hours' ? 168 : MAX_RESERVATION_MINUTES}
                        value={customValue}
                        onChange={(e) => handleCustomValueChange(parseInt(e.target.value) || 1, customUnit)}
                        className="w-24"
                      />
                      <Select
                        value={customUnit}
                        onValueChange={(v) => handleCustomValueChange(customValue, v as 'minutes' | 'hours' | 'days')}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESERVATION_TIME_UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground ml-2">
                        = {formatReservationTime(reservationTime)}
                      </span>
                    </div>
                  )}
                </div>
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
            {/* Desktop header - hidden on mobile */}
            <div className="hidden sm:grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-1">
              <div className="col-span-2">Cantidad</div>
              <div className="col-span-3">Precio</div>
              <div className="col-span-2">Descuento</div>
              <div className="col-span-4">Etiqueta</div>
              <div className="col-span-1"></div>
            </div>

            {packages.map((pkg, index) => (
              <div key={index} className="space-y-3 sm:space-y-0 p-3 sm:p-0 border sm:border-0 rounded-lg sm:rounded-none">
                {/* Mobile: Stacked layout */}
                <div className="sm:hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Paquete {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePackage(index)}
                      disabled={packages.length <= 1}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Cantidad</label>
                      <Input
                        type="number"
                        value={pkg.quantity}
                        onChange={(e) => updatePackage(index, 'quantity', parseInt(e.target.value) || 1)}
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Descuento</label>
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
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Precio</label>
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
                    <div>
                      <label className="text-xs text-muted-foreground">Etiqueta</label>
                      <Input
                        placeholder="Ej: Mejor Valor"
                        value={pkg.label}
                        onChange={(e) => updatePackage(index, 'label', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop: Grid layout */}
                <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
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
