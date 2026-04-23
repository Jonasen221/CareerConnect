import React, { useRef, useState, useCallback } from 'react';

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop > 0) return; // only trigger at top
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startYRef.current === null || refreshing) return;
    const diff = e.touches[0].clientY - startYRef.current;
    if (diff > 0) {
      setPullY(Math.min(diff * 0.5, THRESHOLD + 20));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    startYRef.current = null;
    setPullY(0);
  }, [pullY, refreshing, onRefresh]);

  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
      style={{ overflowY: 'auto', minHeight: '100%' }}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center z-10 pointer-events-none transition-all duration-200"
        style={{ top: pullY - 44, height: 44, opacity: progress }}
      >
        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-md flex items-center justify-center">
          {refreshing ? (
            <div className="w-5 h-5 border-2 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" />
          ) : (
            <div
              className="w-5 h-5 border-2 border-[#5BA4C4] border-t-transparent rounded-full"
              style={{ transform: `rotate(${progress * 270}deg)`, transition: 'transform 0.1s' }}
            />
          )}
        </div>
      </div>
      <div style={{ transform: `translateY(${refreshing ? THRESHOLD : pullY}px)`, transition: pullY === 0 ? 'transform 0.3s' : 'none' }}>
        {children}
      </div>
    </div>
  );
}