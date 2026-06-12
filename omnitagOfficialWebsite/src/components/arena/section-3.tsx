import Icon1 from "@/assets/arena/section-3-1-icon.svg?react";
import Icon2 from "@/assets/arena/section-3-2-icon.svg?react";
import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "framer-motion";
import { cn } from "@udecode/cn";

// --- CSS for Hardware Acceleration ---
// 定义一个可复用的CSS类，用于开启硬件加速
const styles = `
  .will-change-transform {
    will-change: transform, opacity;
  }
`;

// --- 动画常量 ---
const ELEGANT_EASE = [0.83, 0, 0.17, 1];

// --- 动画变体 ---

// 1. 根容器变体: 优化了延迟，让卡片衔接更紧密
const sectionRootVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2, // 减小延迟，让漂移动作更连贯
    },
  },
};

// 2. 动态漂移入场变体 (保持不变，已是高性能设计)
const createDynamicCardVariant = (from: "bottom-left" | "top-right"): Variants => {
  const isFromBottomLeft = from === "bottom-left";
  return {
    hidden: {
      opacity: 0,
      x: isFromBottomLeft ? -120 : 120,
      y: isFromBottomLeft ? 120 : -120,
      rotate: isFromBottomLeft ? -5 : 5,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      rotate: 0,
      transition: {
        duration: 1.5,
        ease: ELEGANT_EASE,
        staggerChildren: 0.15, // 内部元素交错动画
      },
    },
  };
};

const cardFromBottomLeft = createDynamicCardVariant("bottom-left");
const cardFromTopRight = createDynamicCardVariant("top-right");

// 3. 文本“揭示”变体 (保持不变)
const textRevealVariant: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: { duration: 1, ease: ELEGANT_EASE },
  },
};

// 4. 图标入场变体 (保持不变)
const iconVariant: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 1,
      ease: ELEGANT_EASE,
    },
  },
};

// 5. 页脚入场变体 (保持不变)
const footerVariant: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 1.2,
      ease: ELEGANT_EASE,
    },
  },
};

interface CardProps {
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: React.ReactNode;
  des: string;
  footer: string;
  variants: Variants;
  className?: string;
}
const cardData = [
  {
    Icon: Icon1,
    title: (
      <h3 className="mt-8 text-2xl font-semibold leading-none">
        Versus
        <br />
        <span className="text-[#FCA800]">Static and Ground-Truth</span>
      </h3>
    ),
    des: "Traditional benchmarks rely on fixed datasets and task-specific accuracy.",
    footer:
      "AAA complements them by integrating live human preference signals and continuous, scenario-based evaluations.",
  },
  {
    Icon: Icon2,
    title: (
      <h3 className="mt-8 text-2xl font-semibold leading-none">
        Versus
        <br />
        <span className="text-[#FCA800]">LMArena</span>
      </h3>
    ),
    des: "LMArena is the most cited leaderboard, built on pairwise comparisons.",
    footer:
      "AAA brings blockchain-powered immutability, full traceability, and avoids vote gaming via token incentives.",
  },
];

export default function Section() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });
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
        className="section section-box space-y-6 py-6 lg:flex lg:snap-start lg:flex-row-reverse lg:gap-[60px] lg:space-y-0 lg:py-[80px] lg:pt-[160px]"
        initial="hidden"
        animate={controls}
        variants={sectionRootVariants}
      >
        <Card {...cardData[0]} variants={cardFromTopRight} className="lg:mt-[140px]" />
        <Card {...cardData[1]} variants={cardFromBottomLeft} />
      </motion.div>
    </>
  );
}

function Card({ Icon, title, des, footer, variants, className }: CardProps) {
  return (
    <motion.div
      // 对执行复杂动画的卡片本身应用 will-change
      className={cn("bg-black p-6 will-change-transform lg:h-[450px] lg:flex-1", className)}
      variants={variants}
    >
      <motion.div className="will-change-transform" variants={iconVariant}>
        <Icon />
      </motion.div>

      <div className="overflow-hidden">
        <motion.div className="will-change-transform" variants={textRevealVariant}>
          {title}
        </motion.div>
      </div>

      <div className="overflow-hidden">
        <motion.p
          className="mt-4 text-base font-semibold text-white will-change-transform"
          variants={textRevealVariant}
        >
          {des}
        </motion.p>
      </div>

      <motion.p
        className="mt-4 bg-[#FFFFFF14] p-3 text-justify text-white will-change-transform"
        variants={footerVariant}
      >
        {footer}
      </motion.p>
    </motion.div>
  );
}
