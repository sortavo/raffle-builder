// ============================================================================
// Gallery Section - Important (Priority 5)
// ============================================================================
// Image carousel/grid with optional video

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SectionProps } from './types';

export function GallerySection({ 
  raffle, 
  isPreview = false 
}: SectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const images = raffle.prize_images || [];
  const hasVideo = !!raffle.prize_video_url;
  
  // If no images, don't render
  if (images.length === 0 && !hasVideo) {
    return null;
  }
  
  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };
  
  const handleNext = () => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };
  
  return (
    <section 
      className="py-8 lg:py-12"
      style={{
        backgroundColor: 'var(--template-bg)',
        color: 'var(--template-text)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ fontFamily: 'var(--template-font-title)' }}
          >
            Galería de Premios
          </h2>
          <p style={{ color: 'var(--template-text-muted)' }}>
            Conoce los premios que puedes ganar
          </p>
        </div>
        
        {/* Main image carousel */}
        <div className="relative max-w-3xl mx-auto">
          <div 
            className="relative aspect-[16/10] rounded-3xl overflow-hidden"
            style={{
              boxShadow: 'var(--template-shadow)',
            }}
          >
            {images.length > 0 ? (
              <img 
                src={images[currentIndex]}
                alt={`Premio ${currentIndex + 1}`}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--template-card-bg)' }}
              >
                <ImageIcon 
                  className="w-16 h-16"
                  style={{ color: 'var(--template-text-muted)' }}
                />
              </div>
            )}
            
            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <button 
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full backdrop-blur-xl transition-all hover:scale-110"
                  style={{
                    backgroundColor: 'var(--template-modal-bg)',
                    color: 'var(--template-modal-text)',
                    border: '1px solid var(--template-modal-border)',
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full backdrop-blur-xl transition-all hover:scale-110"
                  style={{
                    backgroundColor: 'var(--template-modal-bg)',
                    color: 'var(--template-modal-text)',
                    border: '1px solid var(--template-modal-border)',
                  }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            
            {/* Video indicator */}
            {hasVideo && (
              <div 
                className="absolute bottom-4 right-4 px-3 py-2 rounded-full backdrop-blur-xl flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--template-primary)',
                  color: 'var(--template-text-on-primary)',
                }}
              >
                <Play className="w-4 h-4" />
                <span className="text-sm font-medium">Ver video</span>
              </div>
            )}
          </div>
          
          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "w-16 h-16 rounded-xl overflow-hidden transition-all duration-200",
                    idx === currentIndex ? "ring-2 scale-105" : "opacity-60 hover:opacity-100"
                  )}
                  style={{
                    // @ts-ignore - CSS variable for ring color
                    '--tw-ring-color': idx === currentIndex ? 'var(--template-primary)' : undefined,
                  }}
                >
                  <img 
                    src={img}
                    alt={`Miniatura ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
