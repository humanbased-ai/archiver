"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";

import Group0 from "./group-0";
import Group1 from "./group-1";
import Group2 from "./group-2";

export default function DataFlowDiagramFinalLoop({ className }: { className?: string }) {
  // State to control the visibility of each group
  const [showGroup0, setShowGroup0] = useState(false);
  const [showGroup1, setShowGroup1] = useState(false);
  const [showGroup2, setShowGroup2] = useState(false);

  // Ref for the container element to track its position
  const ref = useRef(null);
  // Trigger animation only when the component is in view
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    // Start the animation timeline if the component is visible
    if (isInView) {
      const tl = gsap.timeline({
        // When the animation repeats, reset the state for G1 and G2
        onRepeat: () => {
          setShowGroup1(false);
          setShowGroup2(false);
        },
        repeat: -1, // Loop indefinitely
        repeatDelay: 1.5, // Pause 1.5s between loops
      });

      // --- Animation Timeline ---
      // Step 1: Show Group0 (remains visible throughout the loops)
      tl.call(() => setShowGroup0(true))
        .add(() => {}, "+=0.5") // Wait for 0.5s

        // Step 2: Show Group1
        .call(() => setShowGroup1(true))
        .add(() => {}, "+=1.5") // Wait for 1.5s

        // Step 3: Show Group2
        .call(() => setShowGroup2(true))
        .add(() => {}, "+=4") // Wait for 2.5s with all groups visible

        // Step 4: Hide G1 and G2 at the end of the loop, preparing for the next iteration
        .call(() => {
          setShowGroup1(false);
          setShowGroup2(false);
        });

      // Cleanup function to kill the timeline when the component unmounts
      return () => {
        tl.kill();
      };
    }
  }, [isInView]);

  return (
    <div ref={ref} className={className}>
      <svg width="958" height="361" viewBox="0 0 958 361" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* AnimatePresence handles the enter/exit animations for the groups */}
        <AnimatePresence>
          {showGroup0 && <Group0 key="group0" />}
          {showGroup1 && <Group1 key="group1" />}
          {showGroup2 && <Group2 key="group2" />}
        </AnimatePresence>
      </svg>
    </div>
  );
}
