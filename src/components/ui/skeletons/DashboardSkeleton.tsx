import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Premium Welcome Banner Skeleton */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 p-8">
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"></div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <Skeleton className="h-9 w-64 bg-white/50" />
            <Skeleton className="h-6 w-80 bg-white/50" />
          </div>
          <Skeleton className="h-12 w-36 bg-white/50 rounded-lg" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-6"
          >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"></div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <Skeleton className="w-16 h-6 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Raffles Skeleton */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-6">
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"></div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
          
          <div className="flex flex-col items-center justify-center py-12">
            <Skeleton className="w-20 h-20 rounded-2xl mb-6" />
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64 mb-8" />
            <Skeleton className="h-12 w-48 rounded-lg" />
          </div>
        </div>

        {/* Recent Activity Skeleton */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-6">
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"></div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl">
                <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
