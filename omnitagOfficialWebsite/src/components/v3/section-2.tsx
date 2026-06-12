import { cn } from "@udecode/cn";
import { useState, useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "motion/react"; // Switched to framer-motion

import TimelinePc from "@/components/v3/blockchain-visualization/index";
import Timeline from "@/assets/v3/section-2-kp-line.svg?react";

import { useSplitTextAnimation } from "@/hooks/useSplitTextAnimation";

const SMOOTH_EASE = [0.22, 1, 0.36, 1];

// Main container for the whole section, orchestrates its direct children
const sectionContainerVariants: Variants = {
  hidden: { opacity: 0 }, // Can be just a passthrough if children handle all visuals
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Time between direct children of the section starting
      delayChildren: 0.1, // Small delay before the first child starts
    },
  },
};

const titleBlockEntryVariant: Variants = {
  hidden: { opacity: 0, y: 10 }, // Subtle container animation
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: SMOOTH_EASE },
  },
};

// For the paragraph
const paragraphEntryVariant: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: SMOOTH_EASE },
  },
};

// For the timeline SVG container
const timelineEntryVariant: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.9, ease: SMOOTH_EASE },
  },
};

// For the wrapper around Card1, separator, and Card2
const cardsRowVariant: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Stagger Card1, separator, Card2
    },
  },
};

// For the separator line between cards
const separatorVariant: Variants = {
  hidden: { opacity: 0, scaleY: 0 },
  visible: {
    opacity: 1,
    scaleY: 1,
    transition: { duration: 0.6, ease: SMOOTH_EASE },
  },
};

// For the root of Card1 and Card2
const cardRootVariant: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: SMOOTH_EASE,
      staggerChildren: 0.1, // Stagger children within the card
    },
  },
};

// For individual content items within a card (h3, li, p, content-box div)
const cardContentItemVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: SMOOTH_EASE },
  },
};

export default function Section() {
  const { ref: splitTextRef } = useSplitTextAnimation<HTMLDivElement>(".section-2-title");
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    } else {
      controls.start("hidden"); // Reset animations when out of view
    }
  }, [isInView, controls]);

  return (
    // Main section container is now a motion component
    <motion.div
      ref={sectionRef}
      className="py-[60px] lg:bg-warm lg:py-0"
      initial="hidden"
      animate={controls}
      variants={sectionContainerVariants}
    >
      <div className="lg:section-box lg:snap-start lg:pb-[80px] lg:pt-[160px]">
        <div className="">
          <h2 ref={splitTextRef} className="section lg:px-0">
            <motion.div
              variants={titleBlockEntryVariant}
              className="section-2-title text-[60px] font-bold leading-[1em] tracking-tight lg:text-[68px] lg:leading-[96px]"
            >
              Onchain
            </motion.div>
            <motion.div
              variants={titleBlockEntryVariant} // Same variant, will be staggered by parent
              className="section-2-title text-[48px] font-bold leading-[1.1] tracking-tight lg:text-[60px] lg:leading-[76px]"
            >
              Commitment Lineage
            </motion.div>
          </h2>
          <motion.p
            variants={paragraphEntryVariant}
            className="section mt-6 text-base tracking-tight text-[#404049] lg:px-0"
          >
            <div className="bg-[#0000000F] p-4">
              Transparent Traceability for Knowledge Data Quality, Contributor Responsibility, and Fair Rewards.
            </div>
          </motion.p>
          <motion.div
            variants={timelineEntryVariant}
            className="mt-[60px] h-[180px] w-full overflow-hidden lg:mt-6 lg:h-[350px]"
          >
            <div className="flex h-full animate-timeline flex-nowrap lg:hidden">
              <Timeline className="h-full shrink-0" />
            </div>
            <TimelinePc className="mx-auto hidden font-sora lg:block" />
          </motion.div>
        </div>
      </div>

      <div className="lg:section-box lg:snap-start lg:pb-[80px] lg:pt-[160px]">
        <motion.div
          variants={cardsRowVariant}
          className="section mt-[60px] items-stretch lg:my-0 lg:flex lg:justify-between"
        >
          <Card1 className="lg:flex lg:w-[520px] lg:flex-col" /> {/* Removed animationControls, variants will handle */}
          <motion.div
            variants={separatorVariant}
            className="my-10 h-auto w-px origin-center self-stretch bg-[#00000014] lg:mx-[80px] lg:my-0 lg:h-auto lg:w-px"
          />
          <Card2 className="flex-1" /> {/* Removed animationControls */}
        </motion.div>
      </div>
    </motion.div>
  );
}

const card1Data: { tab: React.ReactNode; title: string; des: string }[] = [
  // ... (data remains the same)
  {
    tab: (
      <div className="break-words">
        Knowledge
        <br />
        Provider (KP)
      </div>
    ),
    title: "Knowledge Provider (KP)",
    des: "Provides structured knowledge that goes beyond basic labeling—offering reasoning, evidence, and domain expertise. These contributions supply advanced intelligence to improve foundational AI models, helping them evolve from generalists to specialists.",
  },
  {
    tab: (
      <div className="break-words">
        Knowledge
        <br />
        Verifier (KV)
      </div>
    ),
    title: "Knowledge Verifier (KV)",
    des: "Reviews and verifies the knowledge provided — assessing reasoning, checking evidence, and ensuring accuracy. KVs can be domain experts or specialized AI agents, playing a key role in boosting data quality and trust.",
  },
];

// Card1 Component
function Card1({ className }: { className?: string }) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  return (
    <motion.div className={className} variants={cardRootVariant}>
      <motion.h3 variants={cardContentItemVariant} className="text-2xl font-bold">
        [ Role ]
      </motion.h3>
      <motion.ul
        variants={cardContentItemVariant}
        className="mt-6 flex items-center justify-between gap-8 text-base lg:mt-9"
      >
        {card1Data.map((item, index) => (
          <motion.li
            key={"section-2-card-tab-" + index}
            variants={cardContentItemVariant} // Will be staggered after the H3 above by cardRootVariant
            className={cn(
              "flex-1 cursor-pointer rounded-full py-2 text-center transition-all",
              activeIndex === index ? "bg-[#FCA800] font-bold" : "",
            )}
            onClick={() => setActiveIndex(index)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {item.tab}
          </motion.li>
        ))}
      </motion.ul>
      <motion.div
        className="content-box mt-6 p-6 shadow-[0_8px_12px_0_rgba(0,0,0,0.12)] lg:flex-1 lg:px-12 lg:py-10"
        variants={cardContentItemVariant}
      >
        <motion.h4 variants={cardContentItemVariant} className="text-base font-bold">
          {card1Data[activeIndex].title}
        </motion.h4>
        <motion.p
          variants={cardContentItemVariant}
          className="mt-4 text-sm leading-[22px] text-[#77777D] lg:mt-10 lg:text-xs lg:leading-5"
        >
          {card1Data[activeIndex].des}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

const card2Data = [
  {
    title: "Verification",
    des: "A critical step led by human experts or specialized AI agents. This process checks attached evidence, evaluates reasoning, and identifies errors in submitted knowledge to ensure high-quality, trustworthy data.",
  },
  {
    title: "Staking As Confidence",
    des: "An optional but powerful economic security layer. Knowledge Providers can stake tokens to signal confidence in their contributions. Misaligned or low-quality claims risk slashing. This feature—co-developed with EigenLayer—reinforces trust without compromising privacy.",
  },
  {
    title: "Majority Voting",
    des: "Aggregates diverse perspectives from multiple independent Knowledge Providers. By factoring in contributor reputation, this consensus mechanism reliably boosts data quality through distributed validation.",
  },
];

// Card2 Component
function Card2({ className }: { className?: string /* animationControls no longer needed */ }) {
  return (
    <motion.div className={className} variants={cardRootVariant}>
      <motion.h3 variants={cardContentItemVariant} className="text-2xl font-bold">
        [ Quality ]
      </motion.h3>
      <ul className="mt-6 space-y-6 text-base lg:mt-9 lg:space-y-8">
        {card2Data.map((item, index) => (
          <motion.li key={"section-2-card-" + index} variants={cardContentItemVariant}>
            <motion.h4 variants={cardContentItemVariant} className="text-base font-bold">
              {item.title}
            </motion.h4>
            <motion.p
              variants={cardContentItemVariant}
              className="mt-4 text-sm leading-[22px] text-[#77777D] lg:mt-5 lg:text-xs lg:leading-5"
            >
              {item.des}
            </motion.p>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
