import { cn } from "@udecode/cn";
import { motion, useScroll } from "motion/react";

export default function ScrollLinked({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className={cn("h-1 origin-left bg-[#FCA800]", className)}
      style={{
        scaleX: scrollYProgress,
      }}
    />
  );
}
