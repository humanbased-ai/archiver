import { useRef, useState, useEffect } from "react";
import { cn } from "@udecode/cn";

import { useWindowResize } from "@/hooks/useWindowResize";
import PCVisualization from "./pc-visualization";
import Timeline from "@/assets/v3/section-2-kp-line.svg?react";

interface BlockchainVisualizationProps {
  className?: string;
}

const BlockchainVisualization = ({ className }: BlockchainVisualizationProps) => {
  // Window size detection
  const { width: windowWidth } = useWindowResize();
  const isMobile = windowWidth < 1024; // Consider devices with width less than 768px as mobile

  // Container reference
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Monitor container width changes
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, [windowWidth, containerRef]); // Recalculate when window width changes

  return (
    <div className={className}>
      {isMobile ? (
        <div className={cn("flex h-full animate-timeline flex-nowrap lg:hidden", className)}>
          <Timeline className="h-full shrink-0" />
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-0 top-[99.5px] flex h-[1.2px] w-full items-stretch justify-between">
            <div className="flex-1 bg-black"></div>
            <div className="section px-0" />
            <div className="flex-1 bg-[#ccc]" />
          </div>
          <div className="relative px-0" ref={containerRef}>
            <PCVisualization className="mx-auto" containerWidth={containerWidth} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockchainVisualization;
