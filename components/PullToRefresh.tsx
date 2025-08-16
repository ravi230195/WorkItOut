import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  children: React.ReactNode;
  pullThreshold?: number;
  maxPullDistance?: number;
}

export function PullToRefresh({
  onRefresh,
  isRefreshing,
  children,
  pullThreshold = 80,
  maxPullDistance = 120
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [shouldTriggerRefresh, setShouldTriggerRefresh] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const canPull = (): boolean => {
    const container = containerRef.current;
    if (!container) return false;
    return container.scrollTop === 0;
  };

  const resetState = () => {
    setIsPulling(false);
    setPullDistance(0);
    setShouldTriggerRefresh(false);
    startY.current = 0;
    currentY.current = 0;
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!canPull() || isRefreshing) return;
    
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!canPull() || isRefreshing || startY.current === 0) return;
    
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    
    if (deltaY > 0) {
      e.preventDefault();
      
      // Only set pulling state once
      if (!isPulling) {
        setIsPulling(true);
      }
      
      const resistance = 0.5;
      const distance = Math.min(deltaY * resistance, maxPullDistance);
      setPullDistance(distance);
      
      const shouldRefresh = distance >= pullThreshold;
      if (shouldRefresh !== shouldTriggerRefresh) {
        setShouldTriggerRefresh(shouldRefresh);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    
    if (shouldTriggerRefresh && !isRefreshing) {
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      }
    } else {
      resetState();
    }
  };

  // Mouse events for desktop testing
  const handleMouseDown = (e: MouseEvent) => {
    if (!canPull() || isRefreshing) return;
    
    startY.current = e.clientY;
    currentY.current = startY.current;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!canPull() || isRefreshing || startY.current === 0) return;
    
    currentY.current = e.clientY;
    const deltaY = currentY.current - startY.current;
    
    if (deltaY > 0) {
      // Only set pulling state once
      if (!isPulling) {
        setIsPulling(true);
      }
      
      const resistance = 0.5;
      const distance = Math.min(deltaY * resistance, maxPullDistance);
      setPullDistance(distance);
      
      const shouldRefresh = distance >= pullThreshold;
      // Only update when threshold state actually changes
      if (shouldRefresh !== shouldTriggerRefresh) {
        setShouldTriggerRefresh(shouldRefresh);
      }
    }
  };

  const handleMouseUp = async () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    await handleTouchEnd();
  };

  // Watch for external refresh completion and reset state
  useEffect(() => {
    // When external refresh completes, reset our state
    if (!isRefreshing && isPulling) {
      resetState();
    }
  }, [isRefreshing, isPulling]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('mousedown', handleMouseDown as any);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown as any);
      
      // Clean up document listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isRefreshing]);

  // Calculate indicator visibility and position
  const showIndicator = isRefreshing || isPulling;
  const indicatorOpacity = showIndicator ? (isRefreshing ? 1 : Math.min(pullDistance / pullThreshold, 1)) : 0;
  const indicatorTransform = isRefreshing 
    ? 'translateY(60px) scale(1)' 
    : isPulling 
      ? `translateY(${Math.min(pullDistance, 60)}px) scale(${Math.min(pullDistance / pullThreshold, 1)})`
      : 'translateY(-60px) scale(0.8)';

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-auto"
      style={{
        transform: `translateY(${isPulling && !isRefreshing ? pullDistance * 0.3 : 0}px)`,
        transition: isPulling && !isRefreshing ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div 
        className="absolute top-0 left-1/2 z-50 flex items-center justify-center w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-[var(--border)]"
        style={{
          transform: `translateX(-50%) ${indicatorTransform}`,
          opacity: indicatorOpacity,
          transition: isRefreshing ? 'none' : 'all 0.2s ease-out',
          pointerEvents: 'none',
          visibility: showIndicator ? 'visible' : 'hidden'
        }}
      >
        <RefreshCw 
          size={20} 
          className={`${
            shouldTriggerRefresh || isRefreshing 
              ? 'text-[var(--warm-sage)]' 
              : 'text-[var(--warm-brown)]'
          } ${isRefreshing ? 'animate-spin' : ''}`}
        />
      </div>

      {/* Visual feedback text - only show when actively pulling (not refreshing) */}
      {isPulling && !isRefreshing && (
        <div 
          className="absolute top-0 left-0 right-0 z-40 text-center pt-4"
          style={{
            transform: `translateY(${pullDistance * 0.5}px)`,
            transition: 'none',
            pointerEvents: 'none'
          }}
        >
          <div className={`text-sm font-medium ${
            shouldTriggerRefresh ? 'text-[var(--warm-sage)]' : 'text-[var(--warm-brown)]'
          }`}>
            {shouldTriggerRefresh ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}