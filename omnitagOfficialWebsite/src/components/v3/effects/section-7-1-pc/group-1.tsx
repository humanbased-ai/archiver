import { motion } from "framer-motion";
import { text3, text4, text5, text7 } from "./consts";

// --- TypeScript Interfaces ---
interface AnimatingTextProps {
  d: string;
  delay: number;
  duration?: number;
}

interface AnimatingSingleArrowProps {
  linePath: string;
  headPath: string;
  delay: number;
  duration?: number;
  color?: string;
}

interface AnimatingDoubleArrowProps {
  fullPath: string;
  originX: number;
  delay: number;
  duration?: number;
  color?: string;
}

interface AnimatingRectProps {
  x: number | string;
  y: number | string;
  width: number | string;
  height: number | string;
  delay: number;
  duration?: number;
}

// --- Subcomponent 1: Animating Text ---
function AnimatingText({ d, delay, duration = 0.4 }: AnimatingTextProps) {
  const variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { delay, duration, ease: "easeOut" } },
  };
  return <motion.path d={d} fill="black" variants={variants} />;
}

// --- Subcomponent 2: Animating Single-Headed Arrow ---
function AnimatingSingleArrow({
  linePath,
  headPath,
  delay,
  duration = 0.6,
  color = "black",
}: AnimatingSingleArrowProps) {
  const lineVariants = {
    hidden: { pathLength: 0 },
    visible: { pathLength: 1, transition: { delay, duration, ease: "easeInOut" } },
  };
  const headVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { opacity: 1, scale: 1, transition: { delay: delay + duration - 0.2, duration: 0.3 } },
  };
  return (
    <g>
      <motion.path d={linePath} stroke={color} strokeWidth="1" fill="none" variants={lineVariants} />
      <motion.path d={headPath} fill={color} variants={headVariants} />
    </g>
  );
}

// --- Subcomponent 3: Animating Double-Headed Arrow ---
function AnimatingDoubleArrow({
  fullPath,
  originX,
  delay,
  duration = 0.5,
  color = "black",
}: AnimatingDoubleArrowProps) {
  const variants = {
    hidden: { scaleX: 0, opacity: 0 },
    visible: { scaleX: 1, opacity: 1, transition: { delay, duration, ease: [0.6, 0.01, -0.05, 0.95] } },
  };
  return (
    <motion.g style={{ transformOrigin: `${originX}px center` }} variants={variants}>
      <path d={fullPath} fill={color} />
    </motion.g>
  );
}

// --- Subcomponent 4: Animating Rectangle Border ---
function AnimatingRect({ x, y, width, height, delay, duration = 0.5 }: AnimatingRectProps) {
  const variants = {
    hidden: { opacity: 0, pathLength: 0 },
    visible: { opacity: 1, pathLength: 1, transition: { delay, duration, ease: "easeInOut" } },
  };
  return (
    <motion.rect
      x={x}
      y={y}
      width={width}
      height={height}
      stroke="black"
      strokeOpacity="0.2"
      fill="none"
      variants={variants}
    />
  );
}

export default function Group() {
  // --- Animation Timeline Planning (New Order) ---
  const middle_start = 0; // 1. Animate Middle
  const right_side_start = 0.5; // 2. Animate Right Arrow
  const left_side_lower_start = 1; // 3. Animate Lower Left Arrow
  const left_side_upper_start = 1.5; // 4. Animate Upper Left Arrow

  return (
    <motion.g initial="hidden" animate="visible">
      {/* Step 1: Middle elements (rectangle and text5) */}
      <AnimatingRect x="257.656" y="121.254" width="199" height="71" delay={middle_start} />
      <AnimatingText d={text5} delay={middle_start + 0.2} />

      {/* Step 2: Right-side elements (text7 and single-headed arrow) */}
      <AnimatingText d={text7} delay={right_side_start} />
      <AnimatingSingleArrow
        linePath="M597.156 154.754 L461.656 154.754"
        headPath="M462.156 151.867 L457.156 154.754 L462.156 157.641Z"
        delay={right_side_start}
      />

      {/* Step 3: Lower-left elements (text4 and double-headed arrow) */}
      <AnimatingText d={text4} delay={left_side_lower_start} />
      <AnimatingDoubleArrow
        fullPath="M185.156 170.754L190.156 173.641L190.156 167.867L185.156 170.754ZM245.156 170.754L240.156 167.867L240.156 173.641L245.156 170.754ZM189.656 170.754L189.656 171.254L240.656 171.254L240.656 170.754L240.656 170.254L189.656 170.254L189.656 170.754Z"
        originX={(189.656 + 240.656) / 2}
        delay={left_side_lower_start}
      />

      {/* Step 4: Upper-left elements (text3 and double-headed arrow) */}
      <AnimatingText d={text3} delay={left_side_upper_start} />
      <AnimatingDoubleArrow
        fullPath="M185.156 142.754L190.156 145.641L190.156 139.867L185.156 142.754ZM245.156 142.754L240.156 139.867L240.156 145.641L245.156 142.754ZM189.656 142.754L189.656 143.254L240.656 143.254L240.656 142.754L240.656 142.254L189.656 142.254L189.656 142.754Z"
        originX={(189.656 + 240.656) / 2}
        delay={left_side_upper_start}
      />
    </motion.g>
  );
}
