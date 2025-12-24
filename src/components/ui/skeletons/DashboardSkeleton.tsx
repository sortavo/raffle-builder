import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RaffleCardSkeleton } from './RaffleCardSkeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-9 w-20" />
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-md" />
      </div>

      {/* Raffles Grid */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <RaffleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
