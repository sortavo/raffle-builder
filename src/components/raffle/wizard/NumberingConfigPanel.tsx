import { useState, useEffect, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Hash, Settings2, Eye, ChevronDown, Shuffle, ListOrdered, FileSpreadsheet, Wand2, Sparkles, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumberingConfig {
  mode: 'sequential' | 'random_permutation' | 'custom_list' | 'template';
  start_number: number;
  step: number;
  pad_enabled: boolean;
  pad_width: number | null;
  pad_char: string;
  prefix: string | null;
  suffix: string | null;
  separator: string;
  range_end: number | null;
  custom_numbers: string[] | null;
}

interface NumberingConfigPanelProps {
  form: UseFormReturn<any>;
  totalTickets: number;
}

// Función para obtener la recomendación basada en cantidad de boletos
function getRecommendedPreset(totalTickets: number): { id: string; reason: string } {
  if (totalTickets <= 99) {
    return { id: 'simple', reason: 'Ideal para rifas pequeñas, números fáciles de recordar' };
  }
  if (totalTickets <= 999) {
    return { id: 'zeros_auto', reason: 'Mejor legibilidad con 3 dígitos (001, 002...)' };
  }
  if (totalTickets <= 9999) {
    return { id: 'zeros_auto', reason: 'Formato limpio de 4 dígitos (0001, 0002...)' };
  }
  if (totalTickets <= 99999) {
    return { id: 'lottery_7', reason: 'Formato profesional para rifas grandes' };
  }
  return { id: 'lottery_7', reason: 'Como boletos de lotería nacional' };
}

// Presets de numeración
const NUMBERING_PRESETS = [
  {
    id: 'simple',
    name: 'Consecutivo Simple',
    description: 'Sin ceros (1, 2, 3...)',
    icon: ListOrdered,
    config: {
      mode: 'sequential' as const,
      start_number: 1,
      step: 1,
      pad_enabled: false,
      pad_width: null,
      pad_char: '0',
      prefix: null,
      suffix: null,
      separator: '',
      range_end: null,
    }
  },
  {
    id: 'zeros_auto',
    name: 'Con Ceros (Auto)',
    description: 'Ajusta automáticamente (001, 002...)',
    icon: Hash,
    config: {
      mode: 'sequential' as const,
      start_number: 1,
      step: 1,
      pad_enabled: true,
      pad_width: null, // null = auto
      pad_char: '0',
      prefix: null,
      suffix: null,
      separator: '',
      range_end: null,
    }
  },
  {
    id: 'zeros_custom',
    name: 'Con Ceros (Custom)',
    description: 'Tú defines el ancho',
    icon: Settings2,
    config: {
      mode: 'sequential' as const,
      start_number: 1,
      step: 1,
      pad_enabled: true,
      pad_width: 5,
      pad_char: '0',
      prefix: null,
      suffix: null,
      separator: '',
      range_end: null,
    }
  },
  {
    id: 'lottery_7',
    name: 'Tipo Lotería (7 dígitos)',
    description: 'Como lotería nacional (0000001...)',
    icon: Wand2,
    config: {
      mode: 'sequential' as const,
      start_number: 1,
      step: 1,
      pad_enabled: true,
      pad_width: 7,
      pad_char: '0',
      prefix: null,
      suffix: null,
      separator: '',
      range_end: null,
    }
  },
  {
    id: 'prefixed',
    name: 'Prefijo + Ceros',
    description: 'TKT-000001, TKT-000002...',
    icon: Hash,
    config: {
      mode: 'sequential' as const,
      start_number: 1,
      step: 1,
      pad_enabled: true,
      pad_width: 6,
      pad_char: '0',
      prefix: 'TKT',
      suffix: null,
      separator: '-',
      range_end: null,
    }
  },
  {
    id: 'random',
    name: 'Aleatorio Real',
    description: 'Números en orden aleatorio',
    icon: Shuffle,
    config: {
      mode: 'random_permutation' as const,
      start_number: 1,
      step: 1,
      pad_enabled: true,
      pad_width: null,
      pad_char: '0',
      prefix: null,
      suffix: null,
      separator: '',
      range_end: null,
    }
  },
];

// Función para generar preview de números
function generatePreviewNumbers(config: NumberingConfig, totalTickets: number, count: number = 10): string[] {
  const numbers: string[] = [];
  const actualPadWidth = config.pad_width ?? Math.max(3, totalTickets.toString().length);
  
  for (let i = 1; i <= Math.min(count, totalTickets); i++) {
    let displayNumber = config.start_number + (i - 1) * config.step;
    let ticketNumber = displayNumber.toString();
    
    if (config.pad_enabled) {
      ticketNumber = ticketNumber.padStart(actualPadWidth, config.pad_char);
    }
    
    if (config.prefix) {
      ticketNumber = config.prefix + config.separator + ticketNumber;
    }
    
    if (config.suffix) {
      ticketNumber = ticketNumber + config.separator + config.suffix;
    }
    
    numbers.push(ticketNumber);
  }
  
  // Add last number
  if (totalTickets > count) {
    const lastIndex = totalTickets;
    let lastDisplayNumber = config.start_number + (lastIndex - 1) * config.step;
    let lastTicketNumber = lastDisplayNumber.toString();
    
    if (config.pad_enabled) {
      lastTicketNumber = lastTicketNumber.padStart(actualPadWidth, config.pad_char);
    }
    
    if (config.prefix) {
      lastTicketNumber = config.prefix + config.separator + lastTicketNumber;
    }
    
    if (config.suffix) {
      lastTicketNumber = lastTicketNumber + config.separator + config.suffix;
    }
    
    numbers.push('...');
    numbers.push(lastTicketNumber);
  }
  
  return numbers;
}

export function NumberingConfigPanel({ form, totalTickets }: NumberingConfigPanelProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('simple');
  
  // Get current config from form - default to simple (consecutivo)
  const currentConfig: NumberingConfig = form.watch('numbering_config') || NUMBERING_PRESETS[0].config;
  
  // Get recommendation based on total tickets
  const recommendedPreset = useMemo(() => getRecommendedPreset(totalTickets), [totalTickets]);
  
  // Generate preview numbers
  const previewNumbers = useMemo(() => {
    return generatePreviewNumbers(currentConfig, totalTickets);
  }, [currentConfig, totalTickets]);
  
  // Apply preset
  const applyPreset = (presetId: string) => {
    const preset = NUMBERING_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      form.setValue('numbering_config', preset.config);
      
      // Also set legacy field for backwards compatibility
      if (preset.config.mode === 'random_permutation') {
        form.setValue('ticket_number_format', 'random');
      } else if (preset.config.prefix) {
        form.setValue('ticket_number_format', 'prefixed');
      } else {
        form.setValue('ticket_number_format', 'sequential');
      }
    }
  };
  
  // Update single config field
  const updateConfig = (field: keyof NumberingConfig, value: any) => {
    const newConfig = { ...currentConfig, [field]: value };
    form.setValue('numbering_config', newConfig);
    setSelectedPreset('custom'); // Mark as custom when manually changed
  };
  
  // Detect current preset on mount
  useEffect(() => {
    const existingConfig = form.getValues('numbering_config');
    if (existingConfig) {
      const matching = NUMBERING_PRESETS.find(p => 
        p.config.mode === existingConfig.mode &&
        p.config.pad_enabled === existingConfig.pad_enabled &&
        p.config.pad_width === existingConfig.pad_width &&
        p.config.prefix === existingConfig.prefix
      );
      if (matching) {
        setSelectedPreset(matching.id);
      } else {
        setSelectedPreset('custom');
      }
    } else {
      // Set default config to simple (consecutivo) for new raffles
      form.setValue('numbering_config', NUMBERING_PRESETS[0].config);
      form.setValue('ticket_number_format', 'sequential');
    }
  }, []);
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Configuración de Numeración
        </CardTitle>
        <CardDescription>
          Personaliza cómo se mostrarán los números de tus boletos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {NUMBERING_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPreset === preset.id;
            const isRecommended = recommendedPreset.id === preset.id;
            
            return (
              <Button
                key={preset.id}
                type="button"
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "h-auto py-3 px-3 flex flex-col items-start text-left gap-1 relative",
                  isSelected && "ring-2 ring-primary ring-offset-2",
                  isRecommended && !isSelected && "border-amber-500/50 bg-amber-500/5"
                )}
                onClick={() => applyPreset(preset.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium truncate">{preset.name}</span>
                  {isRecommended && (
                    <Badge 
                      variant={isSelected ? "secondary" : "outline"} 
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-5 ml-auto shrink-0",
                        !isSelected && "border-amber-500/50 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      <Sparkles className="w-3 h-3 mr-0.5" />
                      Sugerido
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  "text-xs truncate w-full",
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {preset.description}
                </span>
              </Button>
            );
          })}
        </div>
        
        {/* Recommendation Tip */}
        {selectedPreset !== recommendedPreset.id && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-amber-700 dark:text-amber-300">
              <span className="font-medium">Sugerencia:</span>{' '}
              Para {totalTickets.toLocaleString()} boletos, {recommendedPreset.reason.toLowerCase()}.
              <Button 
                variant="link" 
                size="sm" 
                type="button"
                className="text-amber-600 dark:text-amber-400 h-auto p-0 ml-1"
                onClick={() => applyPreset(recommendedPreset.id)}
              >
                Usar formato sugerido →
              </Button>
            </div>
          </div>
        )}
        
        {/* Preview Section */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Vista Previa</span>
            {currentConfig.mode === 'random_permutation' && (
              <Badge variant="secondary" className="text-xs">
                Orden aleatorio
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {previewNumbers.map((num, i) => (
              <Badge 
                key={i} 
                variant="outline" 
                className={cn(
                  "font-mono text-sm",
                  num === '...' && "bg-transparent border-dashed"
                )}
              >
                {num}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Advanced Settings Collapsible */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between" type="button">
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Configuración Avanzada
              </span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                isAdvancedOpen && "transform rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Start Number and Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Número Inicial</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={currentConfig.start_number}
                    onChange={(e) => updateConfig('start_number', parseInt(e.target.value) || 1)}
                    min={0}
                  />
                </FormControl>
                <FormDescription>Primer número del rango</FormDescription>
              </FormItem>
              
              <FormItem>
                <FormLabel>Número Final (Rango)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={currentConfig.range_end || currentConfig.start_number + totalTickets - 1}
                    onChange={(e) => updateConfig('range_end', parseInt(e.target.value) || null)}
                    min={currentConfig.start_number}
                    placeholder="Auto"
                  />
                </FormControl>
                <FormDescription>Opcional: define el último número</FormDescription>
              </FormItem>
            </div>
            
            {/* Padding Settings */}
            <div className="grid grid-cols-3 gap-4">
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 col-span-3">
                <div className="space-y-0.5">
                  <FormLabel>Usar ceros a la izquierda</FormLabel>
                  <FormDescription>001 en lugar de 1</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={currentConfig.pad_enabled}
                    onCheckedChange={(checked) => updateConfig('pad_enabled', checked)}
                  />
                </FormControl>
              </FormItem>
              
              {currentConfig.pad_enabled && (
                <>
                  <FormItem>
                    <FormLabel>Ancho de Dígitos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={currentConfig.pad_width ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateConfig('pad_width', val ? parseInt(val) : null);
                        }}
                        min={1}
                        max={10}
                        placeholder="Auto"
                      />
                    </FormControl>
                    <FormDescription>
                      {currentConfig.pad_width 
                        ? `Fijo: ${currentConfig.pad_width} dígitos` 
                        : `Auto: ${Math.max(3, totalTickets.toString().length)} dígitos`}
                    </FormDescription>
                  </FormItem>
                  
                  <FormItem>
                    <FormLabel>Carácter de Relleno</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        value={currentConfig.pad_char}
                        onChange={(e) => updateConfig('pad_char', e.target.value.slice(0, 1) || '0')}
                        maxLength={1}
                        className="text-center font-mono"
                      />
                    </FormControl>
                    <FormDescription>Normalmente "0"</FormDescription>
                  </FormItem>
                </>
              )}
            </div>
            
            {/* Prefix/Suffix Settings */}
            <div className="grid grid-cols-3 gap-4">
              <FormItem>
                <FormLabel>Prefijo</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    value={currentConfig.prefix || ''}
                    onChange={(e) => updateConfig('prefix', e.target.value || null)}
                    placeholder="Ej: TKT"
                    className="font-mono"
                  />
                </FormControl>
              </FormItem>
              
              <FormItem>
                <FormLabel>Separador</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    value={currentConfig.separator}
                    onChange={(e) => updateConfig('separator', e.target.value)}
                    placeholder="-"
                    maxLength={3}
                    className="text-center font-mono"
                  />
                </FormControl>
              </FormItem>
              
              <FormItem>
                <FormLabel>Sufijo</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    value={currentConfig.suffix || ''}
                    onChange={(e) => updateConfig('suffix', e.target.value || null)}
                    placeholder="Ej: MX"
                    className="font-mono"
                  />
                </FormControl>
              </FormItem>
            </div>
            
            {/* Step (for advanced users) */}
            <FormItem>
              <FormLabel>Incremento (Step)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={currentConfig.step}
                  onChange={(e) => updateConfig('step', parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-24"
                />
              </FormControl>
              <FormDescription>
                Normalmente 1. Usa otro valor para saltar números (ej: step=10 genera 1, 11, 21...)
              </FormDescription>
            </FormItem>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
