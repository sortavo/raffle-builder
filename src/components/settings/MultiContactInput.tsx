import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

interface MultiContactInputProps {
  label: string;
  icon: React.ReactNode;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  helperText?: string;
  maxItems?: number;
  type?: "email" | "tel" | "text";
  required?: boolean;
}

export function MultiContactInput({
  label,
  icon,
  values,
  onChange,
  placeholder,
  helperText,
  maxItems = 5,
  type = "text",
  required = false,
}: MultiContactInputProps) {
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (values.length < maxItems) {
      onChange([...values, ""]);
    }
  };

  const handleRemove = (index: number) => {
    // Don't allow removing if it's the only one and required
    if (required && values.length <= 1) return;
    
    const newValues = values.filter((_, i) => i !== index);
    // Ensure at least one empty field if required
    if (required && newValues.length === 0) {
      onChange([""]);
    } else {
      onChange(newValues);
    }
  };

  const handleChange = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    onChange(newValues);
    
    // Basic validation
    if (type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Email inválido");
    } else {
      setError(null);
    }
  };

  // Ensure at least one input if required
  const displayValues = values.length === 0 && required ? [""] : values;

  return (
    // ✅ AJUSTADO: Spacing responsive
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between">
        {/* ✅ AJUSTADO: Label con typography responsive */}
        <Label className="flex items-center gap-1.5 text-xs sm:text-sm">
          {icon}
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          {values.filter(v => v.trim()).length}/{maxItems}
        </span>
      </div>

      {/* ✅ AJUSTADO: Gap responsive entre inputs */}
      <div className="space-y-1.5 sm:space-y-2">
        {displayValues.map((value, index) => (
          // ✅ AJUSTADO: Gap responsive en cada fila
          <div key={index} className="flex gap-1.5 sm:gap-2">
            <Input
              type={type}
              value={value}
              onChange={(e) => handleChange(index, e.target.value)}
              placeholder={placeholder}
              className="flex-1 h-9 sm:h-10 text-sm"
            />
            {/* ✅ AJUSTADO: Botón delete con h-9 w-9 */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleRemove(index)}
              disabled={required && displayValues.length <= 1}
              className="h-9 w-9 min-w-[36px] shrink-0 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {/* ✅ AJUSTADO: Botón agregar con h-9 */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAdd}
        disabled={values.length >= maxItems}
        className="w-full h-9 min-w-[44px] text-xs sm:text-sm"
      >
        <Plus className="h-4 w-4 mr-1" />
        Agregar {label.toLowerCase()}
      </Button>
    </div>
  );
}
