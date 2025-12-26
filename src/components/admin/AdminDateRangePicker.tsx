import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminDateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

const presets = [
  { label: "Últimos 7 días", value: "7d", getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Últimos 30 días", value: "30d", getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Últimos 90 días", value: "90d", getRange: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: "Este mes", value: "this-month", getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Mes pasado", value: "last-month", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Últimos 6 meses", value: "6m", getRange: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  { label: "Último año", value: "1y", getRange: () => ({ from: subMonths(new Date(), 12), to: new Date() }) },
];

export function AdminDateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: AdminDateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("30d");

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    const preset = presets.find((p) => p.value === value);
    if (preset) {
      onDateRangeChange(preset.getRange());
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setSelectedPreset("custom");
    onDateRangeChange(range);
  };

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2", className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Seleccionar período" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
          {selectedPreset === "custom" && (
            <SelectItem value="custom">Personalizado</SelectItem>
          )}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "d MMM", { locale: es })} -{" "}
                  {format(dateRange.to, "d MMM yyyy", { locale: es })}
                </>
              ) : (
                format(dateRange.from, "d MMM yyyy", { locale: es })
              )
            ) : (
              <span>Seleccionar fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            locale={es}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
