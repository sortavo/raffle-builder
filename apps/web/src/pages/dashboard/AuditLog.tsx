import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuditLog, AuditLogEntry } from '@/hooks/useAuditLog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  History, 
  Plus, 
  Pencil, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Ticket,
  Gift,
  Settings,
  Users,
  CreditCard,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  create: { label: 'Creó', icon: Plus, color: 'bg-green-500/10 text-green-600' },
  update: { label: 'Editó', icon: Pencil, color: 'bg-blue-500/10 text-blue-600' },
  delete: { label: 'Eliminó', icon: Trash2, color: 'bg-red-500/10 text-red-600' },
  approve: { label: 'Aprobó', icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-600' },
  reject: { label: 'Rechazó', icon: XCircle, color: 'bg-orange-500/10 text-orange-600' },
};

const RESOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  raffle: { label: 'Rifa', icon: Gift },
  ticket: { label: 'Boleto', icon: Ticket },
  payment_method: { label: 'Método de pago', icon: CreditCard },
  organization: { label: 'Organización', icon: Settings },
  team_member: { label: 'Miembro del equipo', icon: Users },
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

function AuditLogItem({ entry }: { entry: AuditLogEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  const actionConfig = ACTION_CONFIG[entry.action] || ACTION_CONFIG.update;
  const resourceConfig = RESOURCE_CONFIG[entry.resource_type] || RESOURCE_CONFIG.raffle;
  const ActionIcon = actionConfig.icon;
  const ResourceIcon = resourceConfig.icon;

  const hasChanges = entry.changes && Object.keys(entry.changes).length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-start gap-4 p-4 hover:bg-muted/50 rounded-lg transition-colors">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {getInitials(entry.user_name, entry.user_email)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">
              {entry.user_name || entry.user_email}
            </span>
            <Badge variant="outline" className={actionConfig.color}>
              <ActionIcon className="h-3 w-3 mr-1" />
              {actionConfig.label}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <ResourceIcon className="h-3 w-3" />
              {resourceConfig.label}
            </Badge>
          </div>

          {entry.resource_name && (
            <p className="text-sm text-muted-foreground mt-1">
              "{entry.resource_name}"
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: es })}
            {' · '}
            {format(new Date(entry.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
          </p>

          {hasChanges && (
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Ver cambios
              </button>
            </CollapsibleTrigger>
          )}

          <CollapsibleContent>
            {hasChanges && (
              <div className="mt-3 p-3 bg-muted/50 rounded-md text-sm space-y-2">
                {Object.entries(entry.changes!).map(([field, { old: oldVal, new: newVal }]) => (
                  <div key={field} className="flex flex-col">
                    <span className="font-medium text-foreground capitalize">
                      {field.replace(/_/g, ' ')}:
                    </span>
                    <div className="flex gap-2 text-xs">
                      <span className="text-red-600 line-through">
                        {String(oldVal || '(vacío)')}
                      </span>
                      <span>→</span>
                      <span className="text-green-600">
                        {String(newVal || '(vacío)')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}

export default function AuditLog() {
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  
  const { data: logs, isLoading } = useAuditLog({
    resourceType: resourceFilter !== 'all' ? resourceFilter : undefined,
    limit: 100,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6" />
              Historial de Cambios
            </h1>
            <p className="text-muted-foreground">
              Registro de todas las acciones realizadas por tu equipo
            </p>
          </div>

          <Select value={resourceFilter} onValueChange={setResourceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="raffle">Rifas</SelectItem>
              <SelectItem value="ticket">Boletos</SelectItem>
              <SelectItem value="payment_method">Métodos de pago</SelectItem>
              <SelectItem value="organization">Organización</SelectItem>
              <SelectItem value="team_member">Equipo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas 100 acciones registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-start gap-4 p-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : logs && logs.length > 0 ? (
                <div className="divide-y divide-border">
                  {logs.map((log) => (
                    <AuditLogItem key={log.id} entry={log} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No hay actividad registrada aún</p>
                  <p className="text-sm">Las acciones de tu equipo aparecerán aquí</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
