import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "framer-motion";

// Import your SVG components for Section 2
import Img1 from "@/assets/crypto/section-2-1.svg?react";
import Img2 from "@/assets/crypto/section-2-2.svg?react";
import Img3 from "@/assets/crypto/section-2-3.svg?react";
import Img1Pc from "@/assets/crypto/section-2-1-pc.svg?react";
import Img2Pc from "@/assets/crypto/section-2-2-pc.svg?react";

// --- Reusable Animation Variants (from previous example) ---
const SMOOTH_EASE = [0.22, 1, 0.36, 1];

const sectionRootVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Adjusted stagger for this section's children
      delayChildren: 0.1,
    },
  },
};

const titleTextEntryVariant: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: SMOOTH_EASE },
  },
};

const paragraphTextEntryVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: SMOOTH_EASE },
  },
};

const partContainerVariant: Variants = {
  // Used for the image group containers
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: SMOOTH_EASE,
      staggerChildren: 0.2, // Stagger images within their container
    },
  },
};

const imageVariant: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.8, ease: SMOOTH_EASE },
  },
};

// --- Section 2 Component ---
export default function Section() {
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
      className="section section-box py-[60px] lg:snap-start lg:pb-[80px] lg:pt-[160px]"
      initial="hidden"
      animate={controls}
      variants={sectionRootVariants}
    >
      <motion.h1
        variants={titleTextEntryVariant}
        className="text-5xl font-bold leading-[1.1] tracking-tighter lg:text-[60px]"
      >
        From Protocol to Practice:
      </motion.h1>
      <motion.h3 // Applying titleTextEntryVariant as it's a significant subheading
        variants={titleTextEntryVariant}
        className="text-2xl font-bold leading-none tracking-tighter lg:text-[48px]"
      >
        Defining Community-Driven Data Sourcing
      </motion.h3>
      <motion.p variants={paragraphTextEntryVariant} className="mt-6 text-base tracking-tighter text-[#404049]">
        CAA implements it with two distinct tracks: heuristic-based opinion and evidence-backed ground truth, to enhance
        quality and trust.
      </motion.p>

      {/* Mobile Images Container */}
      <motion.div
        variants={partContainerVariant} // This container animates in and staggers its image children
        className="mt-10 space-y-10 lg:hidden"
      >
        <motion.div variants={imageVariant}>
          <Img1 className="m-auto w-full" />
        </motion.div>
        <motion.div variants={imageVariant} className="aspect-[342/144] overflow-x-auto">
          <Img2 className="h-full" />
        </motion.div>
        <motion.div variants={imageVariant}>
          <Img3 className="m-auto w-full" />
        </motion.div>
      </motion.div>

      {/* Desktop Images Container */}
      <motion.div
        variants={partContainerVariant} // This container animates in and staggers its image children
        className="mt-20 hidden items-start justify-between gap-20 lg:flex"
      >
        <motion.div variants={imageVariant}>
          <Img1Pc />
        </motion.div>
        <motion.div variants={imageVariant}>
          <Img2Pc />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
