import { cn } from "@udecode/cn";
import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "motion/react";

import Img from "@/assets/v3/section-7-1.svg?react";
import ImgPC from "@/components/v3/effects/section-7-1-pc";
import Img1_2 from "@/assets/v3/section-7-2-1.svg?react";
import Img2_2 from "@/assets/v3/section-7-2-2.svg?react";
import Img3_2 from "@/assets/v3/section-7-2-3.svg?react";
import Img4_2 from "@/assets/v3/section-7-2-4.svg?react";
import Corner2 from "@/assets/v3/section-7-2-corner.svg?react";
import BgImg from "@/assets/v3/section-7-bg-pc.svg?react";

import { useSplitTextAnimation } from "@/hooks/useSplitTextAnimation";

const S7_SMOOTH_EASE_OUT = [0.33, 1, 0.68, 1];

// --- Variants for Section7_1 ---
const s7_1_sectionContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const s7_1_titleVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: S7_SMOOTH_EASE_OUT, delay: custom * 0.1 },
  }),
};

const s7_1_contentRowVariants: Variants = {
  // For rows containing text, image, lists
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: S7_SMOOTH_EASE_OUT, staggerChildren: 0.2 },
  },
};

const s7_1_imageVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.9, ease: S7_SMOOTH_EASE_OUT },
  },
};

const s7_1_listVariants: Variants = {
  // For List1's UL
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.18 } },
};

const s7_1_cardVariants: Variants = {
  // For LI in List1
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: S7_SMOOTH_EASE_OUT, staggerChildren: 0.1 },
  },
};

const s7_1_cardContentVariants: Variants = {
  // For h4, p in List1 cards
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: S7_SMOOTH_EASE_OUT } },
};

const s7_1_hrVariants: Variants = {
  hidden: { opacity: 0, width: "0%" },
  visible: { opacity: 1, width: "100%", transition: { duration: 0.7, ease: S7_SMOOTH_EASE_OUT, delay: 0.2 } },
};

// --- Variants for Section7_2 ---
const s7_2_sectionContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const s7_2_titleVariants: Variants = {
  // Can be same as s7_1_titleVariants if style is consistent
  hidden: { opacity: 0, y: 25 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: S7_SMOOTH_EASE_OUT, delay: custom * 0.1 },
  }),
};

const s7_2_paragraphVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: S7_SMOOTH_EASE_OUT },
  },
};

const s7_2_cardListULVariants: Variants = {
  // For the UL grid in Section7_2
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const s7_2_cardVariants: Variants = {
  // For LI "token" cards in Section7_2
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 1, 0.5, 1], staggerChildren: 0.08 },
  },
};

const s7_2_cardIconVariants: Variants = {
  hidden: { opacity: 0, scale: 0.7, rotate: -20 },
  visible: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.5, ease: S7_SMOOTH_EASE_OUT } },
};

const s7_2_cardCornerIconVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: S7_SMOOTH_EASE_OUT, delay: 0.1 } },
};

const s7_2_cardTextContentVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: S7_SMOOTH_EASE_OUT } },
};

export default function Section() {
  return (
    <div className="relative z-10">
      <BgImg className="absolute right-0 top-0 -z-10 hidden lg:block" />
      <Section7_1 />
      <Section7_2 />
    </div>
  );
}

const data1 = [
  {
    title: "Knowledge Backer (KB)",
    des: "Backs knowledge with capital — staking on its future impact and earning a share of AI-generated returns.",
  },
  {
    title: "Collective Ownership",
    des: "Contributions from Providers, Verifiers, and Backers are bundled into shared data assets — each with provable attribution.",
  },
  {
    title: "Revenue Sharing",
    des: "As AI systems trained on these assets generate value, rewards flow back to contributors proportionally.",
  },
  {
    title: "Knowledge Data Exchange",
    des: "Backers can discover, stake on, and trade promising knowledge assets — bringing liquidity to human intelligence.",
  },
];

function List1({ className }: { className?: string }) {
  return (
    <motion.ul
      className={cn("space-y-6", className)}
      variants={s7_1_listVariants} // Orchestrated by parent (s7_1_contentRowVariants)
    >
      {data1.map((item, index) => (
        <motion.li key={item.title} variants={s7_1_cardVariants}>
          <motion.h4 className="text-base font-bold text-black" variants={s7_1_cardContentVariants}>
            {item.title}
          </motion.h4>
          <motion.p className="mt-4 text-sm leading-[22px] text-[#77777D]" variants={s7_1_cardContentVariants}>
            {item.des}
          </motion.p>
          {index !== data1.length - 1 && (
            <motion.hr key={`hr-${index}`} className="mt-4 border-[#00000014]" variants={s7_1_hrVariants} />
          )}
        </motion.li>
      ))}
    </motion.ul>
  );
}

function Section7_1() {
  const { ref: splitTextRef } = useSplitTextAnimation<HTMLDivElement>(".section-7-1-title");
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    } else {
      controls.start("hidden");
    }
  }, [isInView, controls]);

  return (
    <motion.div // Root orchestrator for Section7_1
      ref={sectionRef}
      className="section-box snap-start py-[60px] lg:py-[80px] lg:pt-[160px]"
      initial="hidden"
      animate={controls}
      variants={s7_1_sectionContainerVariants}
    >
      <div className="section lg:mb-0" ref={splitTextRef}>
        <motion.h2
          className="section-7-1-title text-[68px] font-bold leading-[96px] tracking-tighter"
          custom={0}
          variants={s7_1_titleVariants}
        >
          Tradable
        </motion.h2>
        <motion.h3
          className="section-7-1-title text-[44px] font-bold leading-[50px] tracking-tighter lg:text-[60px] lg:leading-[60px]"
          custom={1}
          variants={s7_1_titleVariants}
        >
          Onchain Assets
        </motion.h3>
      </div>
      <motion.p className="section mt-6 tracking-tight lg:mt-5 lg:text-base" variants={s7_1_cardContentVariants}>
        Owning Data Equals to Investing in Portfolio of AIs.
      </motion.p>
      <motion.div
        className="lg:hidden"
        variants={s7_1_contentRowVariants} // This row and its contents are staggered
      >
        <motion.div variants={s7_1_imageVariants} className="mt-6 aspect-[391/580]">
          <Img className="size-full" role="img" aria-label="Tradable Onchain Assets Flow" />
        </motion.div>
        <div className="section mt-6">
          <List1 />
        </div>
      </motion.div>

      {/* Desktop content row */}
      <motion.div
        className="section hidden items-stretch justify-between gap-[80px] lg:mt-[-87px] lg:flex"
        variants={s7_1_contentRowVariants} // This row and its contents are staggered
      >
        <motion.div className="flex flex-1 flex-col justify-between" variants={s7_1_contentRowVariants}>
          <div />
          <motion.div variants={s7_1_imageVariants}>
            <ImgPC />
          </motion.div>
        </motion.div>
        <div className="flex-1">
          <List1 />
        </div>
      </motion.div>
    </motion.div>
  );
}

const list2Data = [
  {
    title: "Network of Knowledge Contributors",
    des: "A global registry of domain experts and specialized AI agents — indexed by skills, contribution strength, and verification history.",
    Icon: Img1_2,
    Data: (
      <div className="text-base font-bold text-white">
        <span className="text-[30px] lg:text-[36px]">300,000+ </span>
        Verified Contributors
      </div>
    ),
  },
  {
    title: "Quality Assurance Workflow",
    des: "Composable mechanisms including staking, expert verification, and voting — enabling developers to build benchmarks, truth markets, and reliable human intelligence layers.",
    Icon: Img2_2,
    Data: (
      <div className="text-base font-bold text-white">
        {/* <span className="text-[30px] lg:text-[36px]">10 </span>TB,{" "}
        <span className="text-[30px] lg:text-[36px]">10 </span>Millions Samples,{" "}
        <span className="text-[30px] lg:text-[36px]">10 </span>Domains */}
      </div>
    ),
  },
  {
    title: "Decentralized Data Infrastructure",
    des: "Hybrid storage with on-chain proofs. ZKP, FHE, and federated learning support private, verifiable access for training and real-time inference.",
    Icon: Img3_2,
    Data: (
      <div className="text-base font-bold text-white">
        {/* <span className="text-[30px] lg:text-[36px]">$10 Millions </span>Worth */}
      </div>
    ),
  },
  {
    title: "Data Assetification",
    des: "Turns data into yield-generating assets. Enforces privacy, unlocks royalty-based rewards, and aligns long-term value between AI and knowledge sources.",
    Icon: Img4_2,
    Data: (
      <div className="text-base font-bold text-white">
        {/* <span className="text-[30px] lg:text-[36px]">$10 Millions </span>Worth */}
      </div>
    ),
  },
];

function Section7_2() {
  const { ref: splitTextRef } = useSplitTextAnimation<HTMLDivElement>(".section-7-2-title");
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    } else {
      controls.start("hidden");
    }
  }, [isInView, controls]);

  return (
    <motion.div // Root orchestrator for Section7_2
      ref={sectionRef}
      className="section section-box py-[60px] lg:snap-start lg:pb-[80px] lg:pt-[160px]"
      initial="hidden"
      animate={controls}
      variants={s7_2_sectionContainerVariants}
    >
      <div ref={splitTextRef}>
        <motion.h2
          className="section-7-2-title text-[40px] font-bold leading-[1.1] tracking-tight lg:text-[60px] lg:leading-none"
          custom={0}
          variants={s7_2_titleVariants}
        >
          Open Protocol<br className="lg:hidden"></br> to Power Decentralized AI
        </motion.h2>
      </div>

      <motion.p
        className="mt-6 text-base text-[#404049]"
        variants={s7_2_paragraphVariants} // Staggered by s7_2_sectionContainerVariants
      >
        Turn knowledge into royalty-generating assets.
        <br />
        Powered by experts, quality checks, decentralized tech & secure data.
      </motion.p>

      <motion.ul
        className="mt-[60px] place-items-stretch space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0"
        variants={s7_2_cardListULVariants} // This variant staggers its LI children
      >
        {list2Data.map((item, index) => (
          <motion.li
            key={`part-7-2-${index}`}
            className="bg-black p-6 lg:flex lg:h-[218px] lg:gap-8 lg:p-8"
            variants={s7_2_cardVariants} // Each card uses this, which staggers its internal content
          >
            <motion.div variants={s7_2_cardIconVariants}>
              <item.Icon className="size-[108px] lg:size-[88px]" />
            </motion.div>
            <div className="flex-1">
              <motion.h4
                className="mt-8 flex items-start justify-between text-base font-bold text-white lg:mt-0"
                variants={s7_2_cardTextContentVariants}
              >
                {item.title}
                <motion.div variants={s7_2_cardCornerIconVariants}>
                  <Corner2 className="ml-3 shrink-0" /> {/* Added shrink-0 for safety in flex */}
                </motion.div>
              </motion.h4>
              <motion.p
                className="mb-8 mt-6 text-sm leading-[22px] text-[#BBBBBE] lg:mb-6 lg:mt-5 lg:text-xs lg:leading-5"
                variants={s7_2_cardTextContentVariants}
              >
                {item.des}
              </motion.p>
              <motion.div variants={s7_2_cardTextContentVariants}>{item.Data}</motion.div>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
}
