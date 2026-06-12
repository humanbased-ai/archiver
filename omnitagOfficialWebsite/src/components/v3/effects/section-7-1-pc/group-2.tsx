import { motion } from "framer-motion";
import { text1, text2 } from "./consts"; // Assuming all text constants are in one file

// --- TypeScript Interfaces ---
interface AnimatingTextProps {
  d: string;
  delay: number;
  duration?: number;
}

interface AnimatingDoubleArrowProps {
  fullPath: string;
  originX: number;
  delay: number;
  duration?: number;
  color?: string;
}

// NEW: Interface for Vertical Arrow
interface AnimatingVerticalDoubleArrowProps {
  fullPath: string;
  originY: number;
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

// --- Reusable Animation Components ---

// Component 1: Animating Text
function AnimatingText({ d, delay, duration = 0.4 }: AnimatingTextProps) {
  const variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { delay, duration, ease: "easeOut" } },
  };
  return <motion.path d={d} fill="black" variants={variants} />;
}

// Component 2: Animating Horizontal Double-Headed Arrow
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

// NEW --- Component 3: Animating Vertical Double-Headed Arrow ---
function AnimatingVerticalDoubleArrow({
  fullPath,
  originY,
  delay,
  duration = 0.5,
  color = "black",
}: AnimatingVerticalDoubleArrowProps) {
  const variants = {
    hidden: { scaleY: 0, opacity: 0 },
    visible: { scaleY: 1, opacity: 1, transition: { delay, duration, ease: [0.6, 0.01, -0.05, 0.95] } },
  };
  return (
    // Animate vertically from a specific Y-origin
    <motion.g style={{ transformOrigin: `center ${originY}px` }} variants={variants}>
      <path d={fullPath} fill={color} />
    </motion.g>
  );
}

// Component 4: Animating Rectangle Border
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

// --- Main Component with New Animations ---
export default function Group() {
  // --- Animation Timeline Planning ---
  const middle_start = 0; // 1. Animate Middle
  const bottom_arrow_start = 0.4; // 2. Animate Bottom Arrow
  const left_arrow_start = 0.8; // 3. Animate Left Arrow

  return (
    <motion.g initial="hidden" animate="visible">
      {/* Step 1: Animate Middle elements */}
      <AnimatingRect x="257.656" y="1.25391" width="199" height="71" delay={middle_start} />
      <AnimatingText d={text2} delay={middle_start + 0.2} />

      {/* Step 2: Animate Bottom arrow */}
      <AnimatingVerticalDoubleArrow
        fullPath="M357.156 76.7539L354.269 81.7539L360.043 81.7539L357.156 76.7539ZM357.156 116.754L360.043 111.754L354.269 111.754L357.156 116.754ZM357.156 81.2539L356.656 81.2539L356.656 112.254L357.156 112.254L357.656 112.254L357.656 81.2539L357.156 81.2539Z"
        // Calculate the center Y coordinate for the transform origin
        originY={(76.7539 + 116.754) / 2}
        delay={bottom_arrow_start}
      />

      {/* Step 3: Animate Left arrow and text */}
      <AnimatingText d={text1} delay={left_arrow_start} />
      <AnimatingDoubleArrow
        fullPath="M185.156 36.7539L190.156 39.6407L190.156 33.8672L185.156 36.7539ZM245.156 36.7539L240.156 33.8672L240.156 39.6407L245.156 36.7539ZM189.656 36.7539L189.656 37.2539L240.656 37.2539L240.656 36.7539L240.656 36.2539L189.656 36.2539L189.656 36.7539Z"
        // Calculate the center X coordinate for the transform origin
        originX={(189.656 + 240.656) / 2}
        delay={left_arrow_start}
      />
    </motion.g>
  );
}
