import { motion } from "framer-motion";

export default function Group() {
  // --- Dimension constants based on reference paths ---
  const REFERENCE_LINE_THICKNESS = 1; // Width of the reference rectangle
  const REFERENCE_HEAD_HEIGHT = 5; // Height of the reference triangle
  const REFERENCE_HEAD_DEPTH = 5; // Use height as square clipping depth, maintain ratio

  // --- Dynamically calculate arrow coordinates ---
  const arrowY = 77.5; // Y coordinate of the horizontal line for the arrow
  const arrowTipX = 567.5; // X coordinate of the leftmost tip of the arrow

  // Coordinates for the square clipping head
  const headBaseX = arrowTipX + REFERENCE_HEAD_DEPTH;
  // Top and bottom Y coordinates for the square head
  const headTopY = arrowY - REFERENCE_HEAD_HEIGHT / 2;
  const headBottomY = arrowY + REFERENCE_HEAD_HEIGHT / 2;

  // Animation variants (unchanged)
  const lineVariants = {
    hidden: { pathLength: 0 },
    visible: {
      pathLength: 1,
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  };

  const headVariants = {
    hidden: { opacity: 0, scale: 0.3 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, delay: 0.5 },
    },
  };

  const textVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: 0.6 },
    },
  };

  return (
    <motion.g initial="hidden" animate="visible">
      <motion.text
        x="645"
        y="68"
        textAnchor="middle"
        fontSize="14"
        fill="#000"
        fontWeight="normal"
        variants={textVariants}
      >
        Query
      </motion.text>

      {/* Horizontal path */}
      <motion.path
        d={`M 728 ${arrowY} L ${arrowTipX} ${arrowY}`}
        stroke="black"
        strokeWidth={REFERENCE_LINE_THICKNESS} // Apply calculated thickness
        variants={lineVariants}
      />

      {/* Square-clipped arrow path (closed and filled with Z command) */}
      <motion.path
        d={`M ${headBaseX} ${headTopY} L ${arrowTipX} ${arrowY} L ${headBaseX} ${headBottomY} Z`}
        fill="black"
        variants={headVariants}
      />
    </motion.g>
  );
}
