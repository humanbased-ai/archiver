import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "framer-motion";
import img1 from "@/assets/vision/section-2.png";

// --- 动画常量 (与前两屏保持一致) ---
const ELEGANT_EASE = [0.83, 0, 0.17, 1];

// --- 动画变体 (复用自第二屏，确保风格统一) ---

// 1. 根容器变体: 整体协调
const sectionRootVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // 微调大模块的入场节奏
    },
  },
};

// 2. 标题“揭示”变体
const titleRevealVariant: Variants = {
  hidden: { y: "110%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: { duration: 1, ease: ELEGANT_EASE },
  },
};

// 3. 文本段落容器变体: 用于交错显示每一行
const paragraphContainerVariants: Variants = {
  hidden: {}, // 父容器不做动画
  visible: {
    transition: {
      staggerChildren: 0.08, // 每行文字出现的间隔，可以稍微快一点，体现内容的连续性
    },
  },
};

// 4. 单行/单词“滚动”变体
const lineRevealVariant: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: ELEGANT_EASE,
    },
  },
};

// 5. 图片与卡片容器的变体 (整体淡入)
const mediaContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: ELEGANT_EASE,
      staggerChildren: 0.2, // 交错图片和卡片内容的动画
    },
  },
};

// 6. 图片“裁剪揭示”变体: 与第一屏图片动画一致，保持连贯性
const imageRevealVariant: Variants = {
  hidden: {
    opacity: 0,
    clipPath: "inset(10% 30% 10% 30%)", // 从一个更窄的视口开始
    scale: 1.1,
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

// 7. 卡片内容“揭示”变体: 与第一屏卡片内容动画一致
const contentRevealVariant: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.9, ease: ELEGANT_EASE },
  },
};

export default function Section() {
  const sectionRef = useRef<HTMLDivElement>(null);
  // 同样设置为 once: true，避免重复播放
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  const desires_pc = [
    "Those who build AI are builders.",
    "And those who supply the knowledge to train it — they are builders too.",
    "In the old world, AI builders took the risk,",
    "granted access to vast oceans of human insight.",
    "But the knowledge builders?",
    "They earned little at first, and lost more as success grew.",
    "A royalty-based model rewrites the rules — elegant in motion.",
    "No upfront cost. No gate to innovation.",
    "AI builders move fast. Knowledge builders rise with them.",
    "Aligned in purpose. United in reward.",
    "Together, we reduce risk, unlock creation,",
    "and share in the wealth we build.",
  ];

  const desires_mobile = [
    "Those who build AI are builders. ",
    "And those who supply the knowledge to train it — ",
    "they are builders too.",
    "In the old world, ",
    "AI builders took the risk, ",
    "granted access to ",
    "vast oceans of human insight. ",
    "But the knowledge builders? ",
    "They earned little at first, ",
    "and lost more as success grew.",
    "A royalty-based model ",
    "rewrites the rules — ",
    "elegant in motion. ",
    "No upfront cost. ",
    "No gate to innovation.",
    "AI builders move fast. ",
    "Knowledge builders rise with them.",
    "Aligned in purpose. ",
    "United in reward.",
    "Together, we reduce risk,  ",
    "unlock creation,",
    "and share in the wealth we build.",
  ];

  return (
    <motion.div
      ref={sectionRef}
      className="section mt-10 pb-[84px] lg:mt-[80px] lg:min-w-[1080px] lg:max-w-[1080px] lg:px-0 lg:pb-0"
      initial="hidden"
      animate={controls}
      variants={sectionRootVariants}
    >
      {/* --- 标题 --- */}
      <div className="mx-auto w-fit overflow-hidden">
        <motion.h3
          variants={titleRevealVariant}
          className="h-[34px] w-[84px] rounded-lg bg-black text-center text-base font-bold leading-[34px] text-[#FCA800] lg:h-[44px] lg:w-[120px] lg:text-[32px] lg:leading-[44px]"
        >
          Part II
        </motion.h3>
      </div>
      <div className="mt-5 overflow-hidden">
        <motion.h4
          variants={titleRevealVariant}
          className="text-center text-[28px] font-bold leading-9 lg:text-[40px] lg:leading-[50px]"
        >
          Collectively – The Effect
        </motion.h4>
      </div>

      {/* --- PC 端逐行滚动文本 --- */}
      <motion.div
        variants={paragraphContainerVariants}
        className="mt-10 hidden px-6 text-center text-base font-normal leading-10 lg:block"
      >
        {desires_pc.map((line, index) => (
          // 为每一行包裹一个 overflow-hidden 的 div 来实现揭示效果
          <div key={"pc-" + index} className="overflow-hidden">
            <motion.p variants={lineRevealVariant}>{line}</motion.p>
          </div>
        ))}
      </motion.div>

      {/* --- 移动端文本 --- */}
      <motion.ul
        variants={paragraphContainerVariants}
        className="mt-6 flex flex-wrap items-center justify-center px-6 text-center text-base font-normal leading-8 lg:hidden"
      >
        {desires_mobile.map((item, index) => (
          // 为每个片段包裹容器以实现揭示效果
          <div key={"mobile-" + index} className="mr-1.5 overflow-hidden">
            <motion.li variants={lineRevealVariant} style={{ display: "inline-block" }}>
              {item}
            </motion.li>
          </div>
        ))}
      </motion.ul>
      {/* --- 图片与卡片区域 --- */}
      <motion.div
        className="mt-10 lg:mt-[60px] lg:flex lg:gap-8 lg:border lg:border-[#0000001F] lg:p-6"
        variants={mediaContainerVariants}
      >
        <div className="h-[470px] w-full shrink-0 overflow-x-auto lg:w-[360px]">
          <motion.div className="aspect-[360/470] h-full overflow-hidden">
            <motion.img src={img1} className="size-full object-contain" variants={imageRevealVariant} />
          </motion.div>
        </div>
        <Card />
      </motion.div>
    </motion.div>
  );
}

// 卡片组件也使用统一的动画变体
function Card() {
  return (
    <motion.div className="mt-6 lg:mt-3">
      {/* 对卡片内的每个元素应用揭示动画 */}
      <div className="overflow-hidden">
        <motion.div
          variants={contentRevealVariant}
          className="inline-block rounded-lg bg-[#FCA800] px-2 text-base font-semibold leading-8"
        >
          Figure 03
        </motion.div>
      </div>
      <div className="mt-5 overflow-hidden">
        <motion.h3 variants={contentRevealVariant} className="text-base font-bold lg:text-xl lg:leading-8">
          Comparing GenAI Business Models: Traditional Risk-Bearing vs. Royalty-Based
        </motion.h3>
      </div>
      <div className="mt-5 overflow-hidden">
        <motion.p variants={contentRevealVariant} className="text-sm leading-[22px] text-[#77777D]">
          These two charts compare how GenAI companies interact with knowledge contributors under different business
          models.
        </motion.p>
      </div>
      <motion.ul className="mt-6 space-y-5">
        {/* 对列表项也应用动画 */}
        <li className="overflow-hidden">
          <motion.h4 variants={contentRevealVariant} className="text-sm font-bold leading-[22px] text-[#1C1C26]">
            (1) Traditional Human Intelligence Model:
          </motion.h4>
          <motion.p variants={contentRevealVariant} className="mt-2 text-sm leading-[22px] text-[#77777D]">
            AI companies incur high upfront costs to access training data, while knowledge contributors receive flat,
            limited rewards. As the AI product scales, company profits grow, but contributor benefits stagnate — leading
            to a widening gap and misaligned incentives.
          </motion.p>
        </li>
        <li className="mt-5 overflow-hidden">
          <motion.h4 variants={contentRevealVariant} className="text-sm font-bold leading-[22px] text-[#1C1C26]">
            (2) Royalty-Based Model:
          </motion.h4>
          <motion.p variants={contentRevealVariant} className="mt-2 text-sm leading-[22px] text-[#77777D]">
            This model enables AI companies to reduce early risk by deferring costs through ongoing royalty payments.
            Contributors are rewarded proportionally as the product succeeds. The result is better alignment of
            interests, minimized early-stage risk, and shared long-term success.
          </motion.p>
        </li>
      </motion.ul>
    </motion.div>
  );
}
