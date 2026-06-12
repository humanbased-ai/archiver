import img1 from "@/assets/vision/section-1-1.jpg";
import img2 from "@/assets/vision/section-1-2.jpg";
import { cn } from "@udecode/cn";
import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "framer-motion"; // Note: Use framer-motion for richer features

// --- 动画常量 ---
// 一个更平滑、优雅的缓动曲线，非常适合高级感的动效
const ELEGANT_EASE = [0.83, 0, 0.17, 1];

// --- 动画变体 (Variants) ---

// 1. 根容器变体: 整体协调，交错子元素动画
const sectionRootVariants: Variants = {
  hidden: { opacity: 1 }, // 保持可见，由子元素自己控制动画
  visible: {
    opacity: 1,
    transition: {
      // staggerChildren 让子元素按顺序依次入场，营造节奏感
      staggerChildren: 0.3,
    },
  },
};

// 2. 标题文本“揭示”变体: 增加遮罩效果
const titleTextRevealVariant: Variants = {
  hidden: { y: "110%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: { duration: 1.2, ease: ELEGANT_EASE },
  },
};

// 3. 卡片容器变体: 简单的淡入，作为子动画的容器
const cardContainerVariant: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: ELEGANT_EASE,
      // 交错卡片内部元素的动画
      staggerChildren: 0.2,
    },
  },
};

// 4. 图片“裁剪揭示”变体: 大气、优雅的图片入场方式
const imageRevealVariant: Variants = {
  hidden: {
    opacity: 0,
    // clipPath 定义了图片的裁剪路径，从一个插入的矩形扩展到完全显示
    clipPath: "inset(20% 40% 20% 40%)",
    scale: 1.1, // 初始稍微放大，配合裁剪动画更有冲击力
  },
  visible: {
    opacity: 1,
    clipPath: "inset(0% 0% 0% 0%)",
    scale: 1,
    transition: {
      duration: 1.4, // 更长的持续时间，显得更从容
      ease: ELEGANT_EASE,
    },
  },
};

// 5. 卡片内容“揭示”变体: 与标题类似，但更轻快
const contentTextRevealVariant: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.9, ease: ELEGANT_EASE },
  },
};

export default function Section() {
  const sectionRef = useRef<HTMLDivElement>(null);
  // 对于首屏动画，通常设置为 once: true，确保只播放一次，体验更佳
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  const data = [
    {
      img: img1,
      label: "Figure 01",
      title: "Stamped Bricks from the Great Wall (Ming Dynasty, 1368–1644)",
      des: "This photo shows bricks from the Ming-era Great Wall, stamped with names of workers or officials who made or placed them. These marks served both as quality control (a form of responsibility) and as a way to credit the builders.",
    },
    {
      img: img2,
      label: "Figure 02",
      title: "Acknowledgement of Contributors, Star Wars: Episode II – Attack of the Clones (2002)",
      des: "This frame shows the digital effects artists who helped create the film’s visual scenes. Each name represents someone who contributed behind the scenes.",
    },
  ];
  return (
    <motion.div
      ref={sectionRef}
      className="section lg:min-w-[1080px] lg:max-w-[1080px] lg:px-0"
      initial="hidden"
      animate={controls}
      variants={sectionRootVariants}
    >
      {/* --- 标题 --- */}
      {/* 使用一个 div 作为遮罩容器来实现“揭示”效果 */}
      <div className="overflow-hidden">
        <motion.h2
          variants={titleTextRevealVariant}
          className="pt-[60px] text-center text-[60px] font-bold leading-none tracking-tighter lg:pt-[80px] lg:text-[68px] lg:leading-[96px]"
        >
          Vision
        </motion.h2>
      </div>

      {/* --- 卡片 --- */}
      <div className="mt-10 p-6 lg:mt-[60px] lg:border lg:border-[#0000001F]">
        <Card img={data[0].img} label={data[0].label} title={data[0].title} des={data[0].des} />
        <Card img={data[1].img} label={data[1].label} title={data[1].title} des={data[1].des} className="mt-6" />
      </div>
    </motion.div>
  );
}

function Card({
  img,
  label,
  title,
  des,
  className,
}: {
  img: string;
  label: string;
  title: string;
  des: string;
  className?: string;
}) {
  // 卡片组件不再需要独立的 inView 触发器，由父组件统一管理
  return (
    <motion.div
      className={cn("lg:flex lg:items-stretch lg:gap-8", className)}
      // 使用父组件传递下来的动画变体
      variants={cardContainerVariant}
    >
      {/* 图片容器，应用图片揭示动画 */}
      <motion.div className="overflow-hidden lg:w-[360px] lg:shrink-0">
        <motion.img src={img} className="size-full object-cover" variants={imageRevealVariant} />
      </motion.div>

      {/* 内容容器 */}
      <div className="space-y-4 pt-4 lg:box-border lg:space-y-5 lg:py-3">
        {/* 为每一行文本包裹一个 overflow-hidden 的 div，以实现“揭示”效果 */}
        <div className="overflow-hidden">
          <motion.div
            variants={contentTextRevealVariant}
            className="inline-block rounded-lg bg-[#FCA800] px-2 text-base font-semibold leading-8"
          >
            {label}
          </motion.div>
        </div>
        <div className="overflow-hidden">
          <motion.h3 variants={contentTextRevealVariant} className="text-base font-bold lg:text-xl lg:leading-8">
            {title}
          </motion.h3>
        </div>
        <div className="overflow-hidden">
          <motion.p variants={contentTextRevealVariant} className="text-sm leading-[22px] text-[#77777D]">
            {des}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
