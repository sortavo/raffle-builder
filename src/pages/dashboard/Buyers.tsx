import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Mail, Phone, MapPin, Loader2, DollarSign, Ticket, TrendingUp, Copy, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/currency-utils";
import { useToast } from "@/hooks/use-toast";

interface BuyerData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  order_count: number;
  ticket_count: number;
  total_spent: number;
  last_purchase: string | null;
}

export default function Buyers() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: buyersData, isLoading } = useQuery({
    queryKey: ["organization-buyers", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return { buyers: [], stats: { total: 0, withEmail: 0, withPhone: 0, totalRevenue: 0, totalTickets: 0 } };

      // Get all orders with buyer info from this organization
      const { data: orders, error } = await supabase
        .from("orders")
        .select("buyer_name, buyer_email, buyer_phone, buyer_city, reserved_at, status, order_total, ticket_count")
        .eq("organization_id", organization.id)
        .not("buyer_name", "is", null);

      if (error) throw error;

      // Group by email to aggregate buyer stats
      const buyerMap = new Map<string, BuyerData>();
      let totalRevenue = 0;
      let totalTickets = 0;

      orders?.forEach((order) => {
        const key = order.buyer_email || order.buyer_phone || order.buyer_name;
        if (!key) return;

        const ticketCount = order.ticket_count || 0;
        const orderTotal = order.status === 'sold' ? (order.order_total || 0) : 0;
        
        totalRevenue += orderTotal;
        totalTickets += order.status === 'sold' ? ticketCount : 0;

        if (buyerMap.has(key)) {
          const existing = buyerMap.get(key)!;
          existing.order_count += 1;
          existing.ticket_count += ticketCount;
          existing.total_spent += orderTotal;
          if (order.reserved_at && (!existing.last_purchase || order.reserved_at > existing.last_purchase)) {
            existing.last_purchase = order.reserved_at;
          }
        } else {
          buyerMap.set(key, {
            id: key,
            full_name: order.buyer_name || "",
            email: order.buyer_email || "",
            phone: order.buyer_phone,
            city: order.buyer_city,
            order_count: 1,
            ticket_count: ticketCount,
            total_spent: orderTotal,
            last_purchase: order.reserved_at,
          });
        }
      });

      const buyers = Array.from(buyerMap.values()).sort((a, b) => b.total_spent - a.total_spent);
      
      return {
        buyers,
        stats: {
          total: buyers.length,
          withEmail: buyers.filter(b => b.email).length,
          withPhone: buyers.filter(b => b.phone).length,
          totalRevenue,
          totalTickets,
        }
      };
    },
    enabled: !!organization?.id,
  });

  const buyers = buyersData?.buyers || [];
  const stats = buyersData?.stats || { total: 0, withEmail: 0, withPhone: 0, totalRevenue: 0, totalTickets: 0 };

  const filteredBuyers = buyers.filter((buyer) =>
    buyer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buyer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buyer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado` });
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${name}, gracias por tu compra en ${organization?.name || 'nuestra organización'}`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: "Compradores" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Compradores</h1>
          <p className="text-muted-foreground">
            Gestiona y visualiza todos los compradores de tu organización
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">compradores únicos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Ingresos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {formatCurrency(stats.totalRevenue, organization?.currency_code || 'MXN')}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">total vendido</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Boletos</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.totalTickets}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">vendidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Con Email</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.withEmail}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Con Teléfono</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.withPhone}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{stats.total > 0 ? Math.round((stats.withPhone / stats.total) * 100) : 0}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Compradores</CardTitle>
            <CardDescription>
              Compradores ordenados por total de compras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredBuyers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground">No hay compradores</h3>
                <p className="text-muted-foreground">
                  Los compradores aparecerán aquí cuando realicen compras en tus sorteos.
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead className="text-center">Compras</TableHead>
                      <TableHead className="text-center">Boletos</TableHead>
                      <TableHead className="text-right">Total Gastado</TableHead>
                      <TableHead>Última Compra</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBuyers.map((buyer) => (
                      <TableRow key={buyer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(buyer.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium">{buyer.full_name}</span>
                              {buyer.city && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {buyer.city}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {buyer.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate max-w-[150px]">{buyer.email}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(buyer.email, 'Email')}
                                  className="h-5 w-5 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            {buyer.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{buyer.phone}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(buyer.phone!, 'Teléfono')}
                                  className="h-5 w-5 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{buyer.order_count}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {buyer.ticket_count}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(buyer.total_spent, organization?.currency_code || 'MXN')}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {buyer.last_purchase
                            ? formatDistanceToNow(new Date(buyer.last_purchase), {
                                addSuffix: true,
                                locale: es,
                              })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {buyer.phone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleWhatsApp(buyer.phone!, buyer.full_name)}
                                className="h-8 w-8 p-0"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
