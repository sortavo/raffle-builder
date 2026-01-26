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
import { useAuth } from "@/hooks/useAuth";
import { useCustomers, getCustomerWhatsAppLink, Customer } from "@/hooks/useCustomers";
import { Search, Users, Mail, Phone, MapPin, Loader2, DollarSign, Ticket, Copy, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/currency-utils";
import { useToast } from "@/hooks/use-toast";

export default function Buyers() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // Use the new customers table - data persists even after orders are archived
  const { data, isLoading } = useCustomers(organization?.id);
  const customers = data?.customers || [];
  const stats = data?.stats || { total: 0, withEmail: 0, withPhone: 0, totalRevenue: 0, totalTickets: 0 };

  // Filter customers client-side for quick search
  const filteredCustomers = customers.filter((customer) =>
    customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleWhatsApp = (customer: Customer) => {
    if (!customer.phone) return;
    const url = getCustomerWhatsAppLink(customer.phone, customer.full_name, organization?.name);
    window.open(url, '_blank');
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: "Compradores" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Compradores</h1>
          <p className="text-muted-foreground">
            Base de datos permanente de clientes de tu organización
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
              <p className="text-[10px] sm:text-xs text-muted-foreground">clientes únicos</p>
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
              <p className="text-[10px] sm:text-xs text-muted-foreground">valor de vida total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Boletos</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.totalTickets}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">comprados</p>
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
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>
              Clientes ordenados por valor de vida (LTV) • Datos permanentes incluso después de archivar sorteos
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
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground">No hay clientes</h3>
                <p className="text-muted-foreground">
                  Los clientes aparecerán aquí cuando realicen compras en tus sorteos.
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead className="text-center">Compras</TableHead>
                      <TableHead className="text-center">Boletos</TableHead>
                      <TableHead className="text-right">LTV</TableHead>
                      <TableHead>Última Compra</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(customer.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium">{customer.full_name}</span>
                              {customer.city && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {customer.city}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {customer.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate max-w-[150px]">{customer.email}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(customer.email!, 'Email')}
                                  className="h-5 w-5 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{customer.phone}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(customer.phone!, 'Teléfono')}
                                  className="h-5 w-5 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{customer.total_orders}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {customer.total_tickets}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(customer.total_spent, organization?.currency_code || 'MXN')}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {customer.last_purchase_at
                            ? formatDistanceToNow(new Date(customer.last_purchase_at), {
                                addSuffix: true,
                                locale: es,
                              })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {customer.phone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleWhatsApp(customer)}
                                className="h-8 w-8 p-0"
                                title="Enviar WhatsApp"
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
