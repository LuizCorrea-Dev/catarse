import React, { useState, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { ArrowDown, Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const controls = useAnimation();
  const threshold = 150; // Distance to trigger refresh

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 0) return; // Only trigger if at top
    // We rely on pullY being 0 initially
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY > 0 && !isRefreshing) return;
    
    // Simple logic: if at top and scrolling down
    // Ideally we would track startY, but for simplicity let's rely on scroll value being 0
    // and using a bit of document body overscroll check if possible, or just standard 
    // "if window.scrollY === 0 and moving down"
    // Since implementing robust custom PTR is complex, we will use a simplified approach:
    // We attach to the container scroll. If container is page, we check window.scrollY.
  };

  // Due to complexity of custom PTR without libraries, let's use a simpler "Button" approach or 
  // a very basic JS implementation if the user insists on "pulling".
  // Actually, modern browsers support overscroll-behavior. 
  // Let's implement a listener on the main scrollable area.

  // Better Strategy: Verify if user scrolled up past 0.
  // Implementation: 
  const [startY, setStartY] = useState(0);

  useEffect(() => {
    const handleStart = (e: TouchEvent) => {
        if (window.scrollY === 0) {
            setStartY(e.touches[0].clientY);
        }
    };

    const handleMove = (e: TouchEvent) => {
        if (startY > 0 && window.scrollY === 0) {
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                setPullY(diff * 0.5); // Resistance
                if (e.cancelable) e.preventDefault(); // Prevent native reload if we want custom
            }
        }
    };

    const handleEnd = async () => {
        if (pullY > 100) {
            setIsRefreshing(true);
            setPullY(100); // Snap to loading position
            await onRefresh();
            setIsRefreshing(false);
            setPullY(0);
        } else {
            setPullY(0);
        }
        setStartY(0);
    };

    document.addEventListener("touchstart", handleStart, { passive: true });
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("touchstart", handleStart);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [pullY, onRefresh, startY]);

  return (
    <div style={{ position: "relative" }}>
      <motion.div
        initial={false}
        animate={{ height: pullY }}
        className="overflow-hidden flex items-center justify-center bg-[#1e293b]"
      >
        <div className="flex flex-col items-center justify-center py-4">
            {isRefreshing ? (
                <Loader2 className="animate-spin text-[#50c878]" />
            ) : (
                <ArrowDown 
                    className="text-slate-400" 
                    style={{ transform: `rotate(${Math.min(pullY * 2, 180)}deg)` }} 
                />
            )}
        </div>
      </motion.div>
      {children}
    </div>
  );
};
