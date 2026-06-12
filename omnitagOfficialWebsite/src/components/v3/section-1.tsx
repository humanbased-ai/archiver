import { Link } from "react-router-dom";
import { motion, Variants, useAnimation } from "framer-motion"; // Using framer-motion
import { useRef, useEffect, useCallback, useMemo } from "react";
import { shuffle } from "lodash-es";

import CornerRightArrowIcon from "@/assets/v3/corner-down-right-line.svg?react";
import LogoBg from "./logo-bg"; // Assuming this path is correct

import TextScramble from "@/utils/textScramble";

// --- Animation Variants ---
const gentleEase = [0.42, 0, 0.58, 1]; // Smooth easeInOut

const logoBgVariants: Variants = {
  hidden: { opacity: 0, scale: 1.05 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 2.5, ease: gentleEase, delay: 0.1 },
  },
};

const mainTitleVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.2, ease: gentleEase, delay: 0.5 },
  },
};

const subTitleVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.2, ease: gentleEase, delay: 0.8 },
  },
};

const buttonListVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 1.1, staggerChildren: 0.25 },
  },
};

const buttonItemVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: gentleEase },
  },
};

// Variants for the individual motion.divs inside AnimateTexts
const animateTextLineGroupVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.2, ease: gentleEase, delay: 1.7 }, // Delayed after buttons
  },
};

const animateTextFinalLineVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.2, ease: gentleEase, delay: 1.9 }, // Slightly more delayed
  },
};

export default function Section() {
  const controls = useAnimation();

  useEffect(() => {
    controls.start("visible");
  }, [controls]);

  return (
    <div className="relative h-[calc(100vh-60px)] bg-gradient-to-b from-warm to-[#E6E5DC] lg:h-screen lg:snap-start">
      <motion.div
        className="absolute inset-0 z-0 overflow-hidden"
        initial="hidden"
        animate={controls}
        variants={logoBgVariants}
      >
        <LogoBg />
      </motion.div>

      <div className="section relative z-20 flex h-full flex-col justify-between pb-[50px] pt-[90px] lg:pb-[60px] lg:pt-[160px]">
        <div className="lg:flex lg:justify-end">
          <div>
            <h1 className="hidden">Earn From Your Data with Codatta</h1> {/* for seo */}
            <motion.h1
              className="text-[52px] font-bold leading-[60px] lg:text-[72px] lg:leading-[1em]"
              initial="hidden"
              animate={controls}
              variants={mainTitleVariants}
            >
              Knowledge Layer for AI
            </motion.h1>
            <motion.h3
              className="mt-4 text-xl font-normal lg:mt-5 lg:text-[32px] lg:leading-[1em] lg:tracking-tighter"
              initial="hidden"
              animate={controls}
              variants={subTitleVariants}
            >
              Your Knowledge, Your Data Asset, Endless AI Royalties
            </motion.h3>
            <motion.ul
              className="mt-8 flex gap-10 lg:mt-10"
              initial="hidden"
              animate={controls}
              variants={buttonListVariants}
            >
              <motion.li variants={buttonItemVariants}>
                <Link to="https://codatta.io/frontier-guide" className="group flex items-center">
                  <div className="mr-2 flex size-7 items-center justify-center bg-black text-white transition-transform duration-300 group-hover:scale-110">
                    <CornerRightArrowIcon className="size-5" aria-hidden="true" />
                  </div>
                  <span className="font-normal transition-opacity duration-300 group-hover:opacity-70">
                    Start Building
                  </span>
                </Link>
              </motion.li>
              <motion.li variants={buttonItemVariants}>
                <Link to="https://docs.codatta.io" className="group flex items-center">
                  <div className="mr-2 flex size-7 items-center justify-center bg-black text-white transition-transform duration-300 group-hover:scale-110">
                    <CornerRightArrowIcon className="size-5" aria-hidden="true" />
                  </div>
                  <span className="font-normal transition-opacity duration-300 group-hover:opacity-70">Docs</span>
                </Link>
              </motion.li>
            </motion.ul>
          </div>
        </div>
        <AnimateTexts parentControls={controls} />
      </div>
    </div>
  );
}

function AnimateTexts({ parentControls }: { parentControls?: unknown }) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const index = useRef<number>(0); // Track which element to animate next
  // Track animation progress

  // All available texts wrapped in useMemo to avoid recreation on each render
  const allTexts = useMemo(
    () => [
      "知识 · 数据 · 资产",
      "지식 · 데이터 · 자산",
      "Wissen · Daten · Vermögenswerte",
      "知識 · 數據 · 資產",
      "Connaissance · Données · Actif",
      " المعرفة · البيانات · الأصول",
      "知識 · データ · 資産",
      "Conhecimento · Dados · Ativos",
      "Знания · Данные · Активы",
    ],
    [],
  );

  // Refs to store our selected texts and remaining texts
  const selectedTexts = useRef<string[]>([]);
  const remainingTexts = useRef<string[]>([]);

  // Initialize text selections
  useEffect(() => {
    // Shuffle the array and take the first 4 for initial display
    const shuffledTexts = shuffle([...allTexts]);
    selectedTexts.current = shuffledTexts.slice(0, 4);
    remainingTexts.current = shuffledTexts.slice(4);

    // Set initial texts in the DOM
    for (let i = 0; i < 4; i++) {
      const el = document.querySelector(`#text-${i + 1}`);
      if (el) {
        el.textContent = selectedTexts.current[i];
      }
    }
  }, [allTexts]);

  // Animation function wrapped in useCallback to avoid recreation on each render
  const animateText = useCallback(() => {
    const next = () => {
      // Select element to animate (1-5)
      const elementIndexToAnimate = (index.current % 5) + 1;
      const el = document.querySelector(`#text-${elementIndexToAnimate}`);

      if (el) {
        // Instantiate TextScramble for the current element
        const fx = new TextScramble(el as HTMLElement);

        if (elementIndexToAnimate === 5) {
          // For text-5, always use the special text
          fx.setText("[*↵©]").then(() => {});
        } else {
          // For text-1 through text-4, replace with a new text
          if (remainingTexts.current.length > 0) {
            // Get a random text from remaining texts
            const newTextIndex = Math.floor(Math.random() * remainingTexts.current.length);
            const newText = remainingTexts.current[newTextIndex];

            // Remove from remaining and add current to remaining
            const currentText = selectedTexts.current[elementIndexToAnimate - 1];
            remainingTexts.current.splice(newTextIndex, 1);
            remainingTexts.current.push(currentText);

            // Update selected texts
            selectedTexts.current[elementIndexToAnimate - 1] = newText;

            // Animate the change
            fx.setText(newText).then(() => {});
          } else {
            // If we've used all texts, just reuse the current one
            fx.setText(selectedTexts.current[elementIndexToAnimate - 1]).then(() => {});

            // Reshuffle remaining texts if we've used them all
            if (elementIndexToAnimate === 4) {
              remainingTexts.current = shuffle([...allTexts]);
              // Remove currently displayed texts from the pool
              selectedTexts.current.forEach((text) => {
                const index = remainingTexts.current.indexOf(text);
                if (index !== -1) {
                  remainingTexts.current.splice(index, 1);
                }
              });
            }
          }
        }
      }

      // Move to next element
      index.current = (index.current + 1) % 5;

      // Set timeout for next animation
      timer.current = setTimeout(next, 4000);
    };
    next();
  }, [allTexts]);

  useEffect(() => {
    // Start animation when the component mounts and its container is animating in.
    // Wait for a brief moment for the motion.divs to start their animation.
    const animationDelay = 1.7; // Same as the delay in animateTextLineGroupVariants
    const startScrambleTimeout = setTimeout(
      () => {
        animateText();
      },
      animationDelay * 1000 + 200, // Convert to milliseconds and add a small offset
    ); // Start after the text container is visible

    return () => {
      clearTimeout(startScrambleTimeout);
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [animateText]); // Include animateText in the dependency array

  return (
    // This outer div is a simple container now, not a motion component itself,
    // as the motion components are inside.
    <div className="relative z-10 lg:flex lg:items-center lg:justify-between">
      <motion.div
        className="text-base"
        initial="hidden"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        animate={(parentControls as any) || "visible"} // Use parentControls or animate directly
        variants={animateTextLineGroupVariants}
      >
        <span id="text-1">知识 · 数据 · 资产</span>
        <br className="inline lg:hidden" />
        <span className="hidden px-2 lg:inline">|</span>
        <span id="text-2">지식 · 데이터 · 자산</span>
        <br />
        <span id="text-3">Wissen · Daten · Vermögenswerte</span>
        <br className="inline lg:hidden" />
        <span className="hidden px-2 lg:inline">|</span>
        <span id="text-4">المعرفة · البيانات · الأصول</span>
      </motion.div>
      <motion.div
        className="my-10 text-right text-2xl lg:my-0 lg:text-[36px]"
        // Note: The original TextScramble logic targets id="text-5" for the 5th phrase.
        // Ensure this is the intended element for the 5th phrase.
        id="text-5"
        initial="hidden"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        animate={(parentControls as any) || "visible"}
        variants={animateTextFinalLineVariants}
      >
        [*↵©]
      </motion.div>
    </div>
  );
}
