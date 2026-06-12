import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "framer-motion"; // 推荐使用 framer-motion

// --- 动画常量 (与第一屏保持一致) ---
const ELEGANT_EASE = [0.83, 0, 0.17, 1];

// --- 动画变体 (Variants) ---

// 1. 根容器变体: 整体协调，延续第一屏风格
const sectionRootVariants: Variants = {
  hidden: { opacity: 1 }, // 保持容器可见，让子元素控制动画
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.25, // 控制标题、文本块、图片等大模块的入场顺序
    },
  },
};

// 2. 标题“揭示”变体: 与第一屏标题动画一致
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
  visible: {
    transition: {
      staggerChildren: 0.1, // 每行文字出现的间隔
    },
  },
};

// 4. 单个单词“滚动”变体: 实现核心的文字滚动效果
const wordRevealVariant: Variants = {
  hidden: { y: "100%", opacity: 0 }, // 单词从下方开始
  visible: {
    y: "0%",
    opacity: 1,
    transition: {
      duration: 0.7, // 每个单词的动画时长
      ease: ELEGANT_EASE,
    },
  },
};

export default function Section() {
  const sectionRef = useRef<HTMLDivElement>(null);
  // 同样设置为 once: true，保证流畅的用户体验
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  const desires_pc = [
    "Contributors seek reward — financial, and/or recognition.",
    "Financial reward motivates. Recognition transcends.",
    "Ownership is not the goal. It is the means.",
    "Creators long to share credit — sometimes simple,",
    "often complex, occasionally near impossible.",
    "We build the infrastructure to make financial reward distributable,",
    "and credit attribution visible.",
    "So that those who build are never forgotten,",
    "and those who give are always seen.",
  ];

  // 为移动端优化，由于屏幕较窄，直接使用行级动画即可，逐字效果可能过于拥挤
  const desires_mobile = [
    "Contributors seek reward — ",
    "financial, and/or recognition.",
    "Financial reward motivates.",
    "Recognition transcends.",
    "Ownership is not the goal.",
    "It is the means.",
    "Creators long to share credit — ",
    "sometimes simple ",
    "often complex ",
    "occasionally near impossible. ",
    "We build the infrastructure to make ",
    "financial reward distributable,",
    "and credit attribution visible.",
    "So that those who build ",
    "are never forgotten, ",
    "and those who give are always seen.",
  ];

  return (
    <motion.div
      ref={sectionRef}
      className="section mt-10 lg:mt-[60px] lg:min-w-[1080px] lg:max-w-[1080px] lg:px-0"
      initial="hidden"
      animate={controls}
      variants={sectionRootVariants}
    >
      {/* --- 标题 --- */}
      <div className="mx-auto w-fit overflow-hidden">
        <motion.h3
          variants={titleRevealVariant}
          className="h-[34px] w-[84px] rounded-lg bg-black text-center text-base font-bold leading-[34px] text-[#FCA800] lg:h-[44px] lg:w-[110px] lg:text-[32px] lg:leading-[44px]"
        >
          Part I
        </motion.h3>
      </div>
      <div className="mt-5 overflow-hidden">
        <motion.h4
          variants={titleRevealVariant}
          className="text-center text-[28px] font-bold leading-9 lg:text-[40px] lg:leading-[50px]"
        >
          Individually – The Desire
        </motion.h4>
      </div>

      {/* --- PC 端逐字滚动文本 --- */}
      <motion.div
        variants={paragraphContainerVariants}
        className="mt-10 hidden px-6 text-center text-base font-normal leading-10 lg:block"
      >
        {desires_pc.map((line, lineIndex) => (
          <div key={lineIndex} className="overflow-hidden">
            {/* 将每行文字拆分成单词，并为每个单词应用动画 */}
            <motion.p
              variants={wordRevealVariant}
              style={{ display: "inline-block" }} // 确保动画正确应用
            >
              {line}
            </motion.p>
          </div>
        ))}
      </motion.div>

      {/* --- 移动端文本 (简化为行级动画) --- */}
      <motion.ul
        variants={paragraphContainerVariants}
        className="mt-6 flex flex-wrap items-center justify-center px-6 text-center text-base font-normal leading-8 lg:hidden"
      >
        {desires_mobile.map((item, index) => (
          <div key={"desire-" + index} className="mr-1.5 overflow-hidden">
            <motion.li variants={wordRevealVariant} style={{ display: "inline-block" }}>
              {item}
            </motion.li>
          </div>
        ))}
      </motion.ul>
    </motion.div>
  );
}
