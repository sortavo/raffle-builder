/**
 * Extracts video embed URL and thumbnail from YouTube or Vimeo links
 */
export function getVideoEmbedUrl(url: string): { 
  type: 'youtube' | 'vimeo' | null; 
  embedUrl: string | null;
  videoId: string | null;
  thumbnailUrl: string | null;
} {
  if (!url) return { type: null, embedUrl: null, videoId: null, thumbnailUrl: null };

  // YouTube patterns:
  // - https://youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://youtube.com/watch?v=VIDEO_ID&si=xxx
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return { 
      type: 'youtube', 
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      videoId,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
  }

  // Vimeo patterns:
  // - https://vimeo.com/VIDEO_ID
  // - https://player.vimeo.com/video/VIDEO_ID
  const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return { 
      type: 'vimeo', 
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      videoId,
      // Vimeo thumbnails require API call, use placeholder
      thumbnailUrl: null
    };
  }

  return { type: null, embedUrl: null, videoId: null, thumbnailUrl: null };
}

/**
 * Check if a URL is a valid video URL
 */
export function isValidVideoUrl(url: string): boolean {
  const { type } = getVideoEmbedUrl(url);
  return type !== null;
}
