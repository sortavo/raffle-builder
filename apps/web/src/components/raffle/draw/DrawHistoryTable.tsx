import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Bell, 
  BellOff, 
  Eye, 
  EyeOff, 
  History,
  Mail,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import type { RaffleDraw } from '@/hooks/useRaffleDraws';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DrawHistoryTableProps {
  draws: RaffleDraw[];
  currencyCode?: string;
  onAnnounce: (drawId: string) => void;
  onNotify: (draw: RaffleDraw) => void;
  onDelete: (drawId: string) => void;
  isAnnouncing?: boolean;
  isNotifying?: boolean;
  isDeleting?: boolean;
}

const methodLabels: Record<string, string> = {
  manual: 'Manual',
  lottery: 'Lotería Nacional',
  random_org: 'Random.org',
};

export function DrawHistoryTable({
  draws,
  currencyCode = 'MXN',
  onAnnounce,
  onNotify,
  onDelete,
  isAnnouncing,
  isNotifying,
  isDeleting,
}: DrawHistoryTableProps) {
  if (draws.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Historial de Sorteos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aún no se han realizado sorteos
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Historial de Sorteos ({draws.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Premio</TableHead>
              <TableHead>Ganador</TableHead>
              <TableHead>Boleto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {draws.map((draw) => (
              <TableRow key={draw.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{draw.prize_name}</p>
                    {draw.prize_value && (
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(draw.prize_value, currencyCode)}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{draw.winner_name || 'Sin nombre'}</p>
                    {draw.winner_city && (
                      <p className="text-sm text-muted-foreground">{draw.winner_city}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono">
                    {draw.ticket_number}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {methodLabels[draw.draw_method] || draw.draw_method}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(draw.drawn_at), "d MMM yyyy, HH:mm", { locale: es })}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {draw.draw_type === 'main_draw' && (
                      <Badge variant="default" className="w-fit">
                        Sorteo Final
                      </Badge>
                    )}
                    {draw.announced ? (
                      <Badge variant="outline" className="w-fit bg-green-500/10 text-green-600 border-green-500/20">
                        <Eye className="h-3 w-3 mr-1" />
                        Publicado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="w-fit">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Sin publicar
                      </Badge>
                    )}
                    {draw.winner_notified && (
                      <Badge variant="outline" className="w-fit bg-blue-500/10 text-blue-600 border-blue-500/20">
                        <Bell className="h-3 w-3 mr-1" />
                        Notificado
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!draw.announced && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onAnnounce(draw.id)}
                            disabled={isAnnouncing}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Publicar resultado</TooltipContent>
                      </Tooltip>
                    )}
                    
                    {!draw.winner_notified && draw.winner_email && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onNotify(draw)}
                            disabled={isNotifying}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Notificar ganador</TooltipContent>
                      </Tooltip>
                    )}

                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar sorteo</TooltipContent>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar este sorteo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminará el registro del sorteo de "{draw.prize_name}" 
                            ganado por "{draw.winner_name}". Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(draw.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
