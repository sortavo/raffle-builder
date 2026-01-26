import { Skeleton } from '@/components/ui/skeleton';

export function TicketGridSkeleton() {
  return (
    <div className="grid grid-cols-10 gap-2 animate-fade-in">
      {Array.from({ length: 100 }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="aspect-square rounded-md"
          style={{
            animationDelay: `${(i % 10) * 50}ms`
          }}
        />
      ))}
    </div>
  );
}
