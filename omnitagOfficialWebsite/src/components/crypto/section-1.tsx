import { cn } from "@udecode/cn";
import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "motion/react";

// Import your SVG components
import Img from "@/assets/crypto/section-1.svg?react";
import ImgPc from "@/assets/crypto/section-1-pc.svg?react";
import OriginalMicroIcon from "@/assets/crypto/microscope-icon.svg?react";
import OriginalMessariIcon from "@/assets/crypto/messari-mainnet-icon.svg?react";

// Animation Constants
const SMOOTH_EASE = [0.22, 1, 0.36, 1];

// --- Animation Variants ---

// For the root container of the entire section
const sectionRootVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Time between h1, p, Part1, Part2, Part3 starting
      delayChildren: 0.1, // Small delay before the first child (h1) starts
    },
  },
};

// For the main title (H1)
const titleTextEntryVariant: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: SMOOTH_EASE },
  },
};

// For the main introductory paragraph (P)
const paragraphTextEntryVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: SMOOTH_EASE }, // Slightly faster, follows title
  },
};

// For major part wrappers (Part1, Part2, Part3 main containers)
// These animate the part block itself and stagger its primary internal children.
const partContainerVariant: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: SMOOTH_EASE,
      staggerChildren: 0.15, // Staggers direct significant children within this part
    },
  },
};

// For individual content items like an H3, a P, or an LI that doesn't group/stagger further children.
const contentItemVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: SMOOTH_EASE },
  },
};

const groupWithStaggeredItemsVariant: Variants = {
  hidden: { opacity: 0, y: 20 }, // The group itself animates in
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: SMOOTH_EASE,
      staggerChildren: 0.1, // Staggers its children
    },
  },
};

// For images
const imageVariant: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.8, ease: SMOOTH_EASE },
  },
};

// Specific for Part1 "Use Cases" list items (horizontal entry)
const part1UsecaseItemVariant: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: SMOOTH_EASE },
  },
};

// --- Main Section Component ---
export default function Section() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 }); // Re-animate if it comes back into view
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    } else {
      controls.start("hidden"); // Reset animations when out of view
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={sectionRef}
      className="section section-box py-[60px] lg:snap-start lg:pb-[80px] lg:pt-[160px]"
      initial="hidden"
      animate={controls}
      variants={sectionRootVariants}
    >
      <motion.h1
        variants={titleTextEntryVariant}
        className="text-[60px] font-bold leading-none tracking-tighter lg:text-[68px] lg:leading-[96px]"
      >
        Crypto Account Annotation
      </motion.h1>
      <motion.p variants={paragraphTextEntryVariant} className="mt-3 text-base text-[#404049]">
        Built for Openness,by Community Database of Crypto Address Annotation.
      </motion.p>

      {/* Part components are direct children and will be staggered by sectionRootVariants */}
      <Part1 />
      <Part2 />
      <Part3 />
    </motion.div>
  );
}

// --- Part1 Component ---
function Part1() {
  const list = ["AML Compliance", "Trend Analysis", "Market Analytics"];

  return (
    <motion.div
      variants={partContainerVariant} // Animates Part1 block and staggers its H3 and UL
      className="mt-6 flex items-center gap-11 bg-black px-4 py-3 text-white lg:mt-12 lg:gap-3 lg:py-4"
    >
      <motion.h3 variants={contentItemVariant} className="text-xl font-bold leading-none">
        Use Cases
      </motion.h3>
      <motion.ul
        variants={groupWithStaggeredItemsVariant} // Animates UL block and staggers its LIs
        className="flex-1 list-disc space-y-1 text-sm lg:flex lg:items-center lg:gap-3 lg:space-y-0"
      >
        {list.map((item) => (
          <motion.li
            key={item}
            variants={part1UsecaseItemVariant} // Each LI animates with a horizontal slide
            className="flex items-center"
          >
            <span className="mx-3 block size-1 bg-white"></span>
            {item}
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
}

// --- Part2 Component ---
function Part2() {
  const list = [
    {
      title: "Duplicative Efforts",
      des: "Shared, open contributions reduce redundancy and expand coverage across all chains.",
    },
    {
      title: "Centralized Services",
      des: "Community-driven metadata generation replaces siloed control.",
    },
    {
      title: "Fragmented Access",
      des: "A unified, open-access platform enables wide distribution and easy adoption of metadata.",
    },
    {
      title: "Stale Data",
      des: "Real-time, collective updates ensure fresh coverage during critical events and market surges.",
    },
  ];
  return (
    <div className="">
      <p className="px-4 py-3 text-sm text-[#404049]">
        We are Solving Key Challenges from Centralized and Isolated Systems:
      </p>
      <motion.ul
        variants={partContainerVariant} // Animates Part2 block (the UL itself) and staggers its LIs
        className="space-y-6 px-4 lg:flex lg:items-stretch lg:justify-between lg:gap-6 lg:space-y-0 lg:px-2"
      >
        {list.map((item) => (
          <motion.li
            key={item.title}
            variants={contentItemVariant} // Each LI card animates in
            className="lg:flex-1 lg:px-2"
          >
            <h3 className="text-base font-bold leading-none">{item.title}</h3>
            <p className="mt-[6px] text-xs leading-5 text-[#77777D]">{item.des}</p>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

// --- Part3 Component ---
function Part3() {
  const list = [
    {
      title: "Microscope: ",
      des: "Protocol for Collaboratively Labeling Crypto Addresses",
      Icon: OriginalMicroIcon,
      href: "https://www.coinbase.com/blog/microscope-protocol-for-collaboratively-labeling-crypto-addresses",
    },
    {
      title: "Messari Mainnet 2023: ",
      des: "Introducing an Open-Source Blockchain Metadata Initiative",
      Icon: OriginalMessariIcon,
      href: "https://www.youtube.com/watch?v=9PPz2Lg2ago",
    },
  ];
  return (
    <motion.div
      variants={partContainerVariant} // Animates Part3 block and staggers Imgs and text content div
      className="mt-10 lg:mt-[80px] lg:flex lg:flex-row-reverse lg:justify-end lg:gap-11"
    >
      <motion.div className="lg:hidden" variants={imageVariant}>
        <Img />
      </motion.div>
      <motion.div className="-mt-5 hidden flex-1 lg:block" variants={imageVariant}>
        <ImgPc />
      </motion.div>

      <motion.div
        variants={groupWithStaggeredItemsVariant} // Animates text content block and staggers its H3, P, UL
        className="mt-11 text-xs leading-[22px] text-[#77777D] lg:mt-0 lg:w-[300px] lg:shrink-0"
      >
        <motion.h3 variants={contentItemVariant} className="text-xl font-bold leading-none text-black">
          [Resources]
        </motion.h3>
        <motion.p variants={contentItemVariant} className="mt-4">
          Origin from{" "}
          <a href="https://microscopeprotocol.net/" className="text-[#fca800]" target="_blank">
            Microscope Protocol
          </a>
        </motion.p>
        <motion.ul
          variants={groupWithStaggeredItemsVariant} // Animates resource UL block and staggers its LIs
          className="mt-6"
        >
          {list.map((item, index) => (
            <motion.li
              key={item.title}
              variants={contentItemVariant} // Each resource LI animates in
              className="relative flex items-start gap-3"
            >
              {/* <item.Icon className="relative z-30 -m-1 size-8 shrink-0" /> */}
              <div className="relative z-30 ml-[6px] mt-[6px] size-3 shrink-0 rounded-full bg-black"></div>
              <div>
                <h4 className="text-base font-normal text-black">{item.title}</h4>
                <p className={cn("pb-6 pt-4", index === list.length - 1 ? "pb-0" : "")}>
                  <a href={item.href} target="_blank" className="text-[#fca800]">
                    {item.des}
                  </a>
                </p>
              </div>
              {index === 0 && <div className="absolute left-3 top-2 h-full border-r border-dashed border-black"></div>}
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>
    </motion.div>
  );
}
