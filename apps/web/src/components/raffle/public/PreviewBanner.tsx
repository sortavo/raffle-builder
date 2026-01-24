import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, ArrowRight, AlertTriangle } from "lucide-react";

interface PreviewBannerProps {
  raffleId: string;
  status: string;
}

export function PreviewBanner({ raffleId, status }: PreviewBannerProps) {
  const navigate = useNavigate();

  const statusLabel = status === 'draft' ? 'borrador' : status === 'paused' ? 'pausado' : status;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Eye className="h-5 w-5 shrink-0" />
          </div>
          <div className="text-center sm:text-left">
            <p className="font-semibold text-sm sm:text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 sm:hidden" />
              Vista previa del sorteo
            </p>
            <p className="text-xs sm:text-sm opacity-90">
              Este sorteo está en <span className="font-semibold">{statusLabel}</span>. Los compradores no pueden verlo todavía.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/dashboard/raffles/${raffleId}/edit`)}
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(`/dashboard/raffles/${raffleId}`)}
            className="bg-white text-amber-600 hover:bg-white/90"
          >
            Publicar sorteo
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
