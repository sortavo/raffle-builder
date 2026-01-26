import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COUNTRY_CODES = [
  { code: "+52", country: "MX", flag: "🇲🇽", name: "México" },
  { code: "+1", country: "US", flag: "🇺🇸", name: "Estados Unidos" },
  { code: "+1", country: "CA", flag: "🇨🇦", name: "Canadá" },
  { code: "+34", country: "ES", flag: "🇪🇸", name: "España" },
  { code: "+57", country: "CO", flag: "🇨🇴", name: "Colombia" },
  { code: "+54", country: "AR", flag: "🇦🇷", name: "Argentina" },
  { code: "+56", country: "CL", flag: "🇨🇱", name: "Chile" },
  { code: "+51", country: "PE", flag: "🇵🇪", name: "Perú" },
  { code: "+593", country: "EC", flag: "🇪🇨", name: "Ecuador" },
  { code: "+58", country: "VE", flag: "🇻🇪", name: "Venezuela" },
  { code: "+55", country: "BR", flag: "🇧🇷", name: "Brasil" },
  { code: "+502", country: "GT", flag: "🇬🇹", name: "Guatemala" },
  { code: "+503", country: "SV", flag: "🇸🇻", name: "El Salvador" },
  { code: "+504", country: "HN", flag: "🇭🇳", name: "Honduras" },
  { code: "+505", country: "NI", flag: "🇳🇮", name: "Nicaragua" },
  { code: "+506", country: "CR", flag: "🇨🇷", name: "Costa Rica" },
  { code: "+507", country: "PA", flag: "🇵🇦", name: "Panamá" },
  { code: "+591", country: "BO", flag: "🇧🇴", name: "Bolivia" },
  { code: "+595", country: "PY", flag: "🇵🇾", name: "Paraguay" },
  { code: "+598", country: "UY", flag: "🇺🇾", name: "Uruguay" },
  { code: "+53", country: "CU", flag: "🇨🇺", name: "Cuba" },
  { code: "+1809", country: "DO", flag: "🇩🇴", name: "República Dominicana" },
  { code: "+1787", country: "PR", flag: "🇵🇷", name: "Puerto Rico" },
];

interface SinglePhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  defaultCountryCode?: string;
  className?: string;
  placeholder?: string;
}

export function SinglePhoneInput({
  value,
  onChange,
  error,
  defaultCountryCode = "+52",
  className,
  placeholder = "55 1234 5678",
}: SinglePhoneInputProps) {
  const [open, setOpen] = React.useState(false);

  // Parse the current value to extract country code and number
  const parseValue = React.useCallback((fullNumber: string) => {
    if (!fullNumber) {
      return { countryCode: defaultCountryCode, number: "" };
    }

    // Try to match a country code from the list
    for (const country of COUNTRY_CODES) {
      if (fullNumber.startsWith(country.code)) {
        return {
          countryCode: country.code,
          number: fullNumber.slice(country.code.length),
        };
      }
    }

    // If no match, check if it starts with +
    if (fullNumber.startsWith("+")) {
      // Try to extract the country code (up to 4 digits after +)
      const match = fullNumber.match(/^(\+\d{1,4})/);
      if (match) {
        return {
          countryCode: match[1],
          number: fullNumber.slice(match[1].length),
        };
      }
    }

    return { countryCode: defaultCountryCode, number: fullNumber };
  }, [defaultCountryCode]);

  const { countryCode, number } = parseValue(value);

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || 
    COUNTRY_CODES.find((c) => c.code === defaultCountryCode) ||
    COUNTRY_CODES[0];

  const handleCountryChange = (code: string) => {
    onChange(code + number);
    setOpen(false);
  };

  const handleNumberChange = (newNumber: string) => {
    // Only allow digits
    const digits = newNumber.replace(/\D/g, "");
    onChange(countryCode + digits);
  };

  const formatDisplayNumber = (num: string) => {
    const digits = num.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
  };

  const digitCount = number.replace(/\D/g, "").length;
  const isValid = digitCount >= 10;
  const isIncomplete = digitCount > 0 && digitCount < 10;

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className={cn(
          "flex rounded-md border bg-background",
          error ? "border-destructive" : "border-input",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        )}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              className="h-10 shrink-0 rounded-r-none border-r px-3 hover:bg-muted"
              type="button"
            >
              <span className="text-lg mr-1">{selectedCountry.flag}</span>
              <span className="text-sm font-medium">{selectedCountry.code}</span>
              <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[220px] p-0 z-50 bg-popover" 
            align="start"
            sideOffset={4}
          >
            <div className="max-h-[300px] overflow-auto">
              {COUNTRY_CODES.map((country) => (
                <button
                  key={`${country.code}-${country.country}`}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent",
                    countryCode === country.code && "bg-accent"
                  )}
                  onClick={() => handleCountryChange(country.code)}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="flex-1 text-left">{country.name}</span>
                  <span className="text-muted-foreground">{country.code}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Input
          type="tel"
          inputMode="numeric"
          value={formatDisplayNumber(number)}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={placeholder}
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {/* Validation indicator */}
      {(isIncomplete || error) && (
        <p className="text-sm text-destructive">
          {error || `Faltan ${10 - digitCount} dígitos`}
        </p>
      )}
      {isValid && !error && (
        <p className="text-sm text-success">Número válido</p>
      )}
    </div>
  );
}
