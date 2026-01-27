import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
  PieChart,
  Pie
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3, PieChartIcon, Percent } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DailyRevenue {
  date: string;
  revenue: number;
  tickets: number;
}

interface RaffleSales {
  name: string;
  sold: number;
  available: number;
  total: number;
  revenue: number;
  color: string;
  hasDiscounts: boolean;
  discountAmount: number;
}

interface RevenueChartProps {
  data: DailyRevenue[];
  totalRevenue: number;
  revenueChange: number;
  currency?: string;
  periodLabel?: string;
}

interface SalesChartProps {
  data: RaffleSales[];
  totalTickets: number;
  ticketsChange: number;
}

interface TooltipPayload {
  value?: number;
  payload?: RaffleSales;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  currency?: string;
}

interface SalesTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegendEntry = any;

const formatCurrency = (value: number, currency: string = 'MXN') => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({ active, payload, label, currency = 'MXN' }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-xl">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-full bg-primary mr-2"></span>
            Ingresos: <span className="font-semibold text-foreground">{formatCurrency(payload[0]?.value || 0, currency)}</span>
          </p>
          {payload[1] && (
            <p className="text-sm text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-full bg-accent mr-2"></span>
              Boletos: <span className="font-semibold text-foreground">{payload[1]?.value || 0}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const SalesTooltip = ({ active, payload }: SalesTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-xl">
        <p className="text-sm font-medium text-foreground mb-2">{data?.name}</p>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Vendidos: <span className="font-semibold text-foreground">{data?.sold}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Disponibles: <span className="font-semibold text-foreground">{data?.available}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Ingresos: <span className="font-semibold text-foreground">{formatCurrency(data?.revenue || 0)}</span>
          </p>
          {data?.hasDiscounts && (
            <p className="text-sm text-orange-500 flex items-center gap-1">
              <Percent className="w-3 h-3" />
              Descuentos: <span className="font-semibold">-{formatCurrency(data?.discountAmount || 0)}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data, totalRevenue, revenueChange, currency = 'MXN', periodLabel = 'Últimos 30 días' }: RevenueChartProps) {
  const isPositive = revenueChange >= 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Ingresos</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${
          isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
        }`}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
          ) : (
            <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
          )}
          {isPositive ? '+' : ''}{revenueChange}%
        </div>
      </div>

      {/* Total Revenue Display */}
      <div className="mb-4 sm:mb-6">
        <p className="text-2xl sm:text-3xl font-bold text-foreground">{formatCurrency(totalRevenue, currency)}</p>
        <p className="text-xs sm:text-sm text-muted-foreground">Total del período</p>
      </div>

      {/* Chart */}
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
              width={40}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Truncate long raffle names for display
const truncateName = (name: string, maxLength: number = 15) => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
};

export function SalesChart({ data, totalTickets, ticketsChange }: SalesChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const isPositive = ticketsChange >= 0;

  // Prepare data with truncated names for mobile
  const chartDataWithTruncatedNames = data.map(item => ({
    ...item,
    displayName: truncateName(item.name, 12)
  }));

  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Ventas por Sorteo</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Distribución de boletos</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            isPositive ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
          }`}>
            <BarChart3 className="w-4 h-4" />
            {totalTickets} vendidos
          </div>
          
          {/* Chart Type Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 ${chartType === 'bar' ? 'bg-card shadow-sm' : ''}`}
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 ${chartType === 'pie' ? 'bg-card shadow-sm' : ''}`}
              onClick={() => setChartType('pie')}
            >
              <PieChartIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile tickets count */}
      <div className="flex sm:hidden items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary w-fit mb-4">
        <BarChart3 className="w-4 h-4" />
        {totalTickets} vendidos
      </div>

      {/* Chart */}
      <div className="h-48 sm:h-64">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm sm:text-base">Sin datos de ventas</p>
              <p className="text-xs sm:text-sm text-muted-foreground/70">Crea un sorteo para ver estadísticas</p>
            </div>
          </div>
        ) : chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartDataWithTruncatedNames} 
              margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="displayName" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                interval={0}
                height={40}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                width={35}
              />
              <Tooltip content={<SalesTooltip />} />
              <Bar dataKey="sold" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartDataWithTruncatedNames.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="sold"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<SalesTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(_value, entry: LegendEntry) => (
                  <span className="text-xs sm:text-sm text-muted-foreground">{truncateName(entry.payload?.name || '', 15)}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend for bar chart - mobile optimized */}
      {chartType === 'bar' && data.length > 0 && (
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
          {data.slice(0, 4).map((item, index) => (
            <div key={index} className="flex items-center gap-1.5 sm:gap-2">
              <div 
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[80px] sm:max-w-none">
                {truncateName(item.name, 12)}
              </span>
              {item.hasDiscounts && (
                <span className="text-[9px] sm:text-[10px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Percent className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Discount indicator summary */}
      {data.some(item => item.hasDiscounts) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-orange-500 bg-orange-500/10 px-3 py-2 rounded-lg">
          <Percent className="w-3.5 h-3.5" />
          <span>
            Paquetes con descuento aplicados: <span className="font-semibold">
              -{formatCurrency(data.reduce((sum, item) => sum + item.discountAmount, 0))}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}