import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in",
      className
    )}>
      <div className="mb-4 text-muted-foreground opacity-50">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
