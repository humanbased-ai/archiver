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
          // **Per the new requirement, showGroup0 is no longer reset here.**
          gsap.set(
            {},
            {
              onComplete: () => {
                // setShowGroup0(false); // <--- Removed
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

      // --- Animation Timeline (Group0 is now persistent) ---
      // Step 1: Mount and play Group0. This will only visually affect the UI on the first loop.
      // In subsequent loops, since showGroup0 is already true, this call won't trigger a state change.
      tl.call(() => setShowGroup0(true))
        .add(() => {}, "+=0.5")

        // Step 2: Mount and play Group1
        .call(() => setShowGroup1(true))
        .add(() => {}, "+=1.5")

        // Step 3: Unmount Group1 (reverting to original logic)
        .call(() => setShowGroup1(false))
        .add(() => {}, "+=0.8")

        // Step 4: Mount and play Group2
        .call(() => {
          setTimeout(() => setShowGroup2(true), 50);
        })
        .add(() => {}, "+=1.5")

        // Step 5: Mount and play Group3
        .call(() => setShowGroup3(true))
        .add(() => {}, "+=4.0")

        // Step 6: At the end of a single loop, hide G2 and G3.
        // **Per the new requirement, Group0 is no longer hidden here.**
        .call(() => {
          // setShowGroup0(false); // <--- Removed
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
            {/* Dynamically render components based on their state */}
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
