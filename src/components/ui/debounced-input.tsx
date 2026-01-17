import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebouncedInputProps {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
  className?: string;
  showSearchIcon?: boolean;
  showClearButton?: boolean;
  disabled?: boolean;
}

/**
 * An input component with built-in debouncing for search and filter use cases.
 * Includes optional search icon and clear button.
 */
export function DebouncedInput({
  value: externalValue,
  onChange,
  debounceMs = 300,
  placeholder = 'Buscar...',
  className,
  showSearchIcon = true,
  showClearButton = true,
  disabled = false,
}: DebouncedInputProps) {
  const [internalValue, setInternalValue] = useState(externalValue);

  // Sync external value changes (e.g., when parent resets the value)
  useEffect(() => {
    setInternalValue(externalValue);
  }, [externalValue]);

  // Debounced callback to parent
  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== externalValue) {
        onChange(internalValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, debounceMs, onChange, externalValue]);

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      {showSearchIcon && (
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      )}
      <Input
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          showSearchIcon && 'pl-10',
          showClearButton && internalValue && 'pr-10'
        )}
      />
      {showClearButton && internalValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Limpiar búsqueda"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
