import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FileEdit,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Calendar,
  Check,
  Bookmark,
  Trash2,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
  { value: 'draft', label: 'Borrador', icon: FileEdit },
  { value: 'active', label: 'Activo', icon: Play },
  { value: 'paused', label: 'Pausado', icon: Pause },
  { value: 'completed', label: 'Completado', icon: CheckCircle2 },
  { value: 'canceled', label: 'Cancelado', icon: XCircle },
];

const sortOptions = [
  { value: 'created_at', label: 'Fecha de creación' },
  { value: 'title', label: 'Nombre' },
  { value: 'draw_date', label: 'Fecha de sorteo' },
  { value: 'total_tickets', label: 'Total de boletos' },
];

export function RaffleFilters({ filters, onFiltersChange }: RaffleFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    const saved = localStorage.getItem('raffle-filter-presets');
    return saved ? JSON.parse(saved) : [];
  });

  const activeFiltersCount = [
    filters.status.length > 0,
    filters.dateRange[0] !== null,
  ].filter(Boolean).length;

  const handleStatusToggle = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: [range?.from || null, range?.to || null]
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      status: [],
      dateRange: [null, null],
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
    setIsAdvancedOpen(false);
  };

  const savePreset = () => {
    if (!presetName.trim()) return;

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString()
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('raffle-filter-presets', JSON.stringify(updated));
    
    setPresetName('');
    setShowSaveDialog(false);
    toast.success('Filtro guardado');
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('raffle-filter-presets', JSON.stringify(updated));
    toast.success('Filtro eliminado');
  };

  const applyPreset = (preset: FilterPreset) => {
    onFiltersChange({
      ...preset.filters,
      // Convert date strings back to Date objects
      dateRange: [
        preset.filters.dateRange[0] ? new Date(preset.filters.dateRange[0]) : null,
        preset.filters.dateRange[1] ? new Date(preset.filters.dateRange[1]) : null,
      ]
    });
  };

  return (
    <div className="space-y-3">
      {/* Quick status filters - scrollable on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap scrollbar-hide">
        {statusOptions.map((option) => {
          const Icon = option.icon;
          const isActive = filters.status.includes(option.value);
          
          return (
            <Button
              key={option.value}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusToggle(option.value)}
              className="h-8 flex-shrink-0 text-xs sm:text-sm"
            >
              <Icon className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{option.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Action buttons - scrollable on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide">
        {/* Saved presets dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 flex-shrink-0">
              <Bookmark className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Filtros guardados</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {presets.length === 0 ? (
              <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                No hay filtros guardados
              </div>
            ) : (
              presets.map(preset => (
                <div key={preset.id} className="flex items-center justify-between px-2 py-1.5">
                  <DropdownMenuItem 
                    className="flex-1 cursor-pointer"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.name}
                  </DropdownMenuItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePreset(preset.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Save current filters */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 flex-shrink-0">
              <Save className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Guardar</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Guardar filtros actuales</DialogTitle>
              <DialogDescription>
                Dale un nombre a esta configuración de filtros para usarla después
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Nombre del filtro..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={savePreset} disabled={!presetName.trim()}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Advanced filters dialog */}
        <Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 flex-shrink-0">
              <SlidersHorizontal className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Filtros avanzados</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Filtros avanzados</DialogTitle>
              <DialogDescription>
                Refina tu búsqueda de sorteos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Date range */}
              <div className="space-y-2">
                <Label>Rango de fechas de creación</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateRange[0] && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.dateRange[0] ? (
                        filters.dateRange[1] ? (
                          <>
                            {format(filters.dateRange[0], 'dd/MM/yyyy', { locale: es })} -{' '}
                            {format(filters.dateRange[1], 'dd/MM/yyyy', { locale: es })}
                          </>
                        ) : (
                          format(filters.dateRange[0], 'dd/MM/yyyy', { locale: es })
                        )
                      ) : (
                        'Seleccionar fechas'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={{
                        from: filters.dateRange[0] || undefined,
                        to: filters.dateRange[1] || undefined
                      }}
                      onSelect={handleDateRangeChange}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Sort by */}
              <div className="space-y-2">
                <Label>Ordenar por</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => onFiltersChange({
                    ...filters,
                    sortBy: value as FilterState['sortBy']
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort order */}
              <div className="space-y-2">
                <Label>Orden</Label>
                <div className="flex gap-2">
                  <Button
                    variant={filters.sortOrder === 'asc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onFiltersChange({ ...filters, sortOrder: 'asc' })}
                    className="flex-1"
                  >
                    <ArrowUp className="h-4 w-4 mr-1.5" />
                    Ascendente
                  </Button>
                  <Button
                    variant={filters.sortOrder === 'desc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onFiltersChange({ ...filters, sortOrder: 'desc' })}
                    className="flex-1"
                  >
                    <ArrowDown className="h-4 w-4 mr-1.5" />
                    Descendente
                  </Button>
                </div>
              </div>

              {/* Clear filters */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleClearFilters}
              >
                <X className="h-4 w-4 mr-1.5" />
                Limpiar filtros
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 flex-shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Ordenar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {sortOptions.map(option => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onFiltersChange({
                  ...filters,
                  sortBy: option.value as FilterState['sortBy']
                })}
              >
                {filters.sortBy === option.value && (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
