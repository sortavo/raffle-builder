export interface SalesDataPoint {
  date: string;
  tickets: number;
  revenue: number;
}

export interface HourlyDataPoint {
  hour: number;
  label: string;
  count: number;
}

export interface CityDataPoint {
  city: string;
  count: number;
  percentage: number;
}

export function aggregateByDate(tickets: Array<{ created_at?: string | null; sold_at?: string | null }>): SalesDataPoint[] {
  const grouped = tickets.reduce((acc, ticket) => {
    const dateStr = ticket.sold_at || ticket.created_at;
    if (!dateStr) return acc;
    
    const date = new Date(dateStr).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { date, tickets: 0, revenue: 0 };
    }
    acc[date].tickets += 1;
    return acc;
  }, {} as Record<string, SalesDataPoint>);
  
  return Object.values(grouped).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function aggregateByHour(tickets: Array<{ created_at?: string | null; sold_at?: string | null }>): HourlyDataPoint[] {
  const hours: HourlyDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${i.toString().padStart(2, '0')}:00`,
    count: 0
  }));
  
  tickets.forEach(ticket => {
    const dateStr = ticket.sold_at || ticket.created_at;
    if (!dateStr) return;
    
    const hour = new Date(dateStr).getHours();
    hours[hour].count += 1;
  });
  
  return hours;
}

export function aggregateByCity(tickets: Array<{ buyer_city: string | null }>): CityDataPoint[] {
  const total = tickets.length;
  const cityCounts = tickets.reduce((acc, ticket) => {
    const city = ticket.buyer_city || 'Sin especificar';
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(cityCounts)
    .map(([city, count]) => ({ 
      city, 
      count, 
      percentage: total > 0 ? (count / total) * 100 : 0 
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function calculateConversionRate(sold: number, total: number): number {
  if (total === 0) return 0;
  return (sold / total) * 100;
}

export function calculateProjectedRevenue(
  currentRevenue: number,
  soldTickets: number,
  totalTickets: number,
  ticketPrice: number
): number {
  if (soldTickets === 0) return totalTickets * ticketPrice;
  
  const avgPrice = currentRevenue / soldTickets;
  return totalTickets * avgPrice;
}

export function calculateSalesVelocity(
  tickets: Array<{ sold_at?: string | null; created_at?: string | null }>,
  startDate: Date
): { dailyAverage: number; projectedDays: number } {
  const now = new Date();
  const daysPassed = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const totalSold = tickets.length;
  
  const dailyAverage = totalSold / daysPassed;
  
  return {
    dailyAverage,
    projectedDays: dailyAverage > 0 ? Math.ceil(totalSold / dailyAverage) : 0
  };
}

export function fillDateGaps(data: SalesDataPoint[], startDate: Date, endDate: Date): SalesDataPoint[] {
  const result: SalesDataPoint[] = [];
  const dataMap = new Map(data.map(d => [d.date, d]));
  
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    result.push(dataMap.get(dateStr) || { date: dateStr, tickets: 0, revenue: 0 });
    current.setDate(current.getDate() + 1);
  }
  
  return result;
}

export function getTimeRangeDates(range: 'week' | 'month' | 'all' | 'custom', customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const end = new Date();
  let start = new Date();
  
  switch (range) {
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setDate(end.getDate() - 30);
      break;
    case 'all':
      start = new Date(2020, 0, 1); // Far past date
      break;
    case 'custom':
      if (customStart && customEnd) {
        return { start: customStart, end: customEnd };
      }
      break;
  }
  
  return { start, end };
}
