import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
  color?: "primary" | "success" | "warning" | "purple" | "blue" | "amber";
  trend?: {
    value: number;
    label: string;
  };
}

const colorClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  color = "primary",
  trend,
}: StatCardProps) {
  const TrendIcon = trend ? (trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus) : null;
  const trendColor = trend ? (trend.value > 0 ? "text-emerald-600" : trend.value < 0 ? "text-red-500" : "text-muted-foreground") : "";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="flex items-center gap-2 mt-1">
              {trend && TrendIcon && (
                <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(trend.value)}%</span>
                  <span className="text-muted-foreground">{trend.label}</span>
                </div>
              )}
              {!trend && description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
