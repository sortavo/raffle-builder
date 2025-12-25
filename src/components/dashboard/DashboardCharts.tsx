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
import { TrendingUp, TrendingDown, BarChart3, PieChartIcon } from "lucide-react";
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
}

interface RevenueChartProps {
  data: DailyRevenue[];
  totalRevenue: number;
  revenueChange: number;
  currency?: string;
}

interface SalesChartProps {
  data: RaffleSales[];
  totalTickets: number;
  ticketsChange: number;
}

const formatCurrency = (value: number, currency: string = 'MXN') => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({ active, payload, label, currency = 'MXN' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-xl">
        <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm text-gray-600">
            <span className="inline-block w-3 h-3 rounded-full bg-violet-500 mr-2"></span>
            Ingresos: <span className="font-semibold text-gray-900">{formatCurrency(payload[0]?.value || 0, currency)}</span>
          </p>
          {payload[1] && (
            <p className="text-sm text-gray-600">
              <span className="inline-block w-3 h-3 rounded-full bg-cyan-500 mr-2"></span>
              Boletos: <span className="font-semibold text-gray-900">{payload[1]?.value || 0}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const SalesTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-xl">
        <p className="text-sm font-medium text-gray-900 mb-2">{data?.name}</p>
        <div className="space-y-1">
          <p className="text-sm text-gray-600">
            Vendidos: <span className="font-semibold text-gray-900">{data?.sold}</span>
          </p>
          <p className="text-sm text-gray-600">
            Disponibles: <span className="font-semibold text-gray-900">{data?.available}</span>
          </p>
          <p className="text-sm text-gray-600">
            Ingresos: <span className="font-semibold text-gray-900">{formatCurrency(data?.revenue || 0)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data, totalRevenue, revenueChange, currency = 'MXN' }: RevenueChartProps) {
  const isPositive = revenueChange >= 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Ingresos</h3>
          <p className="text-sm text-gray-500">Últimos 30 días</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {isPositive ? '+' : ''}{revenueChange}%
        </div>
      </div>

      {/* Total Revenue Display */}
      <div className="mb-6">
        <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue, currency)}</p>
        <p className="text-sm text-gray-500">Total del período</p>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SalesChart({ data, totalTickets, ticketsChange }: SalesChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const isPositive = ticketsChange >= 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Ventas por Sorteo</h3>
          <p className="text-sm text-gray-500">Distribución de boletos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            isPositive ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
          }`}>
            <BarChart3 className="w-4 h-4" />
            {totalTickets} vendidos
          </div>
          
          {/* Chart Type Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 ${chartType === 'bar' ? 'bg-white shadow-sm' : ''}`}
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 ${chartType === 'pie' ? 'bg-white shadow-sm' : ''}`}
              onClick={() => setChartType('pie')}
            >
              <PieChartIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Sin datos de ventas</p>
              <p className="text-sm text-gray-400">Crea un sorteo para ver estadísticas</p>
            </div>
          </div>
        ) : chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip content={<SalesTooltip />} />
              <Bar dataKey="sold" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {data.map((entry, index) => (
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
                innerRadius={60}
                outerRadius={90}
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
                formatter={(value, entry: any) => (
                  <span className="text-sm text-gray-600">{entry.payload?.name}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend for bar chart */}
      {chartType === 'bar' && data.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
          {data.slice(0, 4).map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-xs text-gray-600">{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
