// DataFlowDiagram.tsx
import { useEffect, useRef, useState } from "react";
import { useInView, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";

import Group0 from "./group-0";
import Group1 from "./group-1";
import Group2 from "./group-2";
import Group3 from "./group-3";

export default function DataFlowDiagram({ className }: { className?: string }) {
  const [showGroup0, setShowGroup0] = useState(false);
  const [showGroup1, setShowGroup1] = useState(false);
  const [showGroup2, setShowGroup2] = useState(false);
  const [showGroup3, setShowGroup3] = useState(false);

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      const tl = gsap.timeline({
        onRepeat: () => {
          // When the animation repeats, reset the state for G1, G2, and G3.
          // Group0 remains persistent.
          gsap.set(
            {},
            {
              onComplete: () => {
                setShowGroup1(false);
                setShowGroup2(false);
                setShowGroup3(false);
              },
            },
          );
        },
        repeat: -1,
        repeatDelay: 1,
      });

      // --- Animation Timeline ---
      // Step 1: Show Group0 (if not already shown)
      tl.call(() => setShowGroup0(true))
        .add(() => {}, "+=0.5")

        // Step 2: Show Group1
        .call(() => setShowGroup1(true))
        // Pause for 1.5s with G0 and G1 visible together
        .add(() => {}, "+=1.5")

        // Step 3: (REMOVED) The .call() to hide Group1 midway was removed from here.

        // Step 4: Show Group2
        .call(() => {
          setTimeout(() => setShowGroup2(true), 50);
        })
        .add(() => {}, "+=1.5")

        // Step 5: Show Group3
        .call(() => setShowGroup3(true))
        // Pause for 4s after G0, G1, G2, and G3 are all visible
        .add(() => {}, "+=4.0")

        // Step 6: At the end of a single loop, hide G1, G2, and G3 together.
        .call(() => {
          setShowGroup1(false); // <--- ADDED HERE to hide G1 at the end of the loop.
          setShowGroup2(false);
          setShowGroup3(false);
        });

      return () => {
        tl.kill();
      };
    }
  }, [isInView]);

  return (
    <div ref={ref} className={className}>
      <svg width="901" height="308" viewBox="0 0 901 308" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_35137_32706)">
          <AnimatePresence>
            {showGroup2 && <Group2 key="group2" />}
            {showGroup0 && <Group0 key="group0" />}
            {showGroup1 && <Group1 key="group1" />}
            {showGroup3 && <Group3 key="group3" />}
          </AnimatePresence>
        </g>
        <defs>
          <clipPath id="clip0_35137_32706">
            <rect width="900" height="308" fill="white" transform="translate(0.144531)" />
          </clipPath>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="black" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
