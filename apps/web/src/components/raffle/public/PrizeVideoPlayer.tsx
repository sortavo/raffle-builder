import { getVideoEmbedUrl } from "@/lib/video-utils";

interface PrizeVideoPlayerProps {
  videoUrl: string;
  title?: string;
  className?: string;
}

export function PrizeVideoPlayer({ videoUrl, title, className = "" }: PrizeVideoPlayerProps) {
  const { type, embedUrl } = getVideoEmbedUrl(videoUrl);

  if (!embedUrl || !type) return null;

  return (
    <div className={`aspect-video rounded-2xl overflow-hidden shadow-xl bg-black ${className}`}>
      <iframe
        src={embedUrl}
        title={title || "Video del premio"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full h-full"
        loading="lazy"
      />
    </div>
  );
}
