import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export const LABEL_SUGGESTIONS = [
  { value: 'popular', label: 'Popular', emoji: '🔥' },
  { value: 'recomendado', label: 'Recomendado', emoji: '⭐' },
  { value: 'mejor-valor', label: 'Mejor Valor', emoji: '💎' },
  { value: 'mas-vendido', label: 'Más Vendido', emoji: '🏆' },
  { value: 'premium', label: 'Premium', emoji: '👑' },
  { value: 'oferta', label: 'Oferta', emoji: '🎉' },
  { value: 'limitado', label: 'Limitado', emoji: '⏰' },
  { value: 'basico', label: 'Básico', emoji: '📦' },
];

interface LabelComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LabelCombobox({
  value,
  onValueChange,
  placeholder = 'Etiqueta...',
  className,
  disabled = false,
}: LabelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedSuggestion = useMemo(() => {
    return LABEL_SUGGESTIONS.find(
      (s) => s.label.toLowerCase() === value?.toLowerCase() || s.value === value?.toLowerCase()
    );
  }, [value]);

  const filteredSuggestions = useMemo(() => {
    if (!searchValue) return LABEL_SUGGESTIONS;
    return LABEL_SUGGESTIONS.filter((s) =>
      s.label.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [searchValue]);

  const handleSelect = (selectedValue: string) => {
    const suggestion = LABEL_SUGGESTIONS.find((s) => s.value === selectedValue);
    if (suggestion) {
      onValueChange(suggestion.label);
    }
    setOpen(false);
    setSearchValue('');
  };

  const handleUseCustom = () => {
    if (searchValue.trim()) {
      onValueChange(searchValue.trim());
      setOpen(false);
      setSearchValue('');
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange('');
  };

  const displayValue = useMemo(() => {
    if (!value) return null;
    if (selectedSuggestion) {
      return (
        <span className="flex items-center gap-1.5">
          <span>{selectedSuggestion.emoji}</span>
          <span>{selectedSuggestion.label}</span>
        </span>
      );
    }
    return <span>{value}</span>;
  }, [value, selectedSuggestion]);

  const showCustomOption = searchValue.trim() && 
    !LABEL_SUGGESTIONS.some(s => s.label.toLowerCase() === searchValue.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {displayValue || placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && (
              <X
                className="h-3.5 w-3.5 opacity-50 hover:opacity-100 cursor-pointer"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-popover z-50" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar etiqueta..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty className="py-2 px-3 text-sm text-center">
              {searchValue ? (
                <button
                  onClick={handleUseCustom}
                  className="text-primary hover:underline cursor-pointer"
                >
                  Usar "{searchValue}"
                </button>
              ) : (
                'No hay sugerencias'
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredSuggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.value}
                  value={suggestion.value}
                  onSelect={handleSelect}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value?.toLowerCase() === suggestion.label.toLowerCase()
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <span className="mr-2">{suggestion.emoji}</span>
                  <span>{suggestion.label}</span>
                </CommandItem>
              ))}
              {showCustomOption && (
                <CommandItem
                  value={`custom-${searchValue}`}
                  onSelect={handleUseCustom}
                  className="cursor-pointer border-t"
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <span className="text-muted-foreground">Usar:</span>
                  <span className="ml-1 font-medium">"{searchValue}"</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
