import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Upload, X, GripVertical, Play, Image as ImageIcon, Film, Youtube, Plus, Video } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export interface CoverMediaItem {
  type: "image" | "video" | "youtube" | "vimeo";
  url: string;
  order: number;
}

interface CoverMediaUploaderProps {
  organizationId: string;
  media: CoverMediaItem[];
  onChange: (media: CoverMediaItem[]) => void;
  maxItems?: number;
}

interface SortableMediaItemProps {
  item: CoverMediaItem;
  onRemove: () => void;
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// Extract Vimeo video ID from various URL formats
function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function getVimeoThumbnail(videoId: string): string {
  // Vimeo doesn't have a simple thumbnail URL, we'll use a placeholder style
  return `https://vumbnail.com/${videoId}.jpg`;
}

function SortableMediaItem({ item, onRemove }: SortableMediaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const youtubeId = item.type === "youtube" ? extractYouTubeId(item.url) : null;
  const vimeoId = item.type === "vimeo" ? extractVimeoId(item.url) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group h-24 w-32 rounded-lg overflow-hidden border-2 border-border bg-muted flex-shrink-0",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      {item.type === "youtube" && youtubeId ? (
        <div className="relative w-full h-full">
          <img 
            src={getYouTubeThumbnail(youtubeId)} 
            alt="YouTube" 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="h-8 w-8 text-white fill-white" />
          </div>
        </div>
      ) : item.type === "vimeo" && vimeoId ? (
        <div className="relative w-full h-full">
          <img 
            src={getVimeoThumbnail(vimeoId)} 
            alt="Vimeo" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback if vumbnail.com fails
              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%231ab7ea' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='14' font-family='sans-serif'%3EVimeo%3C/text%3E%3C/svg%3E";
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="h-8 w-8 text-white fill-white" />
          </div>
        </div>
      ) : item.type === "video" ? (
        <div className="relative w-full h-full">
          <video src={item.url} className="w-full h-full object-cover" muted />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="h-8 w-8 text-white fill-white" />
          </div>
        </div>
      ) : (
        <img src={item.url} alt="Cover" className="w-full h-full object-cover" />
      )}
      
      {/* Type badge */}
      <div className="absolute top-1 left-1 bg-black/60 rounded px-1.5 py-0.5 flex items-center gap-1">
        {item.type === "youtube" ? (
          <Youtube className="h-3 w-3 text-red-500" />
        ) : item.type === "vimeo" ? (
          <Video className="h-3 w-3 text-[#1ab7ea]" />
        ) : item.type === "video" ? (
          <Film className="h-3 w-3 text-white" />
        ) : (
          <ImageIcon className="h-3 w-3 text-white" />
        )}
      </div>
      
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-1 right-7 bg-black/60 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-3 w-3 text-white" />
      </button>
      
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 bg-destructive rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
      >
        <X className="h-3 w-3 text-white" />
      </button>
    </div>
  );
}

export function CoverMediaUploader({ 
  organizationId, 
  media, 
  onChange, 
  maxItems = 10 
}: CoverMediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [showVideoInput, setShowVideoInput] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = media.findIndex((item) => item.url === active.id);
      const newIndex = media.findIndex((item) => item.url === over.id);
      
      const newMedia = arrayMove(media, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index,
      }));
      
      onChange(newMedia);
    }
  };

  const handleRemove = (url: string) => {
    const newMedia = media
      .filter((item) => item.url !== url)
      .map((item, index) => ({ ...item, order: index }));
    onChange(newMedia);
  };

  const handleAddVideo = () => {
    if (!videoUrl.trim()) return;
    
    if (media.length >= maxItems) {
      toast.error(`Máximo ${maxItems} medios permitidos`);
      return;
    }

    const url = videoUrl.trim();
    
    // Check if already exists
    if (media.some(m => m.url === url)) {
      toast.error("Este video ya está agregado");
      return;
    }

    // Try YouTube first
    const youtubeId = extractYouTubeId(url);
    if (youtubeId) {
      onChange([
        ...media,
        { type: "youtube", url, order: media.length },
      ]);
      setVideoUrl("");
      setShowVideoInput(false);
      toast.success("Video de YouTube agregado");
      return;
    }

    // Try Vimeo
    const vimeoId = extractVimeoId(url);
    if (vimeoId) {
      onChange([
        ...media,
        { type: "vimeo", url, order: media.length },
      ]);
      setVideoUrl("");
      setShowVideoInput(false);
      toast.success("Video de Vimeo agregado");
      return;
    }

    toast.error("URL no válida. Soportamos YouTube y Vimeo.");
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxItems - media.length;
    if (remainingSlots <= 0) {
      toast.error(`Máximo ${maxItems} medios permitidos`);
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    setIsUploading(true);

    try {
      const uploadedItems: CoverMediaItem[] = [];

      for (const file of filesToUpload) {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");

        if (!isVideo && !isImage) {
          toast.error(`${file.name}: Formato no soportado`);
          continue;
        }

        const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(`${file.name}: Excede el límite de ${isVideo ? "50MB" : "5MB"}`);
          continue;
        }

        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${organizationId}/cover/${timestamp}_${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          toast.error(`Error subiendo ${file.name}`);
          console.error(uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(filePath);

        uploadedItems.push({
          type: isVideo ? "video" : "image",
          url: publicUrl,
          order: media.length + uploadedItems.length,
        });
      }

      if (uploadedItems.length > 0) {
        onChange([...media, ...uploadedItems]);
        toast.success(`${uploadedItems.length} archivo(s) subido(s)`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al subir archivos");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }, [media, onChange, organizationId, maxItems]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={media.map((item) => item.url)}
            strategy={horizontalListSortingStrategy}
          >
            {media.map((item) => (
              <SortableMediaItem
                key={item.url}
                item={item}
                onRemove={() => handleRemove(item.url)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {media.length < maxItems && (
          <div className="flex gap-2 flex-shrink-0">
            {/* Upload file button */}
            <label
              className={cn(
                "h-24 w-24 rounded-lg border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-muted transition-colors",
                isUploading && "pointer-events-none opacity-50"
              )}
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground text-center">Subir archivo</span>
                </>
              )}
              <input
                type="file"
                accept="image/*,video/mp4,video/webm"
                multiple
                className="hidden"
                onChange={handleUpload}
                disabled={isUploading}
              />
            </label>

            {/* YouTube/Vimeo button */}
            <button
              type="button"
              onClick={() => setShowVideoInput(!showVideoInput)}
              className={cn(
                "h-24 w-24 rounded-lg border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted transition-colors",
                showVideoInput && "border-primary bg-primary/10"
              )}
            >
              <div className="flex items-center gap-1">
                <Youtube className="h-4 w-4 text-red-500" />
                <Video className="h-4 w-4 text-[#1ab7ea]" />
              </div>
              <span className="text-[10px] text-muted-foreground">YouTube/Vimeo</span>
            </button>
          </div>
        )}
      </div>

      {/* Video URL input */}
      {showVideoInput && (
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://youtube.com/... o https://vimeo.com/..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddVideo();
              }
            }}
          />
          <Button 
            type="button" 
            size="sm" 
            onClick={handleAddVideo}
            disabled={!videoUrl.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Arrastra para reordenar. Máximo {maxItems} medios. Imágenes: JPG, PNG, GIF, WebP (máx 5MB). Videos: MP4, WebM (máx 50MB), YouTube o Vimeo.
      </p>
    </div>
  );
}
