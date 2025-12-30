import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Sparkles, Clock, Tag } from 'lucide-react';
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
import { LabelCombobox } from './LabelCombobox';
import { NumberingConfigPanel } from './NumberingConfigPanel';
import { CustomNumbersUpload } from './CustomNumbersUpload';

interface Step3Props {
  form: UseFormReturn<any>;
}

interface Package {
  quantity: number;
  price: number;
  discount_percent: number;
  label: string;
  display_order: number;
  bonus_tickets?: number; // Boletos gratis adicionales (ej: 3x2 = quantity:2, bonus:1)
}

// Rangos de numeración personalizados
interface TicketRange {
  id: string;
  from: number;
  to: number;
}

export const Step3Tickets = ({ form }: Step3Props) => {
  const { organization } = useAuth();
  const ticketLimit = getTicketLimitByTier(organization?.subscription_tier || null);
  const [packages, setPackages] = useState<Package[]>([
    { quantity: 3, price: 0, discount_percent: 0, label: '', display_order: 0, bonus_tickets: 0 },
    { quantity: 5, price: 0, discount_percent: 0, label: '', display_order: 1, bonus_tickets: 0 },
    { quantity: 10, price: 0, discount_percent: 0, label: '', display_order: 2, bonus_tickets: 0 },
  ]);
  const [packagesInitialized, setPackagesInitialized] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  
  // Estado para cantidad personalizada de boletos
  const [isCustomTicketCount, setIsCustomTicketCount] = useState(false);
  
  // Estado para rangos personalizados
  const [ticketRanges, setTicketRanges] = useState<TicketRange[]>([
    { id: '1', from: 1, to: 100 }
  ]);

  const currency = form.watch('currency_code') || 'MXN';
  const currencyData = CURRENCIES.find(c => c.code === currency);
  const basePrice = form.watch('ticket_price') || 0;
  const ticketFormat = form.watch('ticket_number_format') || 'sequential';
  const reservationTime = form.watch('reservation_time_minutes') || 15;
  const formPackages = form.watch('packages');
  
  // Sincronizar estado local con paquetes del form (cargados de la BD)
  useEffect(() => {
    if (!packagesInitialized && formPackages && Array.isArray(formPackages) && formPackages.length > 0) {
      const validPackages = formPackages.filter((pkg: Package) => pkg.quantity > 0);
      if (validPackages.length > 0) {
        setPackages(validPackages);
        setPackagesInitialized(true);
      }
    }
  }, [formPackages, packagesInitialized]);
  
  // Initialize package prices when basePrice changes (solo para paquetes nuevos sin precio)
  useEffect(() => {
    if (basePrice > 0 && !packagesInitialized) {
      setPackages(prev => prev.map(pkg => ({
        ...pkg,
        price: pkg.price === 0 ? basePrice * pkg.quantity : pkg.price
      })));
    }
  }, [basePrice, packagesInitialized]);

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
    const lastQuantity = packages.length > 0 ? packages[packages.length - 1].quantity : 1;
    const newQuantity = lastQuantity + 5;
    const normalPrice = basePrice * newQuantity;
    
    setPackages([...packages, {
      quantity: newQuantity,
      price: normalPrice, // Sin descuento por defecto
      discount_percent: 0,
      label: '',
      display_order: packages.length,
      bonus_tickets: 0,
    }]);
  };

  const removePackage = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const updatePackage = (index: number, field: keyof Package, value: string | number) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: value };
    
    const normalPrice = basePrice * updated[index].quantity;
    
    // Si cambia la cantidad, recalcular precio manteniendo el descuento actual
    if (field === 'quantity') {
      const newNormalPrice = basePrice * Number(value);
      const currentDiscount = updated[index].discount_percent || 0;
      updated[index].price = Math.round(newNormalPrice * (1 - currentDiscount / 100));
    }
    
    // Si cambia el precio final → recalcular el descuento (no puede ser mayor al normal)
    if (field === 'price') {
      const finalPrice = Math.min(Number(value), normalPrice); // Limitar al precio normal
      updated[index].price = finalPrice;
      if (normalPrice > 0 && finalPrice < normalPrice) {
        updated[index].discount_percent = Math.round(((normalPrice - finalPrice) / normalPrice) * 100);
      } else {
        updated[index].discount_percent = 0;
      }
    }
    
    // Si cambia el descuento → recalcular el precio final
    if (field === 'discount_percent') {
      const discount = Math.min(99, Math.max(0, Number(value)));
      updated[index].discount_percent = discount;
      updated[index].price = Math.round(normalPrice * (1 - discount / 100));
    }
    
    setPackages(updated);
    form.setValue('packages', updated);
  };

  // Helper para calcular ahorro y total de boletos
  const getSavingsInfo = (pkg: Package) => {
    const normalPrice = basePrice * pkg.quantity;
    const finalPrice = pkg.price || normalPrice;
    const savings = normalPrice - finalPrice;
    const savingsPercent = normalPrice > 0 ? Math.round((savings / normalPrice) * 100) : 0;
    const hasDiscount = savings > 0;
    const totalTickets = pkg.quantity + (pkg.bonus_tickets || 0);
    const hasBonus = (pkg.bonus_tickets || 0) > 0;
    
    return { normalPrice, finalPrice, savings, savingsPercent, hasDiscount, totalTickets, hasBonus };
  };

  const availableTicketOptions = TICKET_COUNT_OPTIONS.filter(opt => opt.value <= ticketLimit);
  
  // Opciones rápidas de cantidad de boletos
  const quickTicketOptions = [100, 500, 1000, 2000, 5000, 10000].filter(v => v <= ticketLimit);
  
  // Verificar si el valor actual es una opción rápida
  const currentTotalTickets = form.watch('total_tickets');
  const isQuickOption = quickTicketOptions.includes(currentTotalTickets);
  
  // Inicializar modo personalizado si el valor no es una opción rápida
  useEffect(() => {
    if (currentTotalTickets > 0 && !quickTicketOptions.includes(currentTotalTickets)) {
      setIsCustomTicketCount(true);
    }
  }, []);
  
  // Calcular total de boletos en rangos
  const totalTicketsInRanges = ticketRanges.reduce((sum, range) => {
    const count = Math.max(0, range.to - range.from + 1);
    return sum + count;
  }, 0);
  
  // Funciones para manejar rangos
  const addRange = () => {
    const lastRange = ticketRanges[ticketRanges.length - 1];
    const newFrom = lastRange ? lastRange.to + 1 : 1;
    setTicketRanges([...ticketRanges, {
      id: Date.now().toString(),
      from: newFrom,
      to: newFrom + 99
    }]);
  };
  
  const removeRange = (id: string) => {
    if (ticketRanges.length > 1) {
      setTicketRanges(ticketRanges.filter(r => r.id !== id));
    }
  };
  
  const updateRange = (id: string, field: 'from' | 'to', value: number) => {
    setTicketRanges(ticketRanges.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };
  
  // Sincronizar rangos con el form
  useEffect(() => {
    if (ticketFormat === 'ranged') {
      form.setValue('ticket_ranges', ticketRanges);
      form.setValue('total_tickets', totalTicketsInRanges);
    }
  }, [ticketRanges, ticketFormat]);

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6 pt-0 md:pt-6">
          <CardTitle className="text-lg md:text-xl">Configuración de Boletos</CardTitle>
          <CardDescription>Define la cantidad y precio de los boletos</CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6 space-y-5 md:space-y-6">
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
                  
                  {/* Botones de selección rápida */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {quickTicketOptions.map(opt => (
                        <Button
                          key={opt}
                          type="button"
                          variant={field.value === opt && !isCustomTicketCount ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            field.onChange(opt);
                            setIsCustomTicketCount(false);
                            handleBlur('total_tickets');
                          }}
                        >
                          {opt.toLocaleString()}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant={isCustomTicketCount ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsCustomTicketCount(true)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Personalizado
                      </Button>
                    </div>
                    
                    {/* Input para cantidad personalizada */}
                    {isCustomTicketCount && (
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = Math.min(parseInt(e.target.value) || 0, ticketLimit);
                              field.onChange(value);
                            }}
                            onBlur={() => handleBlur('total_tickets')}
                            max={ticketLimit}
                            min={1}
                            placeholder="Ej: 1750"
                            className={cn("max-w-[200px]", totalTicketsError && "border-destructive")}
                          />
                          <span className="text-sm text-muted-foreground">boletos</span>
                        </div>
                      </FormControl>
                    )}
                  </div>
                  
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
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Si cambia a rangos, inicializar con el total actual
                      if (value === 'ranged') {
                        const total = form.getValues('total_tickets') || 100;
                        setTicketRanges([{ id: '1', from: 1, to: total }]);
                      }
                    }}
                    value={field.value || 'sequential'}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="sequential" id="sequential" />
                      <label htmlFor="sequential" className="text-sm flex items-center gap-2 cursor-pointer flex-1">
                        Secuencial (001, 002...)
                        <Badge variant="secondary" className="text-xs">Preferido</Badge>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="prefixed" id="prefixed" />
                      <label htmlFor="prefixed" className="text-sm cursor-pointer flex-1">Con Prefijo (TKT-001...)</label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="random" id="random" />
                      <label htmlFor="random" className="text-sm cursor-pointer flex-1">Aleatorio</label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="ranged" id="ranged" />
                      <label htmlFor="ranged" className="text-sm cursor-pointer flex-1">Por Rangos (define tus rangos)</label>
                    </div>
                  </RadioGroup>
                </FormControl>
                
                {/* UI para rangos personalizados */}
                {field.value === 'ranged' && (
                  <Card className="mt-4 border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Rangos de Numeración
                      </CardTitle>
                      <CardDescription>Define los rangos de números para tus boletos</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {ticketRanges.map((range, index) => (
                        <div key={range.id} className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-muted-foreground w-16">Rango {index + 1}:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Desde</span>
                            <Input
                              type="number"
                              value={range.from}
                              onChange={(e) => updateRange(range.id, 'from', parseInt(e.target.value) || 0)}
                              className="w-24"
                              min={0}
                            />
                            <span className="text-sm">Hasta</span>
                            <Input
                              type="number"
                              value={range.to}
                              onChange={(e) => updateRange(range.id, 'to', parseInt(e.target.value) || 0)}
                              className="w-24"
                              min={range.from}
                            />
                            <span className="text-xs text-muted-foreground">
                              ({Math.max(0, range.to - range.from + 1).toLocaleString()} boletos)
                            </span>
                          </div>
                          {ticketRanges.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRange(range.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addRange}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Agregar Rango
                        </Button>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Total: </span>
                          <span className={cn(
                            "font-medium",
                            totalTicketsInRanges > ticketLimit && "text-destructive"
                          )}>
                            {totalTicketsInRanges.toLocaleString()} boletos
                          </span>
                          {totalTicketsInRanges > ticketLimit && (
                            <span className="text-xs text-destructive ml-2">
                              (excede límite de {ticketLimit.toLocaleString()})
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* New Advanced Numbering Config */}
          <NumberingConfigPanel form={form} totalTickets={currentTotalTickets || 100} />
          
          {/* Custom Numbers Upload (only show when custom_list mode) */}
          {form.watch('numbering_config')?.mode === 'custom_list' && (
            <CustomNumbersUpload 
              form={form} 
              raffleId={form.watch('id')}
              totalTickets={currentTotalTickets || 100} 
            />
          )}

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
                    <div className="flex flex-wrap gap-2 items-center p-3 rounded-lg border bg-muted/50">
                      <Input
                        type="number"
                        min={1}
                        max={customUnit === 'days' ? 7 : customUnit === 'hours' ? 168 : MAX_RESERVATION_MINUTES}
                        value={customValue}
                        onChange={(e) => handleCustomValueChange(parseInt(e.target.value) || 1, customUnit)}
                        className="w-20"
                      />
                      <Select
                        value={customUnit}
                        onValueChange={(v) => handleCustomValueChange(customValue, v as 'minutes' | 'hours' | 'days')}
                      >
                        <SelectTrigger className="w-28">
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
                      <span className="text-xs sm:text-sm text-muted-foreground">
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

      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Sparkles className="w-5 h-5" />
            Paquetes de Boletos
          </CardTitle>
          <CardDescription>
            Crea paquetes con descuentos, promociones tipo "3x2" (paga 2, lleva 3) o muestra precios por cantidad
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <div className="space-y-3">
            {/* Desktop header - hide on mobile */}
            <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
              <div className="col-span-1">Cant.</div>
              <div className="col-span-1">+Bonus</div>
              <div className="col-span-2">P. Final</div>
              <div className="col-span-1">%</div>
              <div className="col-span-2">Total</div>
              <div className="col-span-4">
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Etiqueta
                </div>
              </div>
              <div className="col-span-1"></div>
            </div>

            {packages.map((pkg, index) => {
              const { normalPrice, savings, savingsPercent, hasDiscount, totalTickets, hasBonus } = getSavingsInfo(pkg);
              
              return (
                <div key={index} className="space-y-3 md:space-y-0 p-3 md:p-0 border md:border-0 rounded-lg md:rounded-none bg-muted/30 md:bg-transparent">
                  {/* Mobile: Stacked compact layout */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Paquete {index + 1}</span>
                        {hasBonus && (
                          <Badge className="bg-primary/10 text-primary text-[10px] px-1.5">
                            {pkg.quantity}+{pkg.bonus_tickets} Gratis
                          </Badge>
                        )}
                      </div>
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
                    
                    <div className="grid grid-cols-4 gap-2">
                      <div className="min-w-0">
                        <label className="text-[10px] text-muted-foreground truncate block">Cantidad</label>
                        <Input
                          type="number"
                          value={pkg.quantity}
                          onChange={(e) => updatePackage(index, 'quantity', parseInt(e.target.value) || 1)}
                          min={1}
                          className="h-9 text-sm px-2"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="text-[10px] text-muted-foreground truncate block">+Bonus</label>
                        <Input
                          type="number"
                          value={pkg.bonus_tickets || 0}
                          onChange={(e) => updatePackage(index, 'bonus_tickets', parseInt(e.target.value) || 0)}
                          min={0}
                          placeholder="0"
                          className="h-9 text-sm px-2"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="text-[10px] text-muted-foreground truncate block">Precio</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                            $
                          </span>
                          <Input
                            type="number"
                            value={pkg.price || normalPrice}
                            onChange={(e) => updatePackage(index, 'price', parseFloat(e.target.value) || 0)}
                            className="h-9 pl-5 text-sm"
                          />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <label className="text-[10px] text-muted-foreground truncate block">Dto %</label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={pkg.discount_percent || 0}
                            onChange={(e) => updatePackage(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                            min={0}
                            max={99}
                            className="h-9 pr-5 text-sm"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Total: <span className="font-medium text-foreground">{totalTickets} boletos</span>
                        {hasDiscount && (
                          <span className="ml-1">por <span className={cn(hasDiscount && "line-through")}>${normalPrice.toLocaleString()}</span> ${pkg.price.toLocaleString()}</span>
                        )}
                      </span>
                      <div className="flex gap-1">
                        {hasBonus && (
                          <Badge className="bg-primary/10 text-primary text-[10px] px-1.5">
                            +{pkg.bonus_tickets} gratis
                          </Badge>
                        )}
                        {hasDiscount && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5">
                            -{savingsPercent}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-1 block">Etiqueta</label>
                      <LabelCombobox
                        value={pkg.label}
                        onValueChange={(v) => updatePackage(index, 'label', v)}
                        placeholder="Ej: Popular, 3x2, Mejor Valor"
                      />
                    </div>
                  </div>

                  {/* Desktop: Grid layout */}
                  <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={pkg.quantity}
                        onChange={(e) => updatePackage(index, 'quantity', parseInt(e.target.value) || 1)}
                        min={1}
                        className="text-center px-1 h-9 text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={pkg.bonus_tickets || 0}
                        onChange={(e) => updatePackage(index, 'bonus_tickets', parseInt(e.target.value) || 0)}
                        min={0}
                        placeholder="0"
                        className="text-center px-1 h-9 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                          {currencyData?.symbol}
                        </span>
                        <Input
                          type="number"
                          value={pkg.price || normalPrice}
                          onChange={(e) => updatePackage(index, 'price', parseFloat(e.target.value) || 0)}
                          className="pl-5 h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <Input
                          type="number"
                          value={pkg.discount_percent || 0}
                          onChange={(e) => updatePackage(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                          min={0}
                          max={99}
                          className="pr-4 text-center px-1 h-9 text-sm"
                        />
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium">{totalTickets} boletos</span>
                        {hasBonus && (
                          <Badge className="bg-primary/10 text-primary text-[10px] px-1.5 whitespace-nowrap">
                            +{pkg.bonus_tickets} gratis
                          </Badge>
                        )}
                        {hasDiscount && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px]">
                            -{savingsPercent}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="col-span-4">
                      <LabelCombobox
                        value={pkg.label}
                        onValueChange={(v) => updatePackage(index, 'label', v)}
                        placeholder="Ej: Popular, 3x2, Mejor Valor"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePackage(index)}
                        disabled={packages.length <= 1}
                        className="h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            <Button type="button" variant="outline" onClick={addPackage} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Paquete
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
