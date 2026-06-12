import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "framer-motion";

// Import SVGs - using original components directly as requested
import OriginalUpTriangleIcon from "@/assets/crypto/up-triangel-icon.svg?react";
import OriginalImg1 from "@/assets/crypto/section-4-1.svg?react";
import OriginalImg2 from "@/assets/crypto/section-4-2.svg?react";
import OriginalImg3 from "@/assets/crypto/section-4-3.svg?react";

// --- Animation Variants (Same as previously defined) ---
const SMOOTH_EASE = [0.22, 1, 0.36, 1];

const sectionRootVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const partContainerVariant: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: SMOOTH_EASE,
      staggerChildren: 0.15,
    },
  },
};

const groupWithStaggeredItemsVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: SMOOTH_EASE,
      staggerChildren: 0.15, // Stagger children (image blocks)
    },
  },
};

const contentItemVariant: Variants = {
  // For paragraph and button
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: SMOOTH_EASE },
  },
};

const imageVariant: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.7, ease: SMOOTH_EASE },
  },
};

const prominentTitleContainerVariant: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: SMOOTH_EASE,
      staggerChildren: 0.15,
    },
  },
};

const titleLineVariant: Variants = {
  hidden: { opacity: 0, y: 20, skewY: 2 },
  visible: {
    opacity: 1,
    y: 0,
    skewY: 0,
    transition: { duration: 0.6, ease: SMOOTH_EASE },
  },
};
// --- End of Animation Variants ---

export default function Section() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.15 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    } else {
      controls.start("hidden");
    }
  }, [isInView, controls]);

  const onClickContribute = () => {
    console.log("Navigate to contribute page/action");
    window.open("https://app.codatta.io/app", "_blank");
  };

  return (
    <motion.div
      ref={sectionRef}
      className="section section-box py-[60px] lg:snap-start lg:pb-[80px] lg:pt-[160px]"
      initial="hidden"
      animate={controls}
      variants={sectionRootVariants}
    >
      <motion.div variants={prominentTitleContainerVariant}>
        <motion.h1
          variants={titleLineVariant}
          className="text-[40px] font-bold leading-none tracking-tighter lg:text-[48px]"
        >
          Integrated with CipherOwl
        </motion.h1>
        <motion.h3 variants={titleLineVariant} className="mt-1 text-2xl font-bold leading-[1.1] tracking-tighter">
          Community-Powered Tooling for Scalable, Verified Intelligence.
        </motion.h3>
      </motion.div>

      <motion.div variants={partContainerVariant} className="lg:mt-6 lg:flex lg:items-stretch lg:justify-between">
        <motion.p
          variants={contentItemVariant}
          className="mt-6 text-base tracking-tighter text-[#404049] lg:mt-0 lg:w-[790px]"
        >
          From open submission to multi-layered verification, CipherOwl bridges contributors and institutions – enabling
          trust in every label and adoption across CEXs, DeFi, banks, and public agencies.
        </motion.p>
        <motion.button
          variants={contentItemVariant}
          className="mt-6 flex w-full shrink-0 items-center justify-center gap-[10px] rounded-full bg-black py-3 text-base font-semibold leading-7 text-white lg:mt-0 lg:w-[224px]"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15 }}
          onClick={onClickContribute}
        >
          <OriginalUpTriangleIcon />
          Start to Contribute
        </motion.button>
      </motion.div>

      {/* Main Image Layout Container */}
      <motion.div
        variants={partContainerVariant}
        className="mt-[60px] lg:mt-[80px] lg:flex lg:items-stretch lg:justify-between lg:gap-10"
      >
        <motion.div
          variants={imageVariant}
          className="w-full overflow-x-auto lg:w-auto lg:overflow-x-visible" // Classes from original MotionImg1 applied here
        >
          <OriginalImg1 className="" /> {/* Ensure image fills its animated parent */}
        </motion.div>

        <motion.div
          variants={groupWithStaggeredItemsVariant} // This group animates and staggers the two image blocks below
          className="mt-[60px] lg:mt-3 lg:flex lg:flex-col lg:justify-between"
        >
          <motion.div
            variants={imageVariant} // Changed from contentItemVariant to imageVariant
            className="aspect-[342/178] max-w-full"
          >
            <OriginalImg2 className="size-full" />
          </motion.div>
          <motion.div
            variants={imageVariant} // Changed from contentItemVariant to imageVariant
            className="mt-4 aspect-[342/229] max-w-full lg:mt-0"
          >
            <OriginalImg3 className="size-full" />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
