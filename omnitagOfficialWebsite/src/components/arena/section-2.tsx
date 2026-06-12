import Icon1 from "@/assets/arena/section-2-1-icon.svg?react";
import Icon2 from "@/assets/arena/section-2-2-icon.svg?react";
import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "framer-motion";

// --- 动画常量 (与首屏保持一致) ---
const ELEGANT_EASE = [0.83, 0, 0.17, 1];

// --- 动画变体 (Variants) ---

// 1. 根容器变体: 整体协调，交错子元素动画
const sectionRootVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeIn",
      staggerChildren: 0.3, // 卡片组和底部信息栏依次入场
    },
  },
};

// 2. 卡片和底部信息栏的入场变体 (平滑上滑)
const blockEnterVariant: Variants = {
  hidden: { y: 60, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 1.2,
      ease: ELEGANT_EASE,
      staggerChildren: 0.15, // 为卡片内部元素设置交错
    },
  },
};

// 3. 卡片内部文本“揭示”变体 (与首屏保持一致)
const textRevealVariant: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: { duration: 1, ease: ELEGANT_EASE },
  },
};

// 4. 图标入场变体
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

const cardData = [
  {
    Icon: Icon1,
    title: (
      <>
        For GenAI Model
        <br />
        Companies
      </>
    ),
    subTile: "Showcase your best. Compete with trust",
    des: "Stand out with your strongest models—not just more of them. AI Agent Arena offers a fair, transparent, and tamper-proof leaderboard powered by blockchain. Gain credible recognition from real users, and demonstrate your model’s true capabilities in real-world living-tasks.",
  },
  {
    Icon: Icon2,
    title: (
      <>
        For
        <br />
        Developer
      </>
    ),
    subTile: "Build agents. Battle smart. Get noticed",
    des: "Turn your LLM-powered agents into contenders. Join a live arena where your AI competes, collaborates, and evolves through real tasks. Benchmark performance, learn from others, and earn visibility in the global AI builder community.",
  },
];

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
      className="section section-box mt-[60px] py-6 lg:snap-start lg:pt-[80px]"
      initial="hidden"
      animate={controls}
      variants={sectionRootVariants}
    >
      <motion.div
        className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between lg:gap-[38px] lg:pt-[80px]"
        variants={blockEnterVariant} // 应用于整个卡片组
      >
        {cardData.map((item, index) => (
          <Card key={"card2_" + index} {...item} />
        ))}
      </motion.div>
      <motion.div
        className="mt-6 rounded-lg border border-[#0000001F] p-6 text-base leading-8 lg:px-[60px] lg:py-8 lg:leading-7"
        variants={blockEnterVariant} // 应用于底部信息栏
      >
        Backed by a global community of over <span className="text-xl font-bold text-[#FCA800]">313,222+</span> users
        across <span className="text-xl font-bold text-[#FCA800]">270+</span> countries and diverse industries, AAA
        enables unbiased evaluation—free from user, language, or data bias—so your model is tested by the world, not
        just a dataset.
      </motion.div>
    </motion.div>
  );
}

function Card({
  Icon,
  title,
  subTile,
  des,
}: {
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: React.ReactNode;
  subTile: string;
  des: string;
}) {
  return (
    // 卡片本身继承父容器的交错动画，无需单独设置variants
    <motion.div
      className="space-y-4 rounded-lg bg-[#0000000A] p-6 lg:flex-1 lg:px-[60px] lg:pb-12 lg:pt-8"
      variants={blockEnterVariant} // 卡片也使用此变体，但由父级交错触发
    >
      <motion.div variants={iconVariant}>
        <Icon className="size-[88px]" />
      </motion.div>
      <div className="overflow-hidden">
        <motion.h3 variants={textRevealVariant} className="text-[32px] font-bold leading-none lg:text-[60px]">
          {title}
        </motion.h3>
      </div>
      <div className="overflow-hidden">
        <motion.h4 variants={textRevealVariant} className="text-base font-bold lg:mt-6">
          {subTile}
        </motion.h4>
      </div>
      <div className="overflow-hidden">
        <motion.p
          variants={textRevealVariant}
          className="text-justify text-sm leading-[22px] text-[#77777D] lg:mt-6 lg:text-base"
        >
          {des}
        </motion.p>
      </div>
    </motion.div>
  );
}
