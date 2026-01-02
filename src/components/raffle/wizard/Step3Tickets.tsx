import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { Plus, Trash2, Sparkles, Clock, Tag, Gift, Zap, TrendingDown, Percent, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';
import { 
  TICKET_COUNT_OPTIONS, 
  RESERVATION_TIME_OPTIONS, 
  RESERVATION_TIME_UNITS,
  MAX_RESERVATION_MINUTES,
  formatReservationTime,
  getTicketLimitByTier 
} from '@/lib/raffle-utils';
import { CURRENCIES, formatCurrency } from '@/lib/currency-utils';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { REQUIRED_FIELDS } from '@/hooks/useWizardValidation';
import { LabelCombobox } from './LabelCombobox';
import { NumberingConfigPanel } from './NumberingConfigPanel';
import { CustomNumbersUpload } from './CustomNumbersUpload';
import { FieldLockBadge } from './FieldLockBadge';
import { isPublished as checkIsPublished, getFieldRestriction } from '@/lib/raffle-edit-restrictions';

interface Step3Props {
  form: UseFormReturn<any>;
  existingTicketCount?: number;
  raffleStatus?: string;
}

interface Package {
  quantity: number;
  price: number;
  discount_percent: number;
  label: string;
  display_order: number;
  bonus_tickets?: number;
}

// Templates de promociones populares
const PACKAGE_TEMPLATES = [
  {
    id: '3x2',
    name: 'Paga 2, Lleva 3',
    shortName: '3x2',
    icon: Gift,
    description: '1 boleto gratis',
    quantity: 2,
    bonus_tickets: 1,
    discount_percent: 0,
    label: '🎁 3x2',
  },
  {
    id: '5x4',
    name: 'Paga 4, Lleva 5',
    shortName: '5x4',
    icon: Zap,
    description: '20% más boletos',
    quantity: 4,
    bonus_tickets: 1,
    discount_percent: 0,
    label: '⚡ 5x4',
  },
  {
    id: '10-off',
    name: '10 boletos -10%',
    shortName: '-10%',
    icon: TrendingDown,
    description: 'Descuento en volumen',
    quantity: 10,
    bonus_tickets: 0,
    discount_percent: 10,
    label: '💰 Ahorro',
  },
  {
    id: '20-off',
    name: '20 boletos -15%',
    shortName: '-15%',
    icon: Percent,
    description: 'Máximo descuento',
    quantity: 20,
    bonus_tickets: 0,
    discount_percent: 15,
    label: '🔥 Mejor Valor',
  },
];


export const Step3Tickets = ({ form, existingTicketCount = 0, raffleStatus }: Step3Props) => {
  const { organization } = useAuth();
  const ticketLimit = getTicketLimitByTier(organization?.subscription_tier || null);
  
  // Determine if this is a published raffle with existing tickets
  const isPublished = raffleStatus && raffleStatus !== 'draft';
  const hasExistingTickets = existingTicketCount > 0;
  const canOnlyIncrement = isPublished && hasExistingTickets;
  const [packages, setPackages] = useState<Package[]>([
    { quantity: 3, price: 0, discount_percent: 0, label: '', display_order: 0, bonus_tickets: 0 },
    { quantity: 5, price: 0, discount_percent: 0, label: '', display_order: 1, bonus_tickets: 0 },
    { quantity: 10, price: 0, discount_percent: 0, label: '', display_order: 2, bonus_tickets: 0 },
  ]);
  const [packagesInitialized, setPackagesInitialized] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  
  // Ya no necesitamos estado para cantidad personalizada - el input siempre está visible

  const currency = form.watch('currency_code') || 'MXN';
  const currencyData = CURRENCIES.find(c => c.code === currency);
  const basePrice = form.watch('ticket_price') || 0;
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

  const movePackage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= packages.length) return;
    
    const updated = [...packages];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    
    // Update display_order
    updated.forEach((pkg, i) => {
      pkg.display_order = i;
    });
    
    setPackages(updated);
    form.setValue('packages', updated);
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

  // Helper para calcular ahorro y total de boletos (mejorado)
  const getSavingsInfo = (pkg: Package) => {
    const normalPrice = basePrice * pkg.quantity;
    const finalPrice = pkg.price || normalPrice;
    const savings = normalPrice - finalPrice;
    const savingsPercent = normalPrice > 0 ? Math.round((savings / normalPrice) * 100) : 0;
    const hasDiscount = savings > 0;
    const totalTickets = pkg.quantity + (pkg.bonus_tickets || 0);
    const hasBonus = (pkg.bonus_tickets || 0) > 0;
    
    // Nuevo: calcular precio efectivo por boleto
    const effectivePricePerTicket = totalTickets > 0 ? finalPrice / totalTickets : basePrice;
    const savingsPerTicket = basePrice - effectivePricePerTicket;
    const savingsPerTicketPercent = basePrice > 0 
      ? Math.round((savingsPerTicket / basePrice) * 100) 
      : 0;
    
    // Descripción amigable de la promoción
    const promoDescription = hasBonus 
      ? `Paga ${pkg.quantity}, lleva ${totalTickets}` 
      : hasDiscount 
        ? `${savingsPercent}% de descuento` 
        : '';
    
    return { 
      normalPrice, 
      finalPrice, 
      savings, 
      savingsPercent, 
      hasDiscount, 
      totalTickets, 
      hasBonus,
      effectivePricePerTicket,
      savingsPerTicket,
      savingsPerTicketPercent,
      promoDescription
    };
  };

  // Agregar paquete desde template
  const addPackageFromTemplate = (templateId: string) => {
    const template = PACKAGE_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    
    const normalPrice = basePrice * template.quantity;
    const discountedPrice = template.discount_percent > 0 
      ? Math.round(normalPrice * (1 - template.discount_percent / 100))
      : normalPrice;
    
    const newPackage: Package = {
      quantity: template.quantity,
      price: discountedPrice,
      discount_percent: template.discount_percent,
      label: template.label,
      display_order: packages.length,
      bonus_tickets: template.bonus_tickets,
    };
    
    setPackages([...packages, newPackage]);
    form.setValue('packages', [...packages, newPackage]);
  };

  const availableTicketOptions = TICKET_COUNT_OPTIONS.filter(opt => opt.value <= ticketLimit);
  
  // Opciones rápidas de cantidad de boletos
  const quickTicketOptions = [100, 500, 1000, 2000, 5000, 10000].filter(v => v <= ticketLimit);
  
  // Verificar si el valor actual es una opción rápida
  const currentTotalTickets = form.watch('total_tickets');
  const isQuickOption = quickTicketOptions.includes(currentTotalTickets);
  

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
              render={({ field }) => {
                const ticketsToAdd = canOnlyIncrement && field.value > existingTicketCount 
                  ? field.value - existingTicketCount 
                  : 0;
                
                return (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    Total de Boletos
                    <span className="text-destructive">*</span>
                    <HelpTooltip content="Este es el número total de boletos disponibles para venta. Una vez publicado el sorteo, no podrás reducir esta cantidad." />
                  </FormLabel>
                  
                  {/* Banner informativo para rifas publicadas */}
                  {canOnlyIncrement && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
                      <span className="text-base">🔒</span>
                      <span>
                        Rifa publicada con <strong>{existingTicketCount.toLocaleString()}</strong> boletos generados. 
                        Solo puedes agregar más.
                      </span>
                    </div>
                  )}
                  
                  {/* Botones de atajos rápidos + Input siempre visible */}
                  <div className="space-y-3">
                    {!canOnlyIncrement && (
                      <div className="flex flex-wrap gap-2">
                        {quickTicketOptions.map(opt => (
                          <Button
                            key={opt}
                            type="button"
                            variant={field.value === opt ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              field.onChange(opt);
                              handleBlur('total_tickets');
                            }}
                          >
                            {opt.toLocaleString()}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    {/* Input siempre visible */}
                    <FormControl>
                      <div className="relative max-w-[200px]">
                        <Input
                          type="number"
                          value={field.value || ''}
                          onChange={(e) => {
                            const rawValue = parseInt(e.target.value) || 0;
                            // Enforce minimum based on existing tickets for published raffles
                            const minValue = canOnlyIncrement ? existingTicketCount : 1;
                            const value = Math.max(minValue, Math.min(rawValue, ticketLimit));
                            field.onChange(value);
                          }}
                          onBlur={() => handleBlur('total_tickets')}
                          max={ticketLimit}
                          min={canOnlyIncrement ? existingTicketCount : 1}
                          placeholder="Cantidad exacta"
                          className={cn("pr-16", totalTicketsError && "border-destructive")}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                          boletos
                        </span>
                      </div>
                    </FormControl>
                  </div>
                  
                  {/* Mostrar cuántos boletos nuevos se generarán */}
                  {canOnlyIncrement && ticketsToAdd > 0 && (
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Se generarán {ticketsToAdd.toLocaleString()} boletos adicionales 
                      (del {(existingTicketCount + 1).toLocaleString()} al {field.value.toLocaleString()})
                    </div>
                  )}
                  
                  <FormDescription>
                    {canOnlyIncrement 
                      ? `Mínimo: ${existingTicketCount.toLocaleString()} • Máximo: ${ticketLimit.toLocaleString()}`
                      : `Tu plan permite hasta ${ticketLimit.toLocaleString()} boletos`
                    }
                  </FormDescription>
                  {totalTicketsError && (
                    <p className="text-sm font-medium text-destructive">{totalTicketsError}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}}
            />

            <FormField
              control={form.control}
              name="ticket_price"
              render={({ field }) => {
                const priceRestriction = getFieldRestriction('ticket_price', raffleStatus);
                return (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    Precio por Boleto
                    <span className="text-destructive">*</span>
                    <HelpTooltip content="El precio individual de cada boleto. Los paquetes se calcularán automáticamente basándose en este precio base." />
                    {priceRestriction && (
                      <FieldLockBadge 
                        type={priceRestriction.type === 'locked' ? 'locked' : 'restricted'}
                        message={priceRestriction.message}
                        shortMessage={priceRestriction.shortMessage}
                      />
                    )}
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
                        disabled={!!priceRestriction}
                      />
                    </div>
                  </FormControl>
                  {ticketPriceError && (
                    <p className="text-sm font-medium text-destructive">{ticketPriceError}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}}
            />
          </div>

          {/* Numbering Config - Single source of truth */}
          {checkIsPublished(raffleStatus) ? (
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">Configuración de Numeración</span>
                <FieldLockBadge 
                  type="locked"
                  message="El formato de numeración está fijado por los boletos ya generados"
                  shortMessage="Bloqueado"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                La configuración de numeración no puede modificarse después de publicar el sorteo.
              </p>
            </div>
          ) : (
            <>
              <NumberingConfigPanel form={form} totalTickets={currentTotalTickets || 100} />
              
              {/* Custom Numbers Upload (only show when custom_list mode) */}
              {form.watch('numbering_config')?.mode === 'custom_list' && (
                <CustomNumbersUpload 
                  form={form} 
                  raffleId={form.watch('id')}
                  totalTickets={currentTotalTickets || 100} 
                />
              )}
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="min_tickets_per_purchase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    Mín. por compra
                    <HelpTooltip content="Cantidad mínima de boletos que un comprador debe seleccionar para poder continuar al pago." />
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="1" 
                      min={1}
                      {...field}
                      value={field.value || 1}
                      onChange={(e) => field.onChange(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </FormControl>
                  <FormDescription>Mínimo 1</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_tickets_per_purchase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    Máx. por compra
                    <HelpTooltip content="Límite de boletos por transacción. 0 = sin límite." />
                  </FormLabel>
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
            <Sparkles className="w-5 h-5 text-primary" />
            Paquetes de Boletos
          </CardTitle>
          <CardDescription>
            Crea promociones atractivas para incentivar compras de mayor volumen
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6 space-y-4">
          {/* Promociones Populares - Templates rápidos */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Promociones Populares
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PACKAGE_TEMPLATES.map((template) => {
                const TemplateIcon = template.icon;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => addPackageFromTemplate(template.id)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-center group"
                  >
                    <TemplateIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium">{template.shortName}</span>
                    <span className="text-[10px] text-muted-foreground">{template.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="text-sm font-medium mb-3 block">Tus Paquetes</label>
            <div className="space-y-3">
              {packages.map((pkg, index) => {
                const { 
                  normalPrice, 
                  savings, 
                  savingsPercent, 
                  hasDiscount, 
                  totalTickets, 
                  hasBonus,
                  effectivePricePerTicket,
                  savingsPerTicketPercent,
                  promoDescription
                } = getSavingsInfo(pkg);
                
                const hasPromo = hasBonus || hasDiscount;
                
                return (
                  <div 
                    key={index} 
                    className={cn(
                      "rounded-lg border bg-card p-4 space-y-3 transition-shadow",
                      hasPromo && "ring-1 ring-primary/20"
                    )}
                  >
                    {/* Header con título, reordenar y eliminar */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">Paquete {index + 1}</span>
                        {promoDescription && (
                          <Badge className="bg-primary/10 text-primary text-xs">
                            {promoDescription}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => movePackage(index, 'up')}
                          disabled={index === 0}
                          className="h-7 w-7 shrink-0"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => movePackage(index, 'down')}
                          disabled={index === packages.length - 1}
                          className="h-7 w-7 shrink-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePackage(index)}
                          disabled={false}
                          className="h-7 w-7 shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Visual de la ecuación: X boletos + Y gratis = Z total */}
                    {hasBonus && (
                      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-muted/50 rounded-lg text-sm">
                        <div className="text-center">
                          <div className="font-bold text-lg">{pkg.quantity}</div>
                          <div className="text-[10px] text-muted-foreground">paga</div>
                        </div>
                        <span className="text-muted-foreground">+</span>
                        <div className="text-center">
                          <div className="font-bold text-lg text-primary">{pkg.bonus_tickets}</div>
                          <div className="text-[10px] text-muted-foreground">gratis</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <div className="text-center">
                          <div className="font-bold text-lg text-green-600 dark:text-green-400">{totalTickets}</div>
                          <div className="text-[10px] text-muted-foreground">total</div>
                        </div>
                      </div>
                    )}

                    {/* Campos de edición */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="min-w-0">
                        <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
                        <Input
                          type="number"
                          value={pkg.quantity}
                          onChange={(e) => updatePackage(index, 'quantity', parseInt(e.target.value) || 1)}
                          min={1}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          +Bonus
                        </label>
                        <Input
                          type="number"
                          value={pkg.bonus_tickets || 0}
                          onChange={(e) => updatePackage(index, 'bonus_tickets', parseInt(e.target.value) || 0)}
                          min={0}
                          placeholder="0"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          % Desc.
                        </label>
                        <Input
                          type="number"
                          value={pkg.discount_percent || 0}
                          onChange={(e) => updatePackage(index, 'discount_percent', parseInt(e.target.value) || 0)}
                          min={0}
                          max={99}
                          placeholder="0"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="text-xs text-muted-foreground mb-1 block">Precio Final</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                            {currencyData?.symbol}
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
                        <label className="text-xs text-muted-foreground mb-1 block">
                          <Tag className="w-3 h-3 inline mr-1" />
                          Etiqueta
                        </label>
                        <LabelCombobox
                          value={pkg.label}
                          onValueChange={(v) => updatePackage(index, 'label', v)}
                          placeholder="Ej: Popular"
                        />
                      </div>
                    </div>

                    {/* Resumen de ahorro */}
                    {hasPromo && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-semibold">{totalTickets} boletos</span>
                          <span className="text-muted-foreground">por</span>
                          {hasDiscount && (
                            <span className="line-through text-muted-foreground">
                              {currencyData?.symbol}{normalPrice.toLocaleString()}
                            </span>
                          )}
                          <span className="font-semibold text-primary">
                            {currencyData?.symbol}{(pkg.price || normalPrice).toLocaleString()}
                          </span>
                        </div>
                        
                        {savingsPerTicketPercent > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            💎 {currencyData?.symbol}{effectivePricePerTicket.toFixed(0)}/boleto ({savingsPerTicketPercent}% menos)
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <Button type="button" variant="outline" onClick={addPackage} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Paquete Personalizado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
