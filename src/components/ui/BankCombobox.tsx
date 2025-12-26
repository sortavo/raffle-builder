import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Landmark, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { COUNTRY_CONFIGS, getBankConfig, getDefaultBankConfig, type BankConfig } from "@/lib/bank-config";

interface BankComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  countryCode?: string; // Optional: filter by country
}

export function BankCombobox({
  value,
  onValueChange,
  placeholder = "Busca o escribe el nombre de tu banco...",
  className,
  disabled,
  countryCode,
}: BankComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Get banks filtered by country or all
  const banksByCountry = useMemo(() => {
    if (countryCode) {
      const country = COUNTRY_CONFIGS.find(c => c.code === countryCode);
      if (country) {
        return [{ ...country }];
      }
    }
    return COUNTRY_CONFIGS;
  }, [countryCode]);

  // Filter banks based on search input
  const filteredCountries = useMemo(() => {
    if (!inputValue.trim()) return banksByCountry;
    
    const searchLower = inputValue.toLowerCase();
    return banksByCountry
      .map(country => ({
        ...country,
        banks: country.banks.filter(bank => 
          bank.name.toLowerCase().includes(searchLower) ||
          bank.shortName.toLowerCase().includes(searchLower)
        ),
      }))
      .filter(country => country.banks.length > 0);
  }, [banksByCountry, inputValue]);

  // Check if current value matches any bank
  const selectedBank = useMemo(() => {
    if (!value) return null;
    return getBankConfig(value);
  }, [value]);

  // Handle selecting a bank
  const handleSelect = (bankName: string) => {
    onValueChange(bankName);
    setOpen(false);
    setInputValue("");
  };

  // Handle using custom value (free text)
  const handleUseCustom = () => {
    if (inputValue.trim()) {
      onValueChange(inputValue.trim());
      setOpen(false);
      setInputValue("");
    }
  };

  // Display value
  const displayValue = useMemo(() => {
    if (!value) return null;
    if (selectedBank) {
      return (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-4 w-4 rounded-full flex items-center justify-center shrink-0",
              selectedBank.bgColor
            )}
          >
            <Landmark className={cn("h-2.5 w-2.5", selectedBank.textColor)} />
          </span>
          <span className="truncate">{selectedBank.name}</span>
        </div>
      );
    }
    // Custom bank name
    return (
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 bg-muted">
          <Landmark className="h-2.5 w-2.5 text-muted-foreground" />
        </span>
        <span className="truncate">{value}</span>
      </div>
    );
  }, [value, selectedBank]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          {value ? displayValue : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar banco..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-4 px-3 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                No se encontró ningún banco
              </p>
              {inputValue.trim() && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleUseCustom}
                  className="w-full"
                >
                  <Landmark className="h-4 w-4 mr-2" />
                  Usar "{inputValue.trim()}"
                </Button>
              )}
            </CommandEmpty>

            {filteredCountries.map((country, index) => (
              <div key={country.code}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup 
                  heading={
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span>{country.flag}</span>
                      <span>{country.name}</span>
                    </div>
                  }
                >
                  {country.banks.slice(0, 10).map((bank) => (
                    <CommandItem
                      key={bank.name}
                      value={bank.name}
                      onSelect={() => handleSelect(bank.name)}
                      className="flex items-center gap-2"
                    >
                      <span
                        className={cn(
                          "h-4 w-4 rounded-full flex items-center justify-center shrink-0",
                          bank.bgColor
                        )}
                      >
                        <Landmark className={cn("h-2.5 w-2.5", bank.textColor)} />
                      </span>
                      <span className="flex-1 truncate">{bank.name}</span>
                      {value === bank.name && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                  {country.banks.length > 10 && !inputValue && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Escribe para ver más bancos...
                    </div>
                  )}
                </CommandGroup>
              </div>
            ))}

            {/* Option to use custom value */}
            {inputValue.trim() && !filteredCountries.some(c => 
              c.banks.some(b => b.name.toLowerCase() === inputValue.toLowerCase())
            ) && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Otro banco">
                  <CommandItem
                    onSelect={handleUseCustom}
                    className="flex items-center gap-2"
                  >
                    <span className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 bg-muted">
                      <Landmark className="h-2.5 w-2.5 text-muted-foreground" />
                    </span>
                    <span className="flex-1">Usar "{inputValue.trim()}"</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Small inline badge to show selected bank
interface BankBadgeInlineProps {
  bankName: string | null | undefined;
  className?: string;
}

export function BankBadgeInline({ bankName, className }: BankBadgeInlineProps) {
  if (!bankName) return null;

  const config = getBankConfig(bankName) || getDefaultBankConfig(bankName);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
        config.bgColor,
        config.textColor,
        config.borderColor,
        "border",
        className
      )}
    >
      <Landmark className="h-3 w-3" />
      <span>{config.shortName}</span>
    </span>
  );
}
