import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Ticket,
  Plus,
  MoreVertical,
  Copy,
  BarChart3,
  Trash2,
  Tag,
  CheckCircle2,
  Users,
  TrendingUp,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/skeletons';
import { CreateCouponDialog } from '@/components/coupons/CreateCouponDialog';
import { useCoupons, Coupon } from '@/hooks/useCoupons';
import { successToast } from '@/lib/toast-helpers';
import { formatCurrency } from '@/lib/currency-utils';
import { useAuth } from '@/hooks/useAuth';

export default function Coupons() {
  const { organization } = useAuth();
  const { coupons, isLoading, toggleCoupon, deleteCoupon } = useCoupons();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

  const activeCoupons = coupons.filter(c => c.active);
  const totalUses = coupons.reduce((sum, c) => sum + (c.current_uses || 0), 0);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    successToast('Código copiado al portapapeles');
  };

  const handleDelete = async () => {
    if (couponToDelete) {
      await deleteCoupon.mutateAsync(couponToDelete.id);
      setCouponToDelete(null);
    }
  };

  const isExpired = (coupon: Coupon) => {
    return coupon.valid_until && new Date(coupon.valid_until) < new Date();
  };

  const isExhausted = (coupon: Coupon) => {
    return coupon.max_uses && coupon.current_uses >= coupon.max_uses;
  };

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.active) return { label: 'Inactivo', variant: 'secondary' as const };
    if (isExpired(coupon)) return { label: 'Expirado', variant: 'destructive' as const };
    if (isExhausted(coupon)) return { label: 'Agotado', variant: 'outline' as const };
    return { label: 'Activo', variant: 'default' as const };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cupones de Descuento</h1>
            <p className="text-muted-foreground">
              Crea y gestiona códigos promocionales para tus sorteos
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Cupón
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Tag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Cupones</p>
                  <p className="text-2xl font-bold">{coupons.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Activos</p>
                  <p className="text-2xl font-bold text-green-500">{activeCoupons.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usos Totales</p>
                  <p className="text-2xl font-bold text-blue-500">{totalUses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tasa de Uso</p>
                  <p className="text-2xl font-bold text-amber-500">
                    {coupons.length > 0 
                      ? Math.round((totalUses / coupons.length) * 10) / 10
                      : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coupons List */}
        {isLoading ? (
          <TableSkeleton />
        ) : coupons.length === 0 ? (
          <EmptyState
            icon={<Ticket className="w-12 h-12" />}
            title="No hay cupones aún"
            description="Crea tu primer cupón de descuento para atraer más compradores"
            action={{
              label: "Crear Primer Cupón",
              onClick: () => setShowCreateDialog(true)
            }}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Validez</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopy(coupon.code)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{coupon.name}</p>
                          {coupon.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {coupon.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}%`
                            : formatCurrency(coupon.discount_value, organization?.currency_code || 'MXN')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums">
                          {coupon.current_uses || 0}
                          {coupon.max_uses && (
                            <span className="text-muted-foreground"> / {coupon.max_uses}</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {coupon.valid_until ? (
                            <>
                              <span className={isExpired(coupon) ? 'text-destructive' : ''}>
                                Hasta {format(new Date(coupon.valid_until), 'dd/MM/yyyy', { locale: es })}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Sin expiración</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={coupon.active}
                            onCheckedChange={(checked) => 
                              toggleCoupon.mutate({ id: coupon.id, active: checked })
                            }
                            disabled={isExpired(coupon) || isExhausted(coupon)}
                          />
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopy(coupon.code)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar código
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Ver estadísticas
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setCouponToDelete(coupon)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Create Coupon Dialog */}
        <CreateCouponDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!couponToDelete} onOpenChange={() => setCouponToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este cupón?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El cupón "{couponToDelete?.code}" será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
