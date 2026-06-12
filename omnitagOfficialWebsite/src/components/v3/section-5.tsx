import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "motion/react";

import Img1 from "@/assets/v3/section-5-1.svg?react";
// import Img1Pc from "@/assets/v3/section-5-1-pc.svg?react";
import Img1Pc from "@/components/v3/effects/section-5-1-pc";

import { useSplitTextAnimation } from "@/hooks/useSplitTextAnimation";

const S5_SMOOTH_EASE_OUT = [0.33, 1, 0.68, 1]; // easeOutQuint

// Main container for the section, orchestrates direct children
const s5_sectionContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Stagger title, paragraph, and image-content row
      delayChildren: 0.1,
    },
  },
};

// For the main H3 title (works with useSplitTextAnimation)
const s5_titleVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: S5_SMOOTH_EASE_OUT,
    },
  },
};

const s5_paragraphVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: S5_SMOOTH_EASE_OUT,
    },
  },
};

// For the row containing the image and Part1
const s5_imageContentRowVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: S5_SMOOTH_EASE_OUT,
      staggerChildren: 0.25, // Stagger the image and Part1's UL
    },
  },
};

const s5_imageVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.9,
      ease: S5_SMOOTH_EASE_OUT,
    },
  },
};

// For Part1's UL (the list container)
const s5_part1ListVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Stagger its LI card children
    },
  },
};

// For each card (LI) in Part1 - aiming for a "valuable" reveal
const s5_part1CardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: S5_SMOOTH_EASE_OUT,
      staggerChildren: 0.1, // Stagger label (if present), title, and description
    },
  },
};

// For the special label like [Problem]
const s5_part1CardLabelVariants: Variants = {
  hidden: { opacity: 0, x: -15 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: S5_SMOOTH_EASE_OUT },
  },
};

// For text content (h4, p) within a Part1 card
const s5_part1CardTextContentVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: S5_SMOOTH_EASE_OUT },
  },
};

export default function Section() {
  const { ref: splitTextRef } = useSplitTextAnimation<HTMLDivElement>(".section-5-title");
  const sectionRef = useRef<HTMLDivElement>(null); // This ref is for the main section's visibility
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
      ref={sectionRef} // sectionRef for useInView is on the main orchestrating parent
      className="section section-box lg:snap-start lg:pb-[80px] lg:pt-[160px]"
      initial="hidden"
      animate={controls}
      variants={s5_sectionContainerVariants}
    >
      <div ref={splitTextRef}>
        <motion.h2
          className="section-5-title text-[68px] font-bold leading-[96px] tracking-tighter"
          variants={s5_titleVariants}
        >
          Royalty-based Payment
        </motion.h2>
      </div>

      <motion.p className="mt-6 text-base tracking-tight text-[#404049]" variants={s5_paragraphVariants}>
        Data is asset, generating future returns.
      </motion.p>

      <motion.div
        className="items-end justify-between lg:-mt-[80px] lg:flex lg:gap-[80px]"
        variants={s5_imageContentRowVariants}
      >
        <motion.div variants={s5_imageVariants}>
          <Img1 className="mt-[60px] w-full lg:hidden" role="img" aria-label="Specialized AI,Company,Client" />
          <Img1Pc className="hidden lg:block" aria-label="Specialized AI,Company,Client" />
        </motion.div>
        <Part1 />
      </motion.div>
    </motion.div>
  );
}

const Part1Data = [
  {
    label: <div className="text-xl font-bold leading-[25px] text-[#FCA800]">[Problem]</div>,
    title: "AI earns forever. People get paid once.",
    des: (
      <>
        AI earns forever. People get paid once.
        <br />
        In today's ecosystem, domain experts and data contributors fuel AI's long-term value but are only rewarded up
        front, missing out on the continuous returns their knowledge generates.
      </>
    ),
  },
  {
    title: "Royalty-based Payment",
    des: "Unlock the innovation, built for super innovative lean teams. Advanced Human Intelligence is no longer the privilege of big tech companies.",
  },
  {
    // No label for this item
    title: "Aligned Interests Between AI and Human",
    des: "Human knowledge powers specialization. AI systems subscribe to that knowledge and return value through ongoing royalties, aligning earnings with impact, and incentives with contribution.",
  },
];

function Part1() {
  return (
    <motion.ul className="mt-[60px] space-y-6 lg:mt-0 lg:space-y-10" variants={s5_part1ListVariants}>
      {Part1Data.map((item) => (
        <motion.li
          key={item.title}
          variants={s5_part1CardVariants} // Each card uses this variant, which staggers its internal content
        >
          {item.label && ( // Conditionally render the label
            <motion.div variants={s5_part1CardLabelVariants} className="mb-2">
              {item.label}
            </motion.div>
          )}
          <motion.h4 className="text-xl font-bold text-black" variants={s5_part1CardTextContentVariants}>
            {item.title}
          </motion.h4>
          <motion.p
            className="mt-4 text-sm leading-[22px] text-[#77777D] lg:mt-7 lg:text-xs lg:leading-5"
            variants={s5_part1CardTextContentVariants}
          >
            {item.des}
          </motion.p>
        </motion.li>
      ))}
    </motion.ul>
  );
}
