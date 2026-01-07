import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Search, Users, Mail, Phone, MapPin, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface BuyerData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  email_verified: boolean | null;
  created_at: string | null;
}

export default function Buyers() {
  const { organization } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: buyers, isLoading } = useQuery({
    queryKey: ["organization-buyers", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Get all raffles for this org
      const { data: raffles } = await supabase
        .from("raffles")
        .select("id")
        .eq("organization_id", organization.id);

      if (!raffles?.length) return [];

      // Get all tickets with buyer info from these raffles
      const { data: tickets } = await supabase
        .from("sold_tickets")
        .select("buyer_name, buyer_email, buyer_phone, buyer_city, reserved_at, status")
        .in("raffle_id", raffles.map(r => r.id))
        .not("buyer_name", "is", null);

      // Group by email to get unique buyers
      const buyerMap = new Map<string, BuyerData>();
      tickets?.forEach((ticket) => {
        const key = ticket.buyer_email || ticket.buyer_phone || ticket.buyer_name;
        if (key && !buyerMap.has(key)) {
          buyerMap.set(key, {
            id: key,
            full_name: ticket.buyer_name || "",
            email: ticket.buyer_email || "",
            phone: ticket.buyer_phone,
            city: ticket.buyer_city,
            email_verified: false,
            created_at: ticket.reserved_at,
          });
        }
      });

      return Array.from(buyerMap.values());
    },
    enabled: !!organization?.id,
  });

  const filteredBuyers = buyers?.filter((buyer) =>
    buyer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buyer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buyer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: "Compradores" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Compradores</h1>
          <p className="text-muted-foreground">
            Gestiona y visualiza todos los compradores de tus sorteos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Compradores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{buyers?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Email</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {buyers?.filter((b) => b.email).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Teléfono</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {buyers?.filter((b) => b.phone).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Compradores</CardTitle>
            <CardDescription>
              Busca y filtra tus compradores
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Registrado</TableHead>
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
                            <span className="font-medium">{buyer.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {buyer.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {buyer.email}
                              </div>
                            )}
                            {buyer.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {buyer.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {buyer.city ? (
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {buyer.city}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {buyer.created_at
                            ? formatDistanceToNow(new Date(buyer.created_at), {
                                addSuffix: true,
                                locale: es,
                              })
                            : "-"}
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
