import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView, useAnimation, Variants } from "motion/react"; // 假设这是 "framer-motion"

import Img1 from "@/assets/v3/section-3-1.svg?react";
import Img2 from "@/assets/v3/section-3-2.svg?react";
import Img3 from "@/assets/v3/section-3-3.svg?react";
import Triangle from "@/assets/v3/triangle.svg?react";
import Img1Pc from "@/components/v3/effects/section-3-1-pc.tsx";

import Img1_2 from "@/assets/v3/section-3-2-1.svg?react";
import Img2_2 from "@/assets/v3/section-3-2-2.svg?react";
import Img3_2 from "@/assets/v3/section-3-2-3.svg?react";
import Img4_2 from "@/assets/v3/section-3-2-4.svg?react";
import Corner from "@/assets/v3/corner-down-right-line.svg?react";

import { useSplitTextAnimation } from "@/hooks/useSplitTextAnimation";
import { useWindowResize } from "@/hooks/useWindowResize";

// --- Animation Constants ---
const SMOOTH_EASE_OUT = [0.33, 1, 0.68, 1]; // easeOutQuint
const TECH_EASE_IN_OUT = [0.65, 0, 0.35, 1]; // easeInOutCubic

// --- Animation Variants ---

// 标题 Variants (不变)
const s3_titleVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: SMOOTH_EASE_OUT,
      delay: custom * 0.15,
    },
  }),
}; // 标题动画在 ~0.85s 完成

// 为主要段落创建新的 Variant
const s3_mainParagraphVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: SMOOTH_EASE_OUT,
      delay: 0.9, // 在标题 (约0.85s完成) 后开始
    },
  },
};

// 修改 Part1 图片容器的 Variant
const s3_part1ImageVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.9,
      ease: SMOOTH_EASE_OUT,
      delay: 1.1, // 在段落开始 (0.9s) 后出现
    },
  },
};

// 修改 Part1 内部移动端列表的 Variant
const s3_part1MobileListVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 1.15, // 确保在 s3_part1ImageVariants (delay 1.1s) 启动后开始其子项动画
    },
  },
};

// Part1 移动端列表内子项的 Variant (保持不变)
const s3_part1MobileFlowItemVariants: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: SMOOTH_EASE_OUT },
  },
};

// 为 Part2 的主容器创建新的 Variant，用于编排其内部子元素
const s3_part2OverallContainerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7, // Part2 容器自身的动画时长
      ease: SMOOTH_EASE_OUT,
      delay: 1.3, // 在 Part1 图片容器 (delay 1.1s) 开始后
      staggerChildren: 0.2, // Part2 内部直接子 motion 组件的交错延迟
    },
  },
};

// 为 Part2 内部由父级 staggered 的子项创建通用 Variant
const s3_staggeredItemInPart2: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: SMOOTH_EASE_OUT },
    // 无需 delay，由父级 s3_part2OverallContainerVariants 的 staggerChildren 控制
  },
};

// Part2 卡片动画 Variants (保持不变)
const s3_part2CardShellVariants: Variants = {
  hidden: {
    opacity: 0,
    scaleY: 0.85,
    originY: 0.5,
  },
  visible: {
    opacity: 1,
    scaleY: 1,
    transition: {
      duration: 0.6,
      ease: TECH_EASE_IN_OUT,
      staggerChildren: 0.1,
      delayChildren: 0.2, // 卡片内容在其外壳出现0.2s后开始
    },
  },
};

const s3_part2CardIconVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5, rotate: -15 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.5, ease: SMOOTH_EASE_OUT },
  },
};

const s3_part2CardTextVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: SMOOTH_EASE_OUT },
  },
};

// const s3_fadeInVariants: Variants = { ... }; // 此 Variant 在新的编排方案下可能不再需要用于主要块的控制

export default function Section() {
  const { ref: splitTextRef } = useSplitTextAnimation<HTMLDivElement>(".section-3-title");
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
    <div ref={sectionRef} className="section section-box py-[60px] lg:snap-start lg:pb-[80px] lg:pt-[160px]">
      <div className="items-end lg:flex lg:gap-[105px]">
        <div ref={splitTextRef}>
          {windowSize.width < 1024 ? (
            <h2>
              <motion.div
                custom={0}
                initial="hidden"
                animate={controls}
                variants={s3_titleVariants}
                className="section-3-title text-[52px] font-bold leading-[60px]"
              >
                From
              </motion.div>
              <motion.div
                custom={1}
                initial="hidden"
                animate={controls}
                variants={s3_titleVariants}
                className="section-3-title text-[48px] font-bold leading-[1em] tracking-tighter"
              >
                Knowledge to Specialized Al
              </motion.div>
            </h2>
          ) : (
            <h2>
              <motion.div
                custom={0}
                initial="hidden"
                animate={controls}
                variants={s3_titleVariants}
                className="section-3-title text-nowrap text-[68px] font-bold leading-[96px]"
              >
                From Knowledge
              </motion.div>
              <motion.div
                custom={1}
                initial="hidden"
                animate={controls}
                variants={s3_titleVariants}
                className="section-3-title text-[48px] font-bold leading-[60px] tracking-tighter"
              >
                to Specialized Al
              </motion.div>
            </h2>
          )}
          <motion.p
            initial="hidden"
            animate={controls}
            variants={s3_mainParagraphVariants} // 使用新的 Variant
            className="mt-6 text-base tracking-tight text-[#404049]"
          >
            Domain Knowledge turn general models into specialists by teaching, guiding, grounding, and testing.
          </motion.p>
        </div>
        <motion.div initial="hidden" animate={controls} variants={s3_part1ImageVariants}>
          <Part1 parentControls={controls} />
        </motion.div>
      </div>

      <motion.div
        initial="hidden"
        animate={controls}
        variants={s3_part2OverallContainerVariants} // Part2 主容器使用新的编排 Variant
      >
        <Part2 /> {/* 不再传递 sectionControls */}
      </motion.div>
    </div>
  );
}

const part1Data = [
  { text: "Knowledge * Data", Img: Img1 },
  { text: "", Img: Triangle },
  { text: "Foundational Al", Img: Img2 },
  { text: "", Img: Triangle },
  { text: "Specialized Al", Img: Img3 },
];

function Part1({ parentControls }: { parentControls: ReturnType<typeof useAnimation> }) {
  return (
    <div>
      <Img1Pc className="hidden max-w-[716px] shrink lg:block" />
      <motion.ul
        className="mt-[60px] space-y-5 text-base font-bold lg:hidden"
        initial="hidden"
        animate={parentControls}
        variants={s3_part1MobileListVariants} // 使用修改后的 Variant
      >
        {part1Data.map((item, index) => (
          <motion.li
            key={`part-1-${index}`}
            className="flex items-center justify-between"
            variants={s3_part1MobileFlowItemVariants}
          >
            <span>{item.text}</span>
            <div className="flex w-[166px] items-center justify-center">
              <item.Img />
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

const part2Data = [
  {
    title: "Fine-Tuning",
    des: "Provide domain-specific examples, reasoning, and edge cases—shaping the model's internal logic and turning generalists into specialists.",
    Icon: Img1_2,
  },
  {
    title: "RAG",
    des: "Curate trusted sources and verified facts—used at runtime to ground model outputs in reliable, human-validated knowledge.",
    Icon: Img2_2,
  },
  {
    title: "Prompting",
    des: "Design prompts that reflect expert thinking, logic chains, or task framing—guiding models without retraining.",
    Icon: Img3_2,
  },
  {
    title: "Evaluation",
    des: "Provide crucial feedback to improve Al systems. Use domain judgment to assess real-world readiness—especially in research, planning, and scientific domains.",
    Icon: Img4_2,
  },
];

function Part2() {
  // 移除了 sectionControls prop
  const scrollContainerRef = useRef<HTMLUListElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);
  const rafRef = useRef<number>();
  const autoPlayRef = useRef<NodeJS.Timeout>();

  const updateProgress = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollLeft = el.scrollLeft;
    const scrollWidth = el.scrollWidth - el.clientWidth;
    const progress = scrollWidth > 0 ? scrollLeft / scrollWidth : 0;
    setScrollProgress(progress);
    setCanScrollPrev(scrollLeft > 0);
    setCanScrollNext(scrollLeft < scrollWidth);
  }, []);

  const resetAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
    }
    autoPlayRef.current = setTimeout(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const scrollWidth = el.scrollWidth - el.clientWidth;
      const currentScroll = el.scrollLeft;
      const itemWidth = (el.firstElementChild as HTMLElement)?.offsetWidth + 16 || 300 + 16;

      if (currentScroll >= scrollWidth - 5) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollTo({ left: currentScroll + itemWidth, behavior: "smooth" });
      }
    }, 3000);
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      updateProgress();
      resetAutoPlay();
    });
  }, [updateProgress, resetAutoPlay]);

  const scrollTo = useCallback(
    (direction: "prev" | "next") => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const itemWidth = (el.firstElementChild as HTMLElement)?.offsetWidth + 16 || 300 + 16;
      const currentScroll = el.scrollLeft;
      const targetScroll = direction === "prev" ? currentScroll - itemWidth : currentScroll + itemWidth;
      el.scrollTo({ left: targetScroll, behavior: "smooth" });
      resetAutoPlay();
    },
    [resetAutoPlay],
  );

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll, { passive: true });
      updateProgress(); // Initial call to set button states
      resetAutoPlay(); // Start autoPlay on mount
    }
    return () => {
      el?.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    };
  }, [handleScroll, updateProgress, resetAutoPlay]);

  return (
    <div className="mt-[60px] lg:mt-[80px]">
      <motion.ul
        className="flex items-center gap-6"
        variants={s3_staggeredItemInPart2} // 由父级 s3_part2OverallContainerVariants 控制时序
      >
        <li
          className={`flex cursor-pointer items-center gap-2 transition-opacity ${!canScrollPrev && "cursor-not-allowed opacity-30"}`}
          onClick={() => canScrollPrev && scrollTo("prev")}
        >
          <div className="flex size-7 items-center justify-center bg-black text-white">
            <Corner className="-scale-x-100" />
          </div>
          PREV
        </li>
        <li
          className={`flex cursor-pointer items-center gap-2 transition-opacity ${!canScrollNext && "cursor-not-allowed opacity-30"}`}
          onClick={() => canScrollNext && scrollTo("next")}
        >
          NEXT
          <div className="flex size-7 items-center justify-center bg-black text-white">
            <Corner />
          </div>
        </li>
      </motion.ul>

      <motion.div
        className="mt-6 w-full max-w-full"
        variants={s3_staggeredItemInPart2} // 由父级 s3_part2OverallContainerVariants 控制时序
      >
        <motion.ul
          ref={scrollContainerRef}
          className="flex w-full snap-x snap-mandatory flex-nowrap gap-4 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          variants={{
            hidden: {}, // 卡片自身处理 hidden 状态
            visible: { transition: { staggerChildren: 0.12 } }, // 对卡片 LI 的交错
          }}
        >
          {part2Data.map((item, index) => (
            <motion.li
              key={`part-2-${index}`}
              className="h-[374px] w-[300px] shrink-0 snap-start bg-black p-6 lg:h-[332px] lg:w-[400px] lg:p-12"
              variants={s3_part2CardShellVariants} // 卡片自身动画，保持不变
            >
              <motion.div variants={s3_part2CardIconVariants}>
                <item.Icon className="size-20" />
              </motion.div>
              <motion.div
                variants={s3_part2CardTextVariants}
                className="mt-[60px] text-white lg:mt-[80px] lg:text-base"
              >
                {item.title}
              </motion.div>
              <motion.p
                variants={s3_part2CardTextVariants}
                className="mt-6 text-sm leading-[22px] text-[#BBBBBE] lg:text-xs lg:leading-5"
              >
                {item.des}
              </motion.p>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>

      <motion.div
        className="mt-6 h-1 overflow-hidden rounded-full bg-[#00000033]"
        variants={s3_staggeredItemInPart2} // 由父级 s3_part2OverallContainerVariants 控制时序
      >
        <div
          className="h-full rounded-full bg-black"
          style={{
            width: `${scrollProgress * 100}%`,
            transition: scrollProgress === 0 ? "none" : "width 0.3s ease-out",
          }}
        />
      </motion.div>
    </div>
  );
}
