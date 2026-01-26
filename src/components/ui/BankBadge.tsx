import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBankConfig, getDefaultBankConfig } from "@/lib/bank-config";

interface BankBadgeProps {
  bankName: string | null | undefined;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function BankBadge({ bankName, size = "md", showIcon = true, className }: BankBadgeProps) {
  if (!bankName) return null;

  const config = getBankConfig(bankName) || getDefaultBankConfig(bankName);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-2.5 py-1 gap-1.5",
    lg: "text-base px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border transition-colors",
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Landmark className={iconSizes[size]} />}
      <span>{config.shortName}</span>
    </span>
  );
}

// Variant for select items with bank colors
interface BankSelectItemProps {
  bankName: string;
  isSelected?: boolean;
}

export function BankSelectItem({ bankName, isSelected }: BankSelectItemProps) {
  const config = getBankConfig(bankName);
  
  if (!config) {
    return (
      <div className="flex items-center gap-2">
        <Landmark className="h-4 w-4 text-muted-foreground" />
        <span>{bankName}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "h-4 w-4 rounded-full flex items-center justify-center",
          config.bgColor
        )}
      >
        <Landmark className={cn("h-2.5 w-2.5", config.textColor)} />
      </span>
      <span>{config.name}</span>
    </div>
  );
}
