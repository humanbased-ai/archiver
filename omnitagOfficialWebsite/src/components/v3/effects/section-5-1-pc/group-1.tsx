import { motion } from "motion/react";

// --- 子组件 1: 从中心展开的双向箭头 ---
function HorizontalArrow({ delay }: { delay: number }) {
  const variants = {
    hidden: { scaleX: 0, opacity: 0 },
    visible: {
      scaleX: 1,
      opacity: 1,
      transition: {
        delay,
        duration: 0.7,
        ease: [0.6, 0.01, -0.05, 0.95], // 平滑的缓动曲线
      },
    },
  };

  return (
    // 使用 transformOrigin: "center" 确保从中心点缩放
    <motion.g style={{ transformOrigin: "center" }} variants={variants}>
      {/* 经过清理和简化的路径 */}
      <path d="M567.5 78.25 L 728.5 78.25" stroke="black" strokeWidth="1" />
      <path d="M568 75.36 L 563 78.25 L 568 81.14 Z" fill="black" />
      <path d="M728 75.36 L 733 78.25 L 728 81.14 Z" fill="black" />
    </motion.g>
  );
}

// --- 子组件 2: 文本块动画 ---
function TextBlock({ delay }: { delay: number }) {
  const variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay,
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };
  return (
    <motion.g variants={variants}>
      <path
        d="M515.42 220.042C514.374 220.042 513.473 219.855 512.716 219.482C511.958 219.109 511.334 218.618 510.844 218.01C510.353 217.402 509.985 216.751 509.74 216.058C509.505 215.365 509.388 214.698 509.388 214.058V213.706C509.388 213.013 509.51 212.314 509.756 211.61C510.001 210.906 510.374 210.266 510.876 209.69C511.377 209.103 512.001 208.634 512.748 208.282C513.505 207.93 514.396 207.754 515.42 207.754C516.444 207.754 517.329 207.93 518.076 208.282C518.833 208.634 519.462 209.103 519.964 209.69C520.465 210.266 520.838 210.906 521.084 211.61C521.329 212.314 521.452 213.013 521.452 213.706V214.058C521.452 214.698 521.329 215.365 521.084 216.058C520.849 216.751 520.486 217.402 519.996 218.01C519.505 218.618 518.881 219.109 518.124 219.482C517.366 219.855 516.465 220.042 515.42 220.042ZM515.42 218.602C516.102 218.602 516.716 218.474 517.26 218.218C517.814 217.962 518.284 217.615 518.668 217.178C519.052 216.73 519.345 216.229 519.548 215.674C519.75 215.109 519.852 214.517 519.852 213.898C519.852 213.247 519.75 212.639 519.548 212.074C519.345 211.509 519.052 211.013 518.668 210.586C518.284 210.149 517.814 209.807 517.26 209.562C516.716 209.317 516.102 209.194 515.42 209.194C514.737 209.194 514.118 209.317 513.564 209.562C513.02 209.807 512.556 210.149 512.172 210.586C511.788 211.013 511.494 211.509 511.292 212.074C511.089 212.639 510.988 213.247 510.988 213.898C510.988 214.517 511.089 215.109 511.292 215.674C511.494 216.229 511.788 216.73 512.172 217.178C512.556 217.615 513.02 217.962 513.564 218.218C514.118 218.474 514.737 218.602 515.42 218.602ZM526.303 219.754L528.031 211.498H530.111L532.127 219.754H530.815L528.799 211.53H529.311L527.567 219.754H526.303ZM525.519 219.754V218.538H527.295V219.754H525.519ZM525.167 219.754L522.751 211.21H524.223L526.575 219.754H525.167ZM531.135 219.754V218.538H532.911V219.754H531.135ZM531.855 219.754L533.903 211.21H535.295L533.199 219.754H531.855ZM537.37 219.754V211.21H538.586V214.874H538.394C538.394 214.031 538.506 213.322 538.73 212.746C538.965 212.159 539.317 211.717 539.786 211.418C540.255 211.109 540.847 210.954 541.562 210.954H541.626C542.703 210.954 543.498 211.29 544.01 211.962C544.533 212.634 544.794 213.605 544.794 214.874V219.754H543.258V214.554C543.258 213.893 543.071 213.365 542.698 212.97C542.325 212.565 541.813 212.362 541.162 212.362C540.49 212.362 539.946 212.57 539.53 212.986C539.114 213.402 538.906 213.957 538.906 214.65V219.754H537.37Z"
        fill="black"
      />
    </motion.g>
  );
}

// --- 子组件 3: 可复用的路径绘制动画组件 (来自您的范例) ---
function AnimatingPath({
  linePath,
  headPath,
  lineDelay,
  headDelay,
  duration,
  color,
}: {
  linePath: string;
  headPath: string;
  lineDelay: number;
  headDelay: number;
  duration: number;
  color: string;
}) {
  const lineVariants = {
    hidden: { pathLength: 0 },
    visible: { pathLength: 1, transition: { delay: lineDelay, duration, ease: "easeInOut" } },
  };

  const headVariants = {
    hidden: { opacity: 0, scale: 0.3, transformOrigin: "center" },
    visible: { opacity: 1, scale: 1, transition: { delay: headDelay, duration: 0.4 } },
  };

  return (
    <g>
      <motion.path d={linePath} stroke={color} strokeWidth="1" fill="none" variants={lineVariants} />
      <motion.path d={headPath} fill={color} variants={headVariants} />
    </g>
  );
}

// --- 主组件: 编排所有动画 ---
export default function Group() {
  // 动画时间线规划
  const step1_delay = 0; // 双向箭头首先开始

  const step2_delay = step1_delay + 0.2; // 在双向箭头开始后不久，单向箭头开始
  const step2_duration = 0.6;

  const step3_delay = step2_delay + step2_duration; // 在单向箭头动画结束后，文本出现

  return (
    <motion.g initial="hidden" animate="visible">
      {/* --- 第1步: 水平双向箭头从中间展开 --- */}
      <HorizontalArrow delay={step1_delay} />

      {/* --- 第2步: 垂直单向箭头向下绘制 --- */}
      <AnimatingPath
        linePath="M 457.046 189.254 V 240" // 简化的垂直线
        headPath="M 454.16 240 L 457.046 244.754 L 459.933 240 Z" // 调整后的箭头
        color="black"
        lineDelay={step2_delay}
        duration={step2_duration}
        headDelay={step2_delay + step2_duration - 0.2} // 箭头在画线即将结束时出现
      />

      {/* --- 第3步: 文本块淡入 --- */}
      <TextBlock delay={step3_delay} />
    </motion.g>
  );
}
