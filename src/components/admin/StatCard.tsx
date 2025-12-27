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
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  purple: "bg-accent/10 text-accent",
  blue: "bg-primary/10 text-primary",
  amber: "bg-warning/10 text-warning",
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
  const trendColor = trend ? (trend.value > 0 ? "text-success" : trend.value < 0 ? "text-destructive" : "text-muted-foreground") : "";

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
