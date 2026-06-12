import { cn } from "@udecode/cn";
import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "motion/react";

import Logo1 from "@/assets/v3/section-9-1.svg?react";
import Logo2 from "@/assets/v3/section-9-2.svg?react";
import Logo3 from "@/assets/v3/section-9-3.svg?react";
import Logo5 from "@/assets/v3/section-9-5.svg?react";
import CheckCircleIcon from "@/assets/v3/check-circle.svg?react";

import { useSplitTextAnimation } from "@/hooks/useSplitTextAnimation";

const S8_SMOOTH_EASE_OUT = [0.33, 1, 0.68, 1];
const S8_SPRING_POP_EASE = [0.68, -0.6, 0.32, 1.6]; // For a springy effect
const S8_EASE_OUT_EXPO = [0.16, 1, 0.3, 1]; // Easing for a more prominent effect

const s8_sectionContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 },
  },
};

// For the "Roadmap" title
const s8_mainTitleVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: S8_SMOOTH_EASE_OUT },
  },
};

const s8_contentBlockVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: S8_SMOOTH_EASE_OUT, staggerChildren: 0.15 },
  },
};

// Timeline specific variants
const s8_timelineLineVariants = (origin: string = "top", axis: "x" | "y" = "y", delay: number = 0.3): Variants => {
  if (axis === "y") {
    return {
      hidden: { opacity: 0, scaleY: 0 },
      visible: {
        opacity: 1,
        scaleY: 1,
        transition: { duration: 1.0, ease: [0.25, 0.25, 0.75, 0.75], delay },
        transformOrigin: origin,
      },
    };
  } else {
    return {
      hidden: { opacity: 0, scaleX: 0 },
      visible: {
        opacity: 1,
        scaleX: 1,
        transition: { duration: 1.0, ease: [0.25, 0.25, 0.75, 0.75], delay },
        transformOrigin: origin,
      },
    };
  }
};

const s8_timelineItemsListVariants: Variants = {
  // For UL in Part and PC
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.25, delayChildren: 0.3 }, // Delay for line to draw
  },
};

// MODIFIED: For each LI roadmap item - to be more neat and prominent
const s8_timelineItemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 }, // Start slightly lower and smaller
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8, // Slightly longer duration for a smoother but impactful arrival
      ease: S8_EASE_OUT_EXPO, // More energetic easing for prominence
      staggerChildren: 0.1, // Keep inner staggering for content within the item
    },
  },
};

const s8_timelineDiamondVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.5, ease: S8_SPRING_POP_EASE } },
};

const s8_timelinePhaseVariants: Variants = {
  // For the year/phase
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: S8_SMOOTH_EASE_OUT } },
};

const s8_timelineTextContentVariants: Variants = {
  // For title/des in timeline item
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: S8_SMOOTH_EASE_OUT } },
};

// Innovators section variants
const s8_innovatorsTitleVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: S8_SMOOTH_EASE_OUT } },
};

const s8_logoListVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const s8_logoItemVariants: Variants = {
  // Ceremonial entrance for logos
  hidden: { opacity: 0, y: 20, scale: 0.85, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: S8_EASE_OUT_EXPO }, // Using S8_EASE_OUT_EXPO here
  },
};

export default function Section() {
  const { ref: splitTextRefHook } = useSplitTextAnimation<HTMLDivElement>(".section-8-title");
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.1 }); // amount:0.1 for earlier trigger
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    } else {
      controls.start("hidden");
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={sectionRef}
      className="section-box lg:snap-start lg:pb-0 lg:pt-[160px]"
      initial="hidden"
      animate={controls}
      variants={s8_sectionContainerVariants}
    >
      <div ref={splitTextRefHook}>
        <motion.h2
          className="section-8-title section text-[68px] font-bold leading-[96px] tracking-tighter lg:mb-[80px] lg:text-center"
          variants={s8_mainTitleVariants}
        >
          Roadmap
        </motion.h2>
      </div>
      <div className="lg:section lg:my-[initial] lg:flex lg:items-stretch lg:justify-between lg:gap-[68px]">
        <Timeline />
        <Innovators />
      </div>
    </motion.div>
  );
}

function VLine() {
  return (
    <motion.div
      className="ml-[6px] mr-[30px] mt-[6px] w-px shrink-0 self-stretch bg-black lg:mr-[80px]"
      variants={s8_timelineLineVariants("top", "y", 0.1)} // origin, axis, delay
    />
  );
}

const data = [
  {
    phase: <div className="rounded-[8px] bg-black px-2 text-base font-semibold leading-6 text-white">2023</div>,
    title: "Community-Driven Data Pipeline",
    des: (
      <>
        Started with{" "}
        <a href="https://microscopeprotocol.net/" className="text-[#fca800]" target="_blank">
          Microscope Protocol
        </a>{" "}
        and partners like Coinbase. 300M+ crypto addresses labeled. Powers real-time risk data sharing via{" "}
        <a href="https://cryptodefendersalliance.com/" className="text-[#fca800]" target="_blank">
          Crypto Defenders Alliance
        </a>
        .
      </>
    ),
    list: [
      <a
        href="https://docs.google.com/spreadsheets/d/1apWj4JKZ2EEN9ZNCBI50wHz0QDn_XBT-YUqUI1EIMTE/edit?usp=sharing"
        className="text-[#fca800]"
        target="_blank"
      >
        Annotations: 560 Millions
      </a>,
      " High-Risk Addresses: 46 Millions",
      <a
        href="https://docs.microscopeprotocol.xyz/onboarding/data/categories"
        className="text-[#fca800]"
        target="_blank"
      >
        Categories: 95
      </a>,
      "Supported Networks: 35",
    ],
  },
  {
    phase: <div className="rounded-[8px] bg-black px-2 text-base font-semibold leading-6 text-white">2024</div>,
    title: "Knowledge at Scale",
    des: "300K+ global contributors. Advanced workflows turn community intelligence into real-world apps — with revenue, reach, and results.",
    list: [
      "Active Contributors: 300,000+",
      "Country Coverage: 200+",
      "Domain Frontiers: 100+",
      "Total Submissions: 5+ Millions",
      "Validated Entries: 2+ Millions",
    ],
  },
  {
    phase: <div className="rounded-[8px] bg-[#FCA800] px-2 text-base font-semibold leading-6 text-black">2025</div>,
    title: "Protocol Decentralization",
    des: "With the successful launch of the core token $XNY, the Codatta ecosystem experienced explosive growth. Bolstered by top-tier partners, both our community scale and data validation volume reached new milestones, while the core technical framework for true data sovereignty was fully implemented.",
    list: [
      "Core Asset: $XNY Launched",
      "Contributors: 1 Million+",
      "Validated Data: 10 Million+",
      "Sovereignty Tech: DID & Provenance Live",
    ],
  },
  {
    phase: (
      <div className="rounded-[8px] bg-black px-2 text-base font-semibold leading-6 text-white">2026 & Beyond</div>
    ),
    title: "Data Assetification with Royalty-Based Payments",
    des: "Knowledge becomes an asset. AI teams pay as they grow. Contributors earn as their data powers real-world applications.",
  },
];

function Part() {
  return (
    <motion.ul className="flex-1 space-y-10 break-words lg:space-y-8" variants={s8_timelineItemsListVariants}>
      {data.map((item, index) => (
        <motion.li key={`section-8-part-${index}`} variants={s8_timelineItemVariants}>
          <div className="lg:flex lg:items-center lg:gap-3">
            <div className="flex items-center">
              <motion.div className="relative -ml-3 size-3" variants={s8_timelineDiamondVariants}>
                <span
                  className={cn(
                    "absolute -left-[75px] block size-full rotate-45 bg-black",
                    index === 0 ? "-mt-[3px]" : "",
                  )}
                ></span>
              </motion.div>
              <motion.div variants={s8_timelinePhaseVariants}>{item.phase}</motion.div>
            </div>
            <motion.h3 className="mt-4 text-base font-bold lg:mt-0" variants={s8_timelineTextContentVariants}>
              {item.title}
            </motion.h3>
          </div>
          <motion.p
            className="mt-3 grow-0 text-xs leading-[20px] text-[#77777D]"
            variants={s8_timelineTextContentVariants}
          >
            {item.des}
          </motion.p>
          {item.list && (
            <motion.ul className="mt-5 grid grid-cols-1 gap-0 text-sm lg:grid-cols-2">
              {item.list.map((text, index) => (
                <li key={"roadmap-list-" + index} className="flex items-center gap-1">
                  <CheckCircleIcon aria-label="Completed step icon" role="img" />
                  {text}
                </li>
              ))}
            </motion.ul>
          )}
        </motion.li>
      ))}
    </motion.ul>
  );
}

function Timeline() {
  return (
    <motion.div
      className="section mt-[60px] flex w-full items-start lg:mt-0 lg:min-w-[initial] lg:flex-1"
      variants={s8_contentBlockVariants}
    >
      <VLine />
      <Part />
    </motion.div>
  );
}

const innovatorLogos = [
  {
    ICON: Logo1,
    alt: "VENTURES Logo",
  },
  {
    ICON: Logo2,
    alt: "Avalanche Logo",
  },
  {
    ICON: Logo3,
    alt: "Eigen Layer Logo",
  },
  {
    ICON: Logo5,
    alt: "Binance Logo",
  },
];

function Innovators() {
  return (
    <motion.div
      variants={s8_contentBlockVariants}
      className="section py-[60px] lg:mx-[initial] lg:h-full lg:w-[380px] lg:min-w-[initial] lg:p-0"
    >
      <motion.div className="border border-dashed border-[#000000] px-4 pb-8 lg:flex lg:h-full lg:flex-col lg:justify-between lg:px-[38px]">
        <motion.h3
          className="mt-[-12px] shrink-0 px-2 text-center text-2xl font-bold leading-none tracking-tighter"
          variants={s8_innovatorsTitleVariants}
        >
          <span className="bg-warm px-1">Trusted by</span>
        </motion.h3>
        <motion.ul
          className="mt-8 flex shrink-0 flex-col items-center justify-center gap-6 lg:mt-[76px] lg:flex-1 lg:gap-[68px]"
          variants={s8_logoListVariants}
        >
          {innovatorLogos.map((logo, index) => (
            <motion.li
              key={`logo-${index}`}
              variants={s8_logoItemVariants}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <logo.ICON role="img" aria-label={logo.alt} />
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>
    </motion.div>
  );
}
