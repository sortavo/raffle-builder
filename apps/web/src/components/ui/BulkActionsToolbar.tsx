import { X, Pause, Play, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onPause?: () => void;
  onActivate?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  isVisible: boolean;
  className?: string;
}

export function BulkActionsToolbar({
  selectedCount,
  onClear,
  onPause,
  onActivate,
  onDelete,
  onDuplicate,
  isVisible,
  className,
}: BulkActionsToolbarProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
            "flex items-center gap-2 px-4 py-3 rounded-xl",
            "bg-background/95 backdrop-blur-sm border shadow-lg",
            className
          )}
        >
          <div className="flex items-center gap-3 pr-3 border-r">
            <span className="text-sm font-medium">
              {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {onActivate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onActivate}
                className="gap-1.5"
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Activar</span>
              </Button>
            )}
            
            {onPause && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPause}
                className="gap-1.5"
              >
                <Pause className="h-4 w-4" />
                <span className="hidden sm:inline">Pausar</span>
              </Button>
            )}

            {onDuplicate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDuplicate}
                className="gap-1.5"
              >
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Duplicar</span>
              </Button>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Eliminar</span>
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
