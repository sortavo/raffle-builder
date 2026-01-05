import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Play } from "lucide-react";
import { useTrackingEvents } from "@/hooks/useTrackingEvents";

interface PrizeLightboxProps {
  images: string[];
  videoUrl?: string | null;
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  raffleName?: string;
  raffleId?: string;
}

// Helper to extract video embed URL
function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  }
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }
  return null;
}

// Helper to get video thumbnail
function getVideoThumbnail(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
  }
  return null;
}

interface MediaItem {
  type: 'image' | 'video';
  src: string;
  embedUrl?: string;
  thumbnail?: string;
}

export function PrizeLightbox({ images, videoUrl, initialIndex = 0, open, onOpenChange, raffleName, raffleId }: PrizeLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const { trackSelectContent } = useTrackingEvents();
  const hasTrackedRef = useRef(false);

  // Build unified media array: images + video (if exists)
  const mediaItems: MediaItem[] = [
    ...images.map(src => ({ type: 'image' as const, src })),
    ...(videoUrl ? [{
      type: 'video' as const,
      src: videoUrl,
      embedUrl: getEmbedUrl(videoUrl) || undefined,
      thumbnail: getVideoThumbnail(videoUrl) || undefined,
    }] : []),
  ];

  // Reset to initial index when opening and track select_content
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setIsVideoPlaying(false);
      
      // Track select_content only once per open
      if (!hasTrackedRef.current) {
        trackSelectContent({
          contentType: 'prize_gallery',
          contentId: raffleId,
          contentName: raffleName,
          itemId: raffleId,
          itemName: raffleName,
        });
        hasTrackedRef.current = true;
      }
    } else {
      hasTrackedRef.current = false;
    }
  }, [open, initialIndex, trackSelectContent, raffleId, raffleName]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1));
    setIsZoomed(false);
    setIsVideoPlaying(false);
  }, [mediaItems.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1));
    setIsZoomed(false);
    setIsVideoPlaying(false);
  }, [mediaItems.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, goToPrevious, goToNext, onOpenChange]);

  if (!mediaItems.length) return null;

  const currentItem = mediaItems[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Zoom button - only for images */}
        {currentItem.type === 'image' && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-16 z-50 text-white hover:bg-white/20 rounded-full"
            onClick={() => setIsZoomed(!isZoomed)}
          >
            {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </Button>
        )}

        {/* Image counter */}
        <div className="absolute top-4 left-4 z-50 text-white/80 text-sm font-medium bg-black/40 px-3 py-1.5 rounded-full">
          {currentIndex + 1} / {mediaItems.length}
        </div>

        {/* Main content */}
        <div className="flex items-center justify-center w-full h-full p-4">
          {currentItem.type === 'image' ? (
            <div 
              className={`relative transition-transform duration-300 ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              onClick={() => setIsZoomed(!isZoomed)}
            >
              <img
                src={currentItem.src}
                alt={`Imagen ${currentIndex + 1}`}
                className={`max-w-full max-h-[85vh] object-contain transition-transform duration-300 ${
                  isZoomed ? 'scale-150' : 'scale-100'
                }`}
                draggable={false}
              />
            </div>
          ) : (
            // Video slide
            <div className="relative w-full max-w-4xl aspect-video">
              {isVideoPlaying && currentItem.embedUrl ? (
                <iframe
                  src={currentItem.embedUrl}
                  className="w-full h-full rounded-xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div 
                  className="relative w-full h-full cursor-pointer group"
                  onClick={() => setIsVideoPlaying(true)}
                >
                  {currentItem.thumbnail ? (
                    <img
                      src={currentItem.thumbnail}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 rounded-xl flex items-center justify-center">
                      <span className="text-white/50">Video</span>
                    </div>
                  )}
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Play className="w-8 h-8 text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        {mediaItems.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={goToNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Thumbnail strip */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 bg-black/60 rounded-xl max-w-[90vw] overflow-x-auto">
            {mediaItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsZoomed(false);
                  setIsVideoPlaying(false);
                }}
                className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex 
                    ? 'border-white scale-105' 
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {item.type === 'image' ? (
                  <img src={item.src} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="relative w-full h-full">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/10" />
                    )}
                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
