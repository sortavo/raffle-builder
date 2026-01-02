import { useState, useEffect, useMemo, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Hash, 
  Settings2, 
  Eye, 
  ChevronDown, 
  ListOrdered, 
  Sparkles, 
  Ticket,
  Binary,
  Tag,
  Dice5,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

interface PresetConfig {
  id: string;
  name: string;
  getDescription: (total: number) => string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  minTickets?: number;
  maxTickets?: number;
  isPrimary: boolean;
  config: NumberingConfig;
}

// Presets de numeración organizados por caso de uso
const NUMBERING_PRESETS: PresetConfig[] = [
  {
    id: 'simple',
    name: 'Números Simples',
    getDescription: (total) => `1, 2, 3... hasta ${total}`,
    icon: ListOrdered,
    iconColor: 'text-blue-500',
    minTickets: 1,
    maxTickets: 999,
    isPrimary: true,
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
      custom_numbers: null,
    }
  },
  {
    id: 'zeros_auto',
    name: 'Con Ceros',
    getDescription: (total) => {
      const digits = Math.max(3, total.toString().length);
      const first = '1'.padStart(digits, '0');
      const last = total.toString().padStart(digits, '0');
      return `${first}, ${first.slice(0, -1)}2... hasta ${last}`;
    },
    icon: Binary,
    iconColor: 'text-emerald-500',
    minTickets: 1,
    maxTickets: 99999,
    isPrimary: true,
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
      custom_numbers: null,
    }
  },
  {
    id: 'lottery_7',
    name: 'Tipo Lotería',
    getDescription: (total) => `0000001... hasta ${total.toString().padStart(7, '0')}`,
    icon: Ticket,
    iconColor: 'text-amber-500',
    minTickets: 1000,
    maxTickets: Infinity,
    isPrimary: true,
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
      custom_numbers: null,
    }
  },
  {
    id: 'prefixed',
    name: 'Con Prefijo',
    getDescription: () => 'TKT-000001, TKT-000002...',
    icon: Tag,
    iconColor: 'text-pink-500',
    isPrimary: false,
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
      custom_numbers: null,
    }
  },
  {
    id: 'random',
    name: 'Aleatorio',
    getDescription: () => 'Orden aleatorio (más emoción)',
    icon: Dice5,
    iconColor: 'text-rose-500',
    maxTickets: 10000,
    isPrimary: false,
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
      custom_numbers: null,
    }
  },
  {
    id: 'zeros_custom',
    name: 'Personalizado',
    getDescription: () => 'Configura ancho y prefijo',
    icon: Settings2,
    iconColor: 'text-violet-500',
    isPrimary: false,
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
      custom_numbers: null,
    }
  },
];

// Función para obtener los presets aplicables según la cantidad de boletos
function getApplicablePresets(totalTickets: number): { primary: string[]; secondary: string[] } {
  // Rifas pequeñas: ≤99 boletos
  if (totalTickets <= 99) {
    return { 
      primary: ['simple', 'zeros_auto'], 
      secondary: ['prefixed', 'random'] 
    };
  }
  
  // Rifas medianas: 100-999 boletos
  if (totalTickets <= 999) {
    return { 
      primary: ['zeros_auto', 'simple'], 
      secondary: ['prefixed', 'random'] 
    };
  }
  
  // Rifas grandes: 1,000-9,999 boletos
  if (totalTickets <= 9999) {
    return { 
      primary: ['zeros_auto', 'lottery_7'], 
      secondary: ['prefixed', 'random'] 
    };
  }
  
  // Rifas muy grandes: ≥10,000 boletos (random no disponible)
  return { 
    primary: ['lottery_7', 'zeros_auto'], 
    secondary: ['prefixed', 'zeros_custom'] 
  };
}

// Función para obtener la recomendación basada en cantidad de boletos
function getRecommendedPreset(totalTickets: number): string {
  if (totalTickets <= 99) return 'simple';
  if (totalTickets <= 9999) return 'zeros_auto';
  return 'lottery_7';
}

// Función para obtener texto contextual según cantidad
function getContextText(totalTickets: number): string {
  if (totalTickets <= 99) {
    return 'Para rifas pequeñas, los números simples son más fáciles de comunicar';
  }
  if (totalTickets <= 999) {
    return 'Los ceros dan uniformidad visual en boletos impresos';
  }
  if (totalTickets <= 9999) {
    return 'El formato con ceros se ajusta automáticamente a 4 dígitos';
  }
  return 'El formato tipo lotería es el estándar para rifas grandes';
}

// Función para generar preview de números
function generatePreviewNumbers(config: NumberingConfig, totalTickets: number, count: number = 5): string[] {
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
  
  // Add last number indicator
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
  const prevTotalTicketsRef = useRef<number>(totalTickets);
  const hasInitializedRef = useRef<boolean>(false);
  
  // Get current config from form
  const currentConfig: NumberingConfig = form.watch('numbering_config') || NUMBERING_PRESETS[0].config;
  
  // Get applicable presets based on total tickets
  const applicablePresets = useMemo(() => getApplicablePresets(totalTickets), [totalTickets]);
  const recommendedPresetId = useMemo(() => getRecommendedPreset(totalTickets), [totalTickets]);
  const contextText = useMemo(() => getContextText(totalTickets), [totalTickets]);
  
  // Get preset objects
  const primaryPresets = useMemo(() => 
    applicablePresets.primary
      .map(id => NUMBERING_PRESETS.find(p => p.id === id))
      .filter(Boolean) as PresetConfig[],
    [applicablePresets.primary]
  );
  
  const secondaryPresets = useMemo(() => 
    applicablePresets.secondary
      .map(id => NUMBERING_PRESETS.find(p => p.id === id))
      .filter(Boolean) as PresetConfig[],
    [applicablePresets.secondary]
  );
  
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
    setSelectedPreset('custom');
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
      // Set default config based on ticket count
      const recommendedId = getRecommendedPreset(totalTickets);
      const recommendedPreset = NUMBERING_PRESETS.find(p => p.id === recommendedId);
      if (recommendedPreset) {
        form.setValue('numbering_config', recommendedPreset.config);
        form.setValue('ticket_number_format', 'sequential');
        setSelectedPreset(recommendedId);
      }
    }
    hasInitializedRef.current = true;
  }, []);


  // Render a preset button
  const renderPresetButton = (preset: PresetConfig, isRecommended: boolean) => {
    const Icon = preset.icon;
    const isSelected = selectedPreset === preset.id;
    
    return (
      <motion.div
        key={preset.id}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          type="button"
          variant={isSelected ? "default" : "outline"}
          className={cn(
            "h-auto w-full py-3 px-4 flex items-center text-left gap-3 relative transition-all",
            isSelected && "ring-2 ring-primary ring-offset-2",
            isRecommended && !isSelected && "border-emerald-500/50 bg-emerald-500/5"
          )}
          onClick={() => applyPreset(preset.id)}
        >
          {/* Selection indicator */}
          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute top-2 right-2"
              >
                <div className="w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Icon */}
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            isSelected ? "bg-primary-foreground/20" : "bg-muted"
          )}>
            <Icon className={cn(
              "w-5 h-5",
              isSelected ? "text-primary-foreground" : preset.iconColor
            )} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{preset.name}</span>
              {isRecommended && !isSelected && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 h-5 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                >
                  <Sparkles className="w-3 h-3 mr-0.5" />
                  Sugerido
                </Badge>
              )}
            </div>
            <span className={cn(
              "text-xs block mt-0.5",
              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {preset.getDescription(totalTickets)}
            </span>
          </div>
        </Button>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Hash className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Formato de Numeración</span>
      </div>
      
      {/* Context hint */}
      <p className="text-xs text-muted-foreground -mt-2">
        {contextText}
      </p>
      
      {/* Primary Presets - 2 column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {primaryPresets.map((preset) => 
          renderPresetButton(preset, preset.id === recommendedPresetId)
        )}
      </div>
      
      {/* Preview Section - Compact */}
      <div className="p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium">Vista previa</span>
          {currentConfig.mode === 'random_permutation' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
              Aleatorio
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {previewNumbers.map((num, i) => (
            <span 
              key={i} 
              className={cn(
                "px-2 py-1 rounded text-xs font-mono",
                num === '...' 
                  ? "text-muted-foreground" 
                  : "bg-background border"
              )}
            >
              {num}
            </span>
          ))}
        </div>
      </div>
      
      {/* Advanced Options Collapsible */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-between text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Más opciones
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              isAdvancedOpen && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 pt-3">
          {/* Secondary Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {secondaryPresets.map((preset) => 
              renderPresetButton(preset, false)
            )}
          </div>
          
          {/* Custom Configuration */}
          {(selectedPreset === 'zeros_custom' || selectedPreset === 'prefixed' || selectedPreset === 'custom') && (
            <div className="space-y-4 p-4 rounded-lg border border-dashed bg-muted/30">
              <div className="grid grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel className="text-xs">Ancho de números</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={currentConfig.pad_width || Math.max(3, totalTickets.toString().length)}
                      onChange={(e) => updateConfig('pad_width', parseInt(e.target.value) || 3)}
                      className="h-9"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Dígitos mínimos (ej: 5 = 00001)
                  </FormDescription>
                </FormItem>
                
                <FormItem>
                  <FormLabel className="text-xs">Prefijo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="TKT"
                      value={currentConfig.prefix || ''}
                      onChange={(e) => updateConfig('prefix', e.target.value || null)}
                      className="h-9"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Texto antes del número
                  </FormDescription>
                </FormItem>
              </div>
              
              {currentConfig.prefix && (
                <FormItem>
                  <FormLabel className="text-xs">Separador</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="-"
                      value={currentConfig.separator || ''}
                      onChange={(e) => updateConfig('separator', e.target.value)}
                      className="h-9 w-20"
                      maxLength={3}
                    />
                  </FormControl>
                </FormItem>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
