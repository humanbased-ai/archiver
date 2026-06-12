import { useState, useRef, useEffect, useCallback } from "react";
import { motion, Variants } from "framer-motion";

// --- PC端卡片动画 ---
const ELEGANT_EASE = [0.83, 0, 0.17, 1];

const pcCardsContainerVariant: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // 同样减小延迟，让卡片入场更连贯
    },
  },
};

const pcCardItemVariant: Variants = {
  hidden: { y: 60, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 1.2,
      ease: ELEGANT_EASE,
    },
  },
};

// TypeScript Interfaces (保持不变)
interface CardItem {
  title: string;
  des: string;
}

interface Card {
  label: string;
  title: string;
  items: CardItem[];
}

const cards: Card[] = [
  {
    label: "Challenge01",
    title: "Gaming the Leaderboard",
    items: [
      {
        title: "Problem:",
        des: "Models are often fine-tuned just to climb the ranks, not to serve real users well.",
      },
      {
        title: "AAA’s Approach:",
        des: "We use real user feedback in dynamic tasks—not fixed benchmarks. Our evaluation happens live, not in labs, so models are ranked for how they actually perform, not how well they test.",
      },
    ],
  },
  {
    label: "Challenge02",
    title: "Unfair Feedback Manipulation",
    items: [
      {
        title: "Problem:",
        des: "User feedback is falsified or manipulated, undermining leaderboard fairness. like sybil attach.",
      },
      {
        title: "AAA’s Approach:",
        des: "Reputation system prevent forgery and duplicate submissions. Smart contracts apply decentralized weight allocation to minimize manipulation and ensure equitable feedback.",
      },
    ],
  },
  {
    label: "Challenge03",
    title: "Lack of Model Transparency & User Trust",
    items: [
      {
        title: "Problem:",
        des: "Model origins are untraceable and may be tampered with, making the leaderboard unreliable. Large companies will submit multiple models to dominate the leaderboard.",
      },
      {
        title: "AAA’s Approach:",
        des: "Publicly record model metadata on the blockchain. Use hash verification to ensure model output consistency. To address submitting multiple models, we control through launch reviews and will add institution-level aggregation in future.",
      },
    ],
  },
];

// MobileCards 组件保持不变
const MobileCards = ({ data }: { data: Card[] }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const containerRef = useRef<HTMLUListElement | null>(null);
  const cardWidthRef = useRef<number>(0);
  const autoplayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoplay = useCallback(() => {
    if (autoplayIntervalRef.current) {
      clearInterval(autoplayIntervalRef.current);
    }
    autoplayIntervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % data.length);
    }, 6000);
  }, [data.length]);

  const stopAutoplay = () => {
    if (autoplayIntervalRef.current) {
      clearInterval(autoplayIntervalRef.current);
    }
  };

  useEffect(() => {
    if (data.length > 1) {
      startAutoplay();
    }
    return () => stopAutoplay();
  }, [data.length, startAutoplay]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      left: currentIndex * container.offsetWidth,
      behavior: "smooth",
    });

    const handleResize = () => {
      cardWidthRef.current = container.offsetWidth;
      container.scrollTo({
        left: currentIndex * cardWidthRef.current,
        behavior: "instant",
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [currentIndex]);

  const goToCard = (index: number): void => {
    setCurrentIndex(index);
    startAutoplay();
  };

  if (!data || data.length === 0) {
    return <div>No cards available.</div>;
  }

  return (
    <div className="mt-10 lg:hidden" onMouseEnter={stopAutoplay} onMouseLeave={startAutoplay}>
      <ul
        ref={containerRef}
        className="flex w-full snap-x snap-mandatory overflow-y-hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {data.map((card: Card, index: number) => {
          const isActive = currentIndex === index;
          return (
            <li key={`card-${index}`} className="w-full shrink-0 snap-center" aria-hidden={!isActive}>
              <div
                className={`transition-all duration-700 ease-in-out ${
                  isActive ? "translate-y-0 opacity-100" : "translate-y-4 opacity-50"
                }`}
              >
                <div className="rounded-sm bg-black p-4">
                  <span className="bg-[#FCA800] px-2 text-base font-semibold leading-8">{card.label}</span>
                  <h3 className="mt-[10px] text-lg font-bold leading-none text-white">{card.title}</h3>
                </div>
                <div className="mt-3">
                  <ul className="w-full space-y-6 bg-white p-4">
                    {card.items.map((item, itemIndex) => (
                      <li key={`card-item-${itemIndex}`}>
                        <h5 className="text-base font-bold leading-none">{item.title}</h5>
                        <p className="mt-3 text-xs leading-5 text-[#77777D]">{item.des}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {data.length > 1 && (
        <div className="mt-4 flex justify-center space-x-2">
          {data.map((_: Card, index: number) => (
            <button
              key={`nav-${index}`}
              aria-label={`Go to card ${index + 1}`}
              className={`h-1 w-[42px] rounded-full transition-colors duration-300 ${
                currentIndex === index ? "bg-black" : "bg-[#00000033] hover:bg-[#00000066]"
              }`}
              onClick={() => goToCard(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// PcCards 组件应用了动画
const PcCards = ({ data }: { data: Card[] }) => {
  return (
    <motion.div
      className="hidden rounded-sm border border-[#0000001F] px-6 pt-6 lg:mt-[80px] lg:block"
      variants={pcCardsContainerVariant}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <ul className="flex items-stretch gap-6">
        {data.map((card: Card, index: number) => {
          return (
            // 添加 will-change-transform 类以启用硬件加速
            <motion.li
              key={`card-${index}`}
              className="flex-1 shrink-0 will-change-transform"
              variants={pcCardItemVariant}
            >
              <div className="flex h-full flex-col">
                <div className="rounded-sm bg-black p-4">
                  <span className="bg-[#FCA800] px-2 text-base font-semibold leading-8">{card.label}</span>
                  <h3 className="mt-[10px] text-lg font-bold leading-none text-white">{card.title}</h3>
                </div>
                <div className="mt-3 flex-1 bg-white">
                  <ul className="w-full space-y-6 p-4">
                    {card.items.map((item, itemIndex) => (
                      <li key={`card-item-${itemIndex}`}>
                        <h5 className="text-base font-bold leading-none">{item.title}</h5>
                        <p className="mt-3 text-xs leading-5 text-[#77777D]">{item.des}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
};

const Cards = () => {
  return (
    <div>
      <MobileCards data={cards} />
      <PcCards data={cards} />
    </div>
  );
};

export default Cards;
