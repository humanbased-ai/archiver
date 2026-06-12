import ImgPc1 from "@/assets/arena/section-1-1-pc.jpg";
import Icon1 from "@/assets/arena/section-1-2-icon.svg?react";
import Icon2 from "@/assets/arena/section-1-3-icon.svg?react";
import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "framer-motion";

const ELEGANT_EASE = [0.83, 0, 0.17, 1];

const sectionRootVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeIn",
      staggerChildren: 0.2,
    },
  },
};

const textRevealVariant: Variants = {
  hidden: { y: "110%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: { duration: 1, ease: ELEGANT_EASE },
  },
};

const imageRevealVariant: Variants = {
  hidden: {
    opacity: 0,
    clipPath: "inset(20% 30% 20% 30%)",
    scale: 1.05,
  },
  visible: {
    opacity: 1,
    clipPath: "inset(0% 0% 0% 0%)",
    scale: 1,
    transition: {
      duration: 1.4,
      ease: ELEGANT_EASE,
    },
  },
};

const contentGroupVariant: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

export default function Section() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={sectionRef}
      className="section section-box lg:snap-start lg:pt-[80px]"
      initial="hidden"
      animate={controls}
      variants={sectionRootVariants}
    >
      <div className="overflow-hidden">
        <motion.h2
          variants={textRevealVariant}
          className="pt-[60px] text-[60px] font-bold leading-none lg:text-[68px] lg:leading-[96px]"
        >
          AI Agent Arena
        </motion.h2>
      </div>

      <div className="overflow-hidden">
        <motion.div variants={textRevealVariant} className="mt-6 bg-black p-4 text-base text-white lg:mt-3">
          Evalute AI Capability with Live Human Preference in a fair and decentralized system.
        </motion.div>
      </div>

      <motion.div className="mt-10 space-y-6 lg:flex lg:gap-[60px] lg:space-y-0" variants={contentGroupVariant}>
        <motion.div className="h-[456px] overflow-hidden lg:w-[808px] lg:shrink-0" variants={imageRevealVariant}>
          <div className="aspect-[808/456] h-full">
            <img src={ImgPc1} className="size-full object-contain" />
          </div>
        </motion.div>

        <motion.div variants={contentGroupVariant}>
          <div className="overflow-hidden">
            <motion.h4
              variants={textRevealVariant}
              className="h-[37px] border-l-4 border-black bg-[#00000014] px-4 text-base leading-[37px] lg:text-xl lg:leading-[37px]"
            >
              Benchmark
            </motion.h4>
          </div>
          <div className="overflow-hidden">
            <motion.p
              variants={textRevealVariant}
              className="mt-4 flex items-center gap-4 text-[#1C1C26] lg:mt-7 lg:text-base"
            >
              <Icon1 className="size-[44px] shrink-0" />
              <span>Measure the progress of foundational AI and Agents with real-world use-cases.</span>
            </motion.p>
          </div>
          <div className="overflow-hidden">
            <motion.p
              variants={textRevealVariant}
              className="mt-4 flex items-center gap-4 text-[#1C1C26] lg:mt-7 lg:text-base"
            >
              <Icon2 className="size-[44px] shrink-0" />
              Provides feedback data to guide targeted iteration.
            </motion.p>
          </div>
          <div className="overflow-hidden">
            <motion.h4
              variants={textRevealVariant}
              className="mt-6 h-[37px] border-l-4 border-black bg-[#00000014] px-4 text-base leading-[37px] lg:mt-[30px] lg:text-xl lg:leading-[37px]"
            >
              Development Philosophy
            </motion.h4>
          </div>
          <div className="overflow-hidden">
            <motion.p
              variants={textRevealVariant}
              className="mt-4 text-justify text-xs leading-[22px] text-[#77777D] lg:mt-[20px]"
            >
              The core value of any leaderboard is to offer trustworthy comparison. This trust comes from fairness,
              transparency, immutable results, and responsible voting. We built AI Agent Arena (AAA) on blockchain to
              make every submission and result verifiable—open to audit and resistant to tampering. To protect the
              integrity of voting, we avoid financial rewards that could distort honest feedback. AAA is a non-profit,
              experimental project led by a small team focused on getting the basics right. Rather than competing with
              other leaderboards, we see our work as a complementary effort—contributing to the shared goal of advancing
              AI through honest, human-aligned evaluation.
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
