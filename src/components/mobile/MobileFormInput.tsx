import { forwardRef, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileFormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

export const MobileFormInput = forwardRef<HTMLInputElement, MobileFormInputProps>(
  ({ label, icon, error, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full h-14 px-4 rounded-xl border-2 border-border bg-background text-foreground text-base",
              "focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20",
              "transition-all duration-200",
              "touch-manipulation",
              icon && "pl-12",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

MobileFormInput.displayName = "MobileFormInput";

interface MobileFormButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
}

export function MobileFormButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  variant = "primary",
  className,
}: MobileFormButtonProps) {
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-lg",
    secondary: "bg-muted text-foreground hover:bg-muted/80",
    outline: "bg-background border-2 border-border text-foreground hover:border-violet-600 hover:text-violet-600",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "w-full h-14 rounded-xl font-semibold text-base",
        "transition-all duration-200",
        "active:scale-[0.98] touch-manipulation",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Cargando...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

interface StickyFooterProps {
  children: ReactNode;
  className?: string;
}

export function StickyFooter({ children, className }: StickyFooterProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-background/90 backdrop-blur-xl border-t border-border",
        "p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
        "md:relative md:p-0 md:bg-transparent md:border-0 md:backdrop-blur-none",
        className
      )}
    >
      {children}
    </div>
  );
}
