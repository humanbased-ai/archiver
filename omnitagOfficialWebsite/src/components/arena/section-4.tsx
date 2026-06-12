import { cn } from "@udecode/cn";
import React from "react";
import { motion, useInView, useAnimation, Variants } from "framer-motion";
import { useRef, useEffect } from "react";

import Cards from "./section-4/cards";

// --- CSS for Hardware Acceleration ---
const styles = `
  .will-change-transform {
    will-change: transform, opacity;
  }
`;

// --- 动画变体 ---
const ELEGANT_EASE = [0.83, 0, 0.17, 1];

const sectionRootVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const textRevealVariant: Variants = {
  hidden: { y: "110%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: { duration: 1.2, ease: ELEGANT_EASE },
  },
};

const fadeUpVariant: Variants = {
  hidden: { y: 50, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 1.2, ease: ELEGANT_EASE },
  },
};

export default function Section() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <>
      <style>{styles}</style>
      <motion.div
        ref={sectionRef}
        className="section section-box py-[60px] lg:snap-start lg:pb-[80px] lg:pt-[160px]"
        initial="hidden"
        animate={controls}
        variants={sectionRootVariants}
      >
        <div className="lg:flex lg:items-end lg:justify-between">
          <div className="overflow-hidden">
            <motion.h2
              className="text-[32px] font-bold leading-none will-change-transform lg:w-[900px]"
              variants={textRevealVariant}
            >
              Safeguard Fairness{" "}
              <span className="text-2xl lg:text-[32px]">
                with Transparency and Immutability empowered by Blockchain Technology
              </span>
            </motion.h2>
          </div>
          <motion.div className="will-change-transform" variants={fadeUpVariant}>
            <Buttons className="" />
          </motion.div>
        </div>

        <motion.div className="will-change-transform" variants={fadeUpVariant}>
          <Cards />
        </motion.div>

        <motion.div className="will-change-transform" variants={fadeUpVariant}>
          <Links className="" />
        </motion.div>
      </motion.div>
    </>
  );
}

// --- Buttons 组件增加悬停效果 ---
function Buttons({ className }: { className?: string }) {
  const handleContributeClick = () => {
    window.open(" https://app.codatta.io/arena", "_blank");
  };
  const handleAddClick = () => {
    window.open(
      "https://docs.google.com/forms/d/e/1FAIpQLSeUpTiLjW6MOiPeIk7AWaLwRKjX7bqwN1oQJRmMgfD7_Sx6RQ/viewform",
      "_blank",
    );
  };

  return (
    <div
      className={cn(
        "mt-6 flex h-[42px] items-stretch justify-between gap-3 text-center leading-[42px] lg:h-auto lg:gap-5",
        className,
      )}
    >
      <motion.button
        onClick={handleAddClick}
        className="h-[42px] flex-1 cursor-pointer text-nowrap rounded-lg bg-black px-3 text-sm font-semibold tracking-tight text-white lg:h-[56px] lg:rounded-full lg:px-6 lg:text-base lg:leading-[56px]"
        whileHover={{ scale: 1.05, y: -4, transition: { type: "spring", stiffness: 300 } }}
        whileTap={{ scale: 0.95 }}
      >
        Add Your Models
      </motion.button>
      <motion.button
        onClick={handleContributeClick}
        className="h-[42px] flex-1 cursor-pointer text-nowrap rounded-lg bg-white px-3 text-sm font-semibold tracking-tight text-black shadow-sm lg:h-[56px] lg:rounded-full lg:px-6 lg:text-base lg:leading-[56px]"
        whileHover={{ scale: 1.05, y: -4, transition: { type: "spring", stiffness: 300 } }}
        whileTap={{ scale: 0.95 }}
      >
        Start to Contribute
      </motion.button>
    </div>
  );
}

const links = [
  {
    text: "LMArena: most cited leaderboard",
    href: "https://app.codatta.io/arena/leaderboard",
  },
  {
    text: "XBench: measure the frontier capability",
    href: "https://xbench.org",
  },
  {
    text: "Openrouter LLM Ranking: AI developers' choices by actual inference volume",
    href: "https://openrouter.ai/rankings",
  },
];

// --- Links 组件增加悬停效果 ---
function Links({ className }: { className?: string }) {
  return (
    <div className={cn("mt-10 lg:mt-[74px] lg:flex lg:items-center lg:gap-4", className)}>
      <h3 className="text-xl font-bold leading-none">More Leaderboard:</h3>
      <ul className="mt-4 space-y-3 text-sm lg:mt-0 lg:flex lg:items-center lg:gap-3 lg:space-y-0">
        {links.map((link, index) => (
          <React.Fragment key={index}>
            <motion.li whileHover={{ y: -2 }} className="origin-left">
              <a
                href={link.href}
                className="leading-[22px] text-[#404049] underline transition-colors duration-300 hover:text-black"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.text}
              </a>
            </motion.li>
            {index !== links.length - 1 && (
              <li className="hidden lg:block">
                <span className="mx-2 text-[#404049]">|</span>
              </li>
            )}
          </React.Fragment>
        ))}
      </ul>
    </div>
  );
}
