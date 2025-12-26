import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+52", country: "MX", flag: "🇲🇽", name: "México" },
  { code: "+1", country: "US", flag: "🇺🇸", name: "EE.UU." },
  { code: "+1", country: "CA", flag: "🇨🇦", name: "Canadá" },
  { code: "+34", country: "ES", flag: "🇪🇸", name: "España" },
  { code: "+57", country: "CO", flag: "🇨🇴", name: "Colombia" },
  { code: "+54", country: "AR", flag: "🇦🇷", name: "Argentina" },
  { code: "+56", country: "CL", flag: "🇨🇱", name: "Chile" },
  { code: "+51", country: "PE", flag: "🇵🇪", name: "Perú" },
  { code: "+58", country: "VE", flag: "🇻🇪", name: "Venezuela" },
  { code: "+593", country: "EC", flag: "🇪🇨", name: "Ecuador" },
  { code: "+502", country: "GT", flag: "🇬🇹", name: "Guatemala" },
  { code: "+503", country: "SV", flag: "🇸🇻", name: "El Salvador" },
  { code: "+504", country: "HN", flag: "🇭🇳", name: "Honduras" },
  { code: "+505", country: "NI", flag: "🇳🇮", name: "Nicaragua" },
  { code: "+506", country: "CR", flag: "🇨🇷", name: "Costa Rica" },
  { code: "+507", country: "PA", flag: "🇵🇦", name: "Panamá" },
  { code: "+591", country: "BO", flag: "🇧🇴", name: "Bolivia" },
  { code: "+595", country: "PY", flag: "🇵🇾", name: "Paraguay" },
  { code: "+598", country: "UY", flag: "🇺🇾", name: "Uruguay" },
];

interface PhoneEntry {
  countryCode: string;
  number: string;
}

interface PhoneInputWithCountryProps {
  label: string;
  icon: React.ReactNode;
  values: string[];
  onChange: (values: string[]) => void;
  helperText?: string;
  maxItems?: number;
}

// Parse a full phone number into country code and number
function parsePhoneNumber(fullNumber: string): PhoneEntry {
  if (!fullNumber) return { countryCode: "+52", number: "" };
  
  // Try to match known country codes
  for (const country of COUNTRY_CODES) {
    if (fullNumber.startsWith(country.code)) {
      return {
        countryCode: country.code,
        number: fullNumber.slice(country.code.length).replace(/\D/g, ''),
      };
    }
  }
  
  // Default: assume it's just a number without code
  return { countryCode: "+52", number: fullNumber.replace(/\D/g, '') };
}

// Combine country code and number into full phone
function combinePhoneNumber(entry: PhoneEntry): string {
  if (!entry.number) return "";
  return `${entry.countryCode}${entry.number}`;
}

export function PhoneInputWithCountry({
  label,
  icon,
  values,
  onChange,
  helperText,
  maxItems = 5,
}: PhoneInputWithCountryProps) {
  // Parse existing values into structured format
  const entries: PhoneEntry[] = values.length > 0 
    ? values.map(parsePhoneNumber)
    : [];

  const handleAdd = () => {
    if (values.length < maxItems) {
      onChange([...values, ""]);
    }
  };

  const handleRemove = (index: number) => {
    const newValues = values.filter((_, i) => i !== index);
    onChange(newValues);
  };

  const handleCountryChange = (index: number, countryCode: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], countryCode };
    onChange(newEntries.map(combinePhoneNumber));
  };

  const handleNumberChange = (index: number, number: string) => {
    // Only allow digits, max 10 characters
    const cleaned = number.replace(/\D/g, '').slice(0, 10);
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], number: cleaned };
    onChange(newEntries.map(combinePhoneNumber));
  };

  // Format number for display: XX XXXX XXXX
  const formatDisplayNumber = (number: string): string => {
    if (!number) return "";
    const digits = number.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
  };

  const displayEntries = entries.length === 0 ? [] : entries;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          {icon}
          {label}
        </Label>
        <span className="text-xs text-muted-foreground">
          {values.filter(v => v.trim()).length}/{maxItems}
        </span>
      </div>

      <div className="space-y-2">
        {displayEntries.map((entry, index) => (
          <div key={index} className="flex gap-2">
            <Select
              value={entry.countryCode}
              onValueChange={(value) => handleCountryChange(index, value)}
            >
              <SelectTrigger className="w-[100px] shrink-0">
                <SelectValue>
                  {COUNTRY_CODES.find(c => c.code === entry.countryCode)?.flag || "🌍"} {entry.countryCode}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px] bg-background z-50">
                {COUNTRY_CODES.map((country, idx) => (
                  <SelectItem 
                    key={`${country.country}-${idx}`} 
                    value={country.code}
                    className="cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{country.code}</span>
                      <span className="text-muted-foreground text-xs">{country.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="tel"
              value={formatDisplayNumber(entry.number)}
              onChange={(e) => handleNumberChange(index, e.target.value)}
              placeholder="55 1234 5678"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(index)}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        disabled={values.length >= maxItems}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-1" />
        Agregar {label.toLowerCase()}
      </Button>
    </div>
  );
}
