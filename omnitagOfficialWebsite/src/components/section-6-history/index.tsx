import { cn } from '@udecode/cn'
import { useCallback, useEffect, useRef, useState } from "react";

import DynamicSvg from "../dynamic-svg";
import { CARDS, TCard } from "./data";

export default function Section({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [minIndex, setMinIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback(
    (index: number) => {
      if (!containerRef.current) return;

      const cards = containerRef.current.querySelectorAll(".card");
      cards[index + minIndex].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "end",
      });
    },
    [minIndex]
  );

  const handlePrev = () => {
    const index = Math.max(0, currentIndex - 1);

    if (index !== currentIndex) {
      scroll(index);
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    const index = Math.min(CARDS.length - 1 - minIndex, currentIndex + 1);

    if (index !== currentIndex) {
      scroll(index);
      setCurrentIndex(index);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const cards = container.querySelectorAll(".card");
    const containerWidth = container.getBoundingClientRect().width;
    const cardWidth = cards[0].getBoundingClientRect().width;

    setMinIndex(Math.max(Math.floor(containerWidth / cardWidth) - 1, 0));

    console.log(Math.floor(containerWidth / cardWidth));
  }, [containerRef]);

  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between lg:items-end">
        <h3 className="font-extrabold text-[32px] leading-10 text-[#1D1D1D] lg:font-bold lg:text-[56px] lg:leading-[68px] lg:tracking-tight">
          History
        </h3>
        <div className="w-[112px] flex items-center justify-between">
          <DynamicSvg
            iconName="arrow-right-circle"
            className={cn(
              "w-8 h-8 rotate-180 cursor-pointer",
              currentIndex === 0 ? "text-[#00000029]" : ""
            )}
            onClick={handlePrev}
          />
          <DynamicSvg
            iconName="arrow-right-circle"
            onClick={handleNext}
            className={cn(
              "w-8 h-8 cursor-pointer",
              currentIndex === CARDS.length - 1 - minIndex
                ? "text-[#00000029]"
                : ""
            )}
          />
        </div>
      </div>
      <div className="overflow-x-hidden mt-10 lg:mt-[60px]" ref={containerRef}>
        <div className="w-full snap-x overflow-x-scroll scrollbar-hide">
          <div className="flex items-stretch gap-6 flex-nowrap w-max lg:gap-x-10">
            {CARDS.map((card, index) => (
              <Card
                data={card}
                className="w-[240px] snap-start lg:w-[400px] card"
                key={index}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ data, className }: { data: TCard; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl p-10 border border-solid border-[#0000001F] lg:rounded-3xl",
        className
      )}
    >
      <h4 className="font-bold text-lg lg:text-2xl">{data.title}</h4>
      <p className="text-base tracking-wide mt-6">{data.des}</p>
    </div>
  );
}
