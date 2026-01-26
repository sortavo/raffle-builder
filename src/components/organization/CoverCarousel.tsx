import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause } from "lucide-react";

export interface CoverMediaItem {
  type: "image" | "video" | "youtube" | "vimeo";
  url: string;
  order?: number;
}

interface CoverCarouselProps {
  media: CoverMediaItem[];
  brandColor?: string;
  autoPlayInterval?: number;
  className?: string;
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

export function CoverCarousel({
  media,
  brandColor = "#2563EB",
  autoPlayInterval = 5000,
  className,
}: CoverCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const sortedMedia = [...media].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const currentItem = sortedMedia[currentIndex];
  const hasMultipleItems = sortedMedia.length > 1;

  const goToNext = useCallback(() => {
    if (sortedMedia.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % sortedMedia.length);
  }, [sortedMedia.length]);

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-advance timer (pause for embedded videos)
  useEffect(() => {
    const isEmbedded = currentItem?.type === "youtube" || currentItem?.type === "vimeo";
    
    if (!hasMultipleItems || isPaused || isVideoPlaying || isEmbedded) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // For embedded videos, advance after a longer interval since we can't detect when it ends
      if (isEmbedded && hasMultipleItems && !isPaused) {
        timerRef.current = setTimeout(goToNext, 15000); // 15 seconds for embedded videos
      }
      
      return;
    }

    timerRef.current = setInterval(goToNext, autoPlayInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        clearTimeout(timerRef.current);
      }
    };
  }, [hasMultipleItems, isPaused, isVideoPlaying, autoPlayInterval, goToNext, currentItem?.type]);

  // Handle video end - advance to next
  const handleVideoEnded = () => {
    setIsVideoPlaying(false);
    if (hasMultipleItems) {
      goToNext();
    }
  };

  // Handle video play state
  useEffect(() => {
    if (currentItem?.type === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked
      });
      setIsVideoPlaying(true);
    } else {
      setIsVideoPlaying(false);
    }
  }, [currentIndex, currentItem?.type]);

  // No media - show gradient fallback
  if (!sortedMedia.length) {
    return (
      <div
        className={cn("h-48 sm:h-64 w-full", className)}
        style={{
          background: `linear-gradient(135deg, ${brandColor}40 0%, ${brandColor}10 100%)`,
        }}
      />
    );
  }

  return (
    <div
      className={cn("relative h-48 sm:h-64 w-full overflow-hidden group", className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Media items */}
      {sortedMedia.map((item, index) => {
        const youtubeId = item.type === "youtube" ? extractYouTubeId(item.url) : null;
        const vimeoId = item.type === "vimeo" ? extractVimeoId(item.url) : null;
        
        return (
          <div
            key={item.url}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
            )}
          >
            {item.type === "youtube" && youtubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${index === currentIndex ? 1 : 0}&mute=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&showinfo=0`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="YouTube video"
              />
            ) : item.type === "vimeo" && vimeoId ? (
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}?autoplay=${index === currentIndex ? 1 : 0}&muted=1&loop=1&background=1&title=0&byline=0&portrait=0`}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
                title="Vimeo video"
              />
            ) : item.type === "video" ? (
              <video
                ref={index === currentIndex ? videoRef : null}
                src={item.url}
                className="w-full h-full object-cover"
                muted
                playsInline
                loop={!hasMultipleItems}
                onEnded={handleVideoEnded}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
              />
            ) : (
              <img
                src={item.url}
                alt={`Cover ${index + 1}`}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        );
      })}

      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-20 pointer-events-none" />

      {/* Navigation dots */}
      {hasMultipleItems && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          {sortedMedia.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white w-4"
                  : "bg-white/50 hover:bg-white/75"
              )}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Pause indicator */}
      {hasMultipleItems && isPaused && !isVideoPlaying && currentItem?.type !== "youtube" && currentItem?.type !== "vimeo" && (
        <div className="absolute top-4 right-4 z-30 bg-black/50 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Pause className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Video playing indicator */}
      {(currentItem?.type === "video" && isVideoPlaying) && (
        <div className="absolute top-4 right-4 z-30 bg-black/50 rounded-full p-2">
          <Play className="h-4 w-4 text-white fill-white" />
        </div>
      )}
    </div>
  );
}
