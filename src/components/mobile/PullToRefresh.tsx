import { useState, useRef, useCallback, ReactNode } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  threshold?: number;
  maxPull?: number;
}

export function PullToRefresh({
  children,
  onRefresh,
  className,
  threshold = 80,
  maxPull = 120,
}: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const startY = useRef(0);
  const pullDistance = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const indicatorRotation = useTransform(pullDistance, [0, threshold], [0, 180]);
  const indicatorOpacity = useTransform(pullDistance, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const indicatorScale = useTransform(pullDistance, [0, threshold], [0.8, 1]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Only enable pull to refresh when scrolled to top
    if (container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setPulling(false);
      return;
    }
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Apply resistance
      const resistance = 0.4;
      const distance = Math.min(diff * resistance, maxPull);
      pullDistance.set(distance);
      
      // Prevent native scroll
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [pulling, refreshing, maxPull, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);
    
    const distance = pullDistance.get();
    
    if (distance >= threshold && !refreshing) {
      setRefreshing(true);
      pullDistance.set(threshold);
      
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    
    pullDistance.set(0);
  }, [pulling, pullDistance, threshold, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-y-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        style={{ height: pullDistance }}
        className="flex items-center justify-center overflow-hidden"
      >
        <motion.div
          style={{ 
            opacity: indicatorOpacity,
            scale: indicatorScale
          }}
          className="flex items-center justify-center"
        >
          {refreshing ? (
            <Loader2 className="h-6 w-6 text-violet-600 animate-spin" />
          ) : (
            <motion.div style={{ rotate: indicatorRotation }}>
              <ArrowDown
                className={cn(
                  "h-6 w-6 transition-colors",
                  pullDistance.get() >= threshold 
                    ? "text-violet-600" 
                    : "text-muted-foreground"
                )}
              />
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Content */}
      {children}
    </div>
  );
}
