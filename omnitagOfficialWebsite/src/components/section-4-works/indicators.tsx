import { cn } from "@udecode/cn";
import { useEffect, useRef, useState } from "react";

export default function Indicators({
  total = 0,
  index,
  className,
}: {
  total: number;
  index: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ width: number; left: number }>({
    width: 0,
    left: 0,
  });

  useEffect(() => {
    if (!containerRef.current || !total) return;

    const container = containerRef.current;
    const indicators = container.querySelectorAll(".indicator");

    const indicatorWidth = indicators[0].getBoundingClientRect().width;

    setRect({
      width: indicatorWidth,
      left:
        indicators[index].getBoundingClientRect().left -
        container.getBoundingClientRect().left,
    });
  }, [containerRef, total, index]);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 relative",
        className
      )}
      ref={containerRef}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 rounded-full bg-white/30 flex-1 indicator"
        />
      ))}
      <div
        className="absolute top-0 rounded-full bg-white transition-all duration-300 move-indicator h-1"
        style={{
          width: rect.width,
          left: rect.left,
        }}
      />
    </div>
  );
}
