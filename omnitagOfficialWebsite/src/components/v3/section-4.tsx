import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "framer-motion";

import Img from "@/assets/v3/section-4-1.svg?react";
import ImgPc from "@/components/v3/effects/section-4-1-pc";

import { useSplitTextAnimation } from "@/hooks/useSplitTextAnimation";

const S4_SMOOTH_EASE_OUT = [0.33, 1, 0.68, 1]; // easeOutQuint

// Main container for the section, orchestrates direct children
const s4_sectionContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Staggers direct children like titles, paragraph, and image-content row
      delayChildren: 0.1,
    },
  },
};

// For each span in the title, complementing useSplitTextAnimation
const s4_titleSpanVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: S4_SMOOTH_EASE_OUT,
      delay: custom * 0.1, // Internal delay between title spans
    },
  }),
};

const s4_paragraphVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: S4_SMOOTH_EASE_OUT,
      // Timing managed by parent s4_sectionContainerVariants' staggerChildren
    },
  },
};

// For the row containing the image and Part1
const s4_imageContentRowVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: S4_SMOOTH_EASE_OUT,
      staggerChildren: 0.25, // Staggers the image and Part1's UL
    },
  },
};

const s4_imageVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.9,
      ease: S4_SMOOTH_EASE_OUT,
    },
  },
};

// For Part1's UL (the list container)
const s4_part1ListVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Staggers its LI card children
    },
  },
};

// For each card (LI) in Part1
const s4_part1CardVariants: Variants = {
  hidden: { opacity: 0, y: 25, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: S4_SMOOTH_EASE_OUT,
      staggerChildren: 0.1, // Staggers title and description within the card
    },
  },
};

// For content items (h4, p) within a Part1 card
const s4_part1CardContentVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: S4_SMOOTH_EASE_OUT },
  },
};

export default function Section() {
  const { ref: splitTextRef } = useSplitTextAnimation<HTMLDivElement>(".section-4-title");
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    } else {
      controls.start("hidden");
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={sectionRef}
      className="section section-box pb-[60px] lg:snap-start lg:pb-[80px] lg:pt-[160px]"
      initial="hidden"
      animate={controls}
      variants={s4_sectionContainerVariants}
    >
      <h3 className="text-[48px] font-bold leading-[1em] tracking-tighter lg:text-[60px]" ref={splitTextRef}>
        <motion.span
          className="section-4-title"
          custom={0} // For s4_titleSpanVariants' internal delay, not direct parent stagger index
          variants={s4_titleSpanVariants}
        >
          Every model decision
        </motion.span>{" "}
        <motion.span className="section-4-title lg:block lg:text-[48px]" custom={1} variants={s4_titleSpanVariants}>
          reflects past knowledge
        </motion.span>
      </h3>

      <motion.p className="mt-6 text-base tracking-tight text-[#404049]" variants={s4_paragraphVariants}>
        It enables tracing each inference back to the data behind it — ensuring fair credit at the inference level.
      </motion.p>

      <motion.div className="items-end lg:mt-[120px] lg:flex lg:gap-[80px]" variants={s4_imageContentRowVariants}>
        <motion.div variants={s4_imageVariants}>
          <Img className="mt-[60px] w-full lg:hidden" role="img" aria-label="Specialized AI,Data Attribution,Client" />
          <ImgPc className="hidden lg:block" />
        </motion.div>
        <Part1 />
      </motion.div>
    </motion.div>
  );
}

const Part1Data = [
  {
    title: "Flexible Payout Options",
    des: "Supports multiple reward types — stablecoins, liquidity tokens, or royalty-based payments — adaptable to diverse business models and deployment environments.",
  },
  {
    title: "Impact-Based Rewards",
    des: "Beyond access or visibility, contributors earn based on how their knowledge powers real-world outcomes. Rewards are distributed per actual inference impact — measured and attributed on-chain.",
  },
];

function Part1() {
  // Entry animation is handled by parent components and variants.
  return (
    <motion.ul className="mt-[60px] space-y-6 lg:mt-0 lg:space-y-10" variants={s4_part1ListVariants}>
      {Part1Data.map((item) => (
        <motion.li key={item.title} variants={s4_part1CardVariants}>
          <motion.h4 className="text-xl font-bold text-black" variants={s4_part1CardContentVariants}>
            {item.title}
          </motion.h4>
          <motion.p
            className="mt-4 text-sm leading-[22px] text-[#77777D] lg:mt-7 lg:text-xs lg:leading-5"
            variants={s4_part1CardContentVariants}
          >
            {item.des}
          </motion.p>
        </motion.li>
      ))}
    </motion.ul>
  );
}
