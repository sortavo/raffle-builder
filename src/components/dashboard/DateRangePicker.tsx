import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const presets = [
  {
    label: "Últimos 7 días",
    getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }),
  },
  {
    label: "Últimos 30 días",
    getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }),
  },
  {
    label: "Últimos 90 días",
    getValue: () => ({ from: subDays(new Date(), 90), to: new Date() }),
  },
  {
    label: "Este mes",
    getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }),
  },
  {
    label: "Mes pasado",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    },
  },
];

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({
    from: dateRange.from,
    to: dateRange.to,
  });

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue();
    onDateRangeChange(range);
    setTempRange(range);
    setIsOpen(false);
  };

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return;
    setTempRange(range);
    
    if (range.from && range.to) {
      onDateRangeChange({ from: range.from, to: range.to });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal bg-white border-gray-200 hover:bg-gray-50",
            "h-10 px-4 gap-2"
          )}
        >
          <CalendarIcon className="h-4 w-4 text-gray-500" />
          <span className="text-gray-700">
            {format(dateRange.from, "dd MMM", { locale: es })} - {format(dateRange.to, "dd MMM, yyyy", { locale: es })}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Presets */}
          <div className="border-r border-gray-100 p-3 space-y-1">
            <p className="text-xs font-medium text-gray-500 px-2 mb-2">Acceso rápido</p>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal hover:bg-violet-50 hover:text-violet-700"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          
          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={tempRange as { from: Date; to: Date } | undefined}
              onSelect={handleSelect}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
              className="pointer-events-auto"
              locale={es}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}