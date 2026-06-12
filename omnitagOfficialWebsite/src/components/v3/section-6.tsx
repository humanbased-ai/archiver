import { cn } from "@udecode/cn";
import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "motion/react"; // 假设这是 "framer-motion"

import Img1 from "@/assets/v3/section-6-1.svg?react";
import Img2 from "@/assets/v3/section-6-2.svg?react";
import Img3 from "@/assets/v3/section-6-3.svg?react";
import Img4 from "@/assets/v3/section-6-4.svg?react";
import Img1Pc from "@/assets/v3/section-6-1-pc.svg?react";

import { useSplitTextAnimation } from "@/hooks/useSplitTextAnimation";
import { useWindowResize } from "@/hooks/useWindowResize";

const S6_SMOOTH_EASE_OUT = [0.33, 1, 0.68, 1]; // easeOutQuint

// Main container for the section, orchestrates direct children
const s6_sectionContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.9, // <<< 修改这里：确保标题先完全出现
      delayChildren: 0.1,
    },
  },
};

// For title elements (h2, h3), works with useSplitTextAnimation
const s6_titleVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: S6_SMOOTH_EASE_OUT,
      delay: custom * 0.1, // Internal delay for multiple title parts if custom is used
    },
  }),
};

const s6_paragraphVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: S6_SMOOTH_EASE_OUT,
      // Timing managed by parent s6_sectionContainerVariants' staggerChildren
    },
  },
};

// For the row containing the image and List
const s6_imageContentRowVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: S6_SMOOTH_EASE_OUT,
      staggerChildren: 0.25, // Stagger the image and List's UL
    },
  },
};

const s6_imageVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.9,
      ease: S6_SMOOTH_EASE_OUT,
    },
  },
};

// For List's UL (the list container)
const s6_listULVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Stagger its LI card children
    },
  },
};

// For each card (LI) in List - "Structured Reveal"
const s6_listItemCardVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: S6_SMOOTH_EASE_OUT,
      staggerChildren: 0.1, // Stagger image, label, title, description within the card
    },
  },
};

const s6_listItemImageVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: S6_SMOOTH_EASE_OUT },
  },
};

const s6_listItemTextContentVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: S6_SMOOTH_EASE_OUT },
  },
};

export default function Section() {
  const { ref: splitTextRef } = useSplitTextAnimation<HTMLDivElement>(".section-6-title");
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 });
  const controls = useAnimation();
  const windowSize = useWindowResize();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    } else {
      controls.start("hidden");
    }
  }, [isInView, controls]);

  return (
    <motion.div // Main section container orchestrates its direct children
      ref={sectionRef}
      className="section section-box bg-warm py-[60px] lg:snap-start lg:pb-[80px] lg:pt-[160px]"
      initial="hidden"
      animate={controls}
      variants={s6_sectionContainerVariants}
    >
      {/* 标题组 */}
      <motion.div variants={s6_titleVariants} ref={splitTextRef}>
        {windowSize.width < 1024 ? (
          <h2>
            <motion.div
              className="section-6-title text-[60px] font-bold leading-[1em]"
              custom={0}
              variants={s6_titleVariants}
            >
              Privacy-Preserving
            </motion.div>
            <motion.div
              className="section-6-title mt-3 text-[48px] font-bold leading-[1em]"
              custom={1} // This creates a 0.1s delay for this h3 relative to the h2 above
              variants={s6_titleVariants}
            >
              Transparency
            </motion.div>
          </h2>
        ) : (
          <motion.h2
            className="section-6-title text-center text-[60px] font-bold leading-[1em]"
            // No custom prop needed here, or custom={0} if explicit
            variants={s6_titleVariants}
          >
            Privacy-Preserving Transparency
          </motion.h2>
        )}
      </motion.div>

      {/* 段落 */}
      <motion.p
        className="mt-6 bg-[#0000000F] p-4 text-base tracking-tight text-[#404049] lg:text-center"
        variants={s6_paragraphVariants}
      >
        Contributions are recorded on-chain, while data stays private — making knowledge traceable and ownable without
        revealing its content.
      </motion.p>

      {/* 图片和列表行 */}
      <motion.div
        className="flex-row-reverse items-end lg:mb-[80px] lg:mt-[100px] lg:flex lg:gap-[80px]"
        variants={s6_imageContentRowVariants}
      >
        <motion.div variants={s6_imageVariants}>
          <Img1
            className="mt-[60px] block lg:hidden"
            role="img"
            aria-label="Encrypted Data Payload @Hybrid Storage Solution"
          />
          <Img1Pc className="hidden lg:block" role="img" aria-label="Encrypted Data Payload @Hybrid Storage Solution" />
        </motion.div>
        <List className="flex-1" />
      </motion.div>
    </motion.div>
  );
}

const data = [
  {
    title: "Onchain Commitment",
    des: "Publicly records who contributed what and when — without revealing the actual data. Ensures attribution, auditability, and trust.",
    Img: Img2,
  },
  {
    title: "Encrypted Payload",
    des: "The real data stays hidden, encrypted off-chain. It's only accessible to authorized parties through programmable access rules.",
    Img: Img3,
  },
  {
    title: "Hybrid Storage with Smart Contract Access",
    des: "Combines on-chain integrity with off-chain efficiency. Access is enforced through smart contracts — enabling secure and flexible data usage across use cases.",
    Img: Img4,
  },
];

function List({ className }: { className?: string }) {
  return (
    <motion.ul className={cn("mt-[60px] space-y-6 pb-10 lg:mt-0 lg:pb-0", className)} variants={s6_listULVariants}>
      {data.map((item) => (
        <motion.li key={item.title} className="items-end lg:flex lg:gap-9" variants={s6_listItemCardVariants}>
          <motion.div variants={s6_listItemImageVariants}>
            <item.Img className="size-[148px] lg:size-[138px]" />
          </motion.div>
          <div className="mt-2 flex-1 lg:mt-0">
            <motion.h4 className="relative text-xl font-bold lg:leading-5" variants={s6_listItemTextContentVariants}>
              {item.title}
            </motion.h4>
            <motion.p
              className="mt-4 text-sm leading-[22px] text-[#77777D] lg:mt-7 lg:text-xs lg:leading-5"
              variants={s6_listItemTextContentVariants}
            >
              {item.des}
            </motion.p>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}
