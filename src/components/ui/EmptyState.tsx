import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

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
      {/* Premium Icon Container */}
      <div className="relative mb-6">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/40 rounded-full blur-2xl opacity-20 scale-150"></div>
        
        {/* Icon */}
        <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-xl">
          <div className="text-white [&>svg]:w-10 [&>svg]:h-10">
            {icon}
          </div>
        </div>
      </div>

      {/* Text */}
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-md mb-8">
        {description}
      </p>

      {/* Action */}
      {action && (
        <Button 
          size="lg"
          onClick={action.onClick}
          className="shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
