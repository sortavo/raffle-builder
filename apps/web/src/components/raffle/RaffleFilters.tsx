import { useState, useEffect } from 'react';
import {
  FileText,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Save,
  FolderOpen,
  Trash2,
  SlidersHorizontal,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

export interface FilterState {
  status: string[];
  dateRange: [Date | null, Date | null];
  sortBy: 'created_at' | 'title' | 'draw_date' | 'total_tickets';
  sortOrder: 'asc' | 'desc';
}

interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
}

interface RaffleFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const statusOptions = [
  { value: 'draft', label: 'Borrador', icon: FileText },
  { value: 'active', label: 'Activo', icon: Play },
  { value: 'paused', label: 'Pausado', icon: Pause },
  { value: 'completed', label: 'Completado', icon: CheckCircle2 },
  { value: 'canceled', label: 'Cancelado', icon: XCircle },
];

export function RaffleFilters({ filters, onFiltersChange }: RaffleFiltersProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [advancedDialogOpen, setAdvancedDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    const saved = localStorage.getItem('raffle-filter-presets');
    return saved ? JSON.parse(saved) : [];
  });

  const hasActiveFilters = filters.status.length > 0 || filters.dateRange[0] !== null;

  const handleStatusToggle = (values: string[]) => {
    onFiltersChange({ ...filters, status: values });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: [range?.from || null, range?.to || null],
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      status: [],
      dateRange: [null, null],
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
    setAdvancedDialogOpen(false);
  };

  const savePreset = () => {
    if (!presetName.trim()) return;

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('raffle-filter-presets', JSON.stringify(updated));

    setPresetName('');
    setSaveDialogOpen(false);
    toast.success('Filtro guardado');
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    localStorage.setItem('raffle-filter-presets', JSON.stringify(updated));
    toast.success('Filtro eliminado');
  };

  const applyPreset = (preset: FilterPreset) => {
    onFiltersChange({
      ...preset.filters,
      dateRange: [
        preset.filters.dateRange[0] ? new Date(preset.filters.dateRange[0]) : null,
        preset.filters.dateRange[1] ? new Date(preset.filters.dateRange[1]) : null,
      ],
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status Toggle Group */}
      <TooltipProvider delayDuration={300}>
        <ToggleGroup
          type="multiple"
          value={filters.status}
          onValueChange={handleStatusToggle}
          className="flex flex-wrap gap-0.5 bg-muted/60 p-1 rounded-lg"
        >
          {statusOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Tooltip key={option.value}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={option.value}
                    aria-label={option.label}
                    className="h-8 px-2 sm:px-3 gap-1.5 rounded-md text-xs sm:text-sm data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">{option.label}</span>
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden">
                  {option.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>
      </TooltipProvider>

      {/* More Options Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 gap-1.5 text-xs sm:text-sm',
              hasActiveFilters && 'border-primary/50 bg-primary/5'
            )}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Más</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {/* Saved Presets */}
          {presets.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Filtros guardados
              </DropdownMenuLabel>
              {presets.map((preset) => (
                <DropdownMenuItem key={preset.id} className="justify-between group">
                  <button
                    onClick={() => applyPreset(preset)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    {preset.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePreset(preset.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Save Current Filters */}
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
            <Save className="h-4 w-4 mr-2" />
            Guardar filtros actuales
          </DropdownMenuItem>

          {/* Advanced Filters */}
          <DropdownMenuItem onClick={() => setAdvancedDialogOpen(true)}>
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtros avanzados
          </DropdownMenuItem>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClearFilters} className="text-destructive">
                <XCircle className="h-4 w-4 mr-2" />
                Limpiar filtros
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {filters.status.length > 0 &&
            `${filters.status.length} estado${filters.status.length > 1 ? 's' : ''}`}
          {filters.status.length > 0 && filters.dateRange[0] && ' · '}
          {filters.dateRange[0] && 'Fechas'}
        </span>
      )}

      {/* Save Preset Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar filtros</DialogTitle>
            <DialogDescription>
              Dale un nombre a esta configuración para usarla después
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Nombre del preset</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Ej: Sorteos activos este mes"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={savePreset} disabled={!presetName.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Filters Dialog */}
      <Dialog open={advancedDialogOpen} onOpenChange={setAdvancedDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Filtros avanzados</DialogTitle>
            <DialogDescription>Refina tu búsqueda de sorteos</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Rango de fechas de creación</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal text-sm',
                      !filters.dateRange[0] && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {filters.dateRange[0] ? (
                        filters.dateRange[1] ? (
                          <>
                            {format(filters.dateRange[0], 'dd/MM/yy', { locale: es })} -{' '}
                            {format(filters.dateRange[1], 'dd/MM/yy', { locale: es })}
                          </>
                        ) : (
                          format(filters.dateRange[0], 'dd/MM/yyyy', { locale: es })
                        )
                      ) : (
                        'Seleccionar fechas'
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center" side="bottom">
                  <CalendarComponent
                    mode="range"
                    selected={{
                      from: filters.dateRange[0] || undefined,
                      to: filters.dateRange[1] || undefined,
                    }}
                    onSelect={handleDateRangeChange}
                    numberOfMonths={1}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClearFilters}>
              Limpiar todo
            </Button>
            <Button onClick={() => setAdvancedDialogOpen(false)}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
