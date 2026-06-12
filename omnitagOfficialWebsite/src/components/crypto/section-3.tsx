import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation, Variants } from "motion/react";

// Icons (assuming imports are correct as per previous)
import Icon1 from "@/assets/crypto/contribute-icons/1.svg?react";
import Icon2 from "@/assets/crypto/contribute-icons/2.svg?react";
import Icon3 from "@/assets/crypto/contribute-icons/3.svg?react";
import Icon4 from "@/assets/crypto/contribute-icons/4.svg?react";
import Icon5 from "@/assets/crypto/contribute-icons/5.svg?react";
import Icon6 from "@/assets/crypto/contribute-icons/6.svg?react";
import Icon7 from "@/assets/crypto/contribute-icons/7.svg?react";
import Icon8 from "@/assets/crypto/contribute-icons/8.svg?react";
import Icon9 from "@/assets/crypto/contribute-icons/9.svg?react";
import Icon10 from "@/assets/crypto/contribute-icons/10.svg?react";
import Icon11 from "@/assets/crypto/contribute-icons/11.svg?react";
import Icon12 from "@/assets/crypto/contribute-icons/12.svg?react";

// --- Reusable Animation Variants ---
const SMOOTH_EASE = [0.22, 1, 0.36, 1];

const sectionRootVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const paragraphTextEntryVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: SMOOTH_EASE },
  },
};

const partContainerVariant: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: SMOOTH_EASE,
      staggerChildren: 0.15,
    },
  },
};

const groupWithStaggeredItemsVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: SMOOTH_EASE,
      staggerChildren: 0.1, // Default stagger for other groups
    },
  },
};

// --- NEW Variant for Card2 Icons for near-simultaneous entry ---
const card2IconsContainerVariant: Variants = {
  hidden: { opacity: 0, y: 20 }, // Container itself can animate in
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5, // Duration for the container to become visible
      ease: SMOOTH_EASE,
      staggerChildren: 0.03, // Very small stagger for icons to appear almost at once
      delayChildren: 0.1, // Optional: slight delay before icons start appearing
    },
  },
};

const contentItemVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: SMOOTH_EASE },
  },
};

// --- NEW Title Variants for Prominence ---
const prominentTitleContainerVariant: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: SMOOTH_EASE,
      staggerChildren: 0.15, // Stagger individual lines of the title
    },
  },
};

const titleLineVariant: Variants = {
  hidden: { opacity: 0, y: 20, skewY: 2 },
  visible: {
    opacity: 1,
    y: 0,
    skewY: 0,
    transition: { duration: 0.6, ease: SMOOTH_EASE },
  },
};
// --- End of Animation Variants ---

export default function Section() {
  // const onClickAccess = () => {
  //   window.open("https://cryptodefendersalliance.com/", "_blank");
  // };
  const onClickContribute = () => {
    console.log("Navigate to contribute page/action");
    window.open("https://app.codatta.io/app", "_blank");
  };

  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.1 });
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
      className="section section-box py-[60px] lg:snap-start lg:pb-[80px] lg:pt-[160px]"
      initial="hidden"
      animate={controls}
      variants={sectionRootVariants}
    >
      {/* Top content: Text block and Buttons block */}
      <motion.div variants={partContainerVariant} className="lg:flex lg:items-end lg:justify-between lg:gap-[100px]">
        <motion.div variants={groupWithStaggeredItemsVariant}>
          <motion.div variants={prominentTitleContainerVariant} className="lg:hidden">
            <motion.h1 variants={titleLineVariant} className="text-5xl font-bold leading-none tracking-tighter">
              Production-
            </motion.h1>
            <motion.h3 variants={titleLineVariant} className="text-[32px] font-bold leading-none tracking-tighter">
              Grade Database, Built by a Growing Community
            </motion.h3>
          </motion.div>
          {/* Desktop Title - Now uses prominentTitleContainerVariant */}
          <motion.div variants={prominentTitleContainerVariant} className="hidden lg:block">
            <motion.h1 variants={titleLineVariant} className="text-[60px] font-bold leading-none tracking-tighter">
              Production-Grade Database,
            </motion.h1>
            <motion.h3 variants={titleLineVariant} className="text-[48px] font-bold leading-none tracking-tighter">
              Built by a Growing Community
            </motion.h3>
          </motion.div>
          <motion.p variants={contentItemVariant} className="mt-6 text-base text-[#404049]">
            Over 560 million labeled addresses across 10+ blockchains – contributed by top organizations and individual
            members through{" "}
            <a href="https://cryptodefendersalliance.com/" className="text-[#fca800]" target="_blank">
              Crypto Defenders Alliance
            </a>{" "}
            and{" "}
            <a href="https://microscopeprotocol.net/" className="text-[#fca800]" target="_blank">
              Microscope Protocol
            </a>
            .
          </motion.p>
        </motion.div>

        {/* Buttons Block */}
        <motion.div
          variants={groupWithStaggeredItemsVariant}
          className="mt-6 flex shrink-0 items-center gap-3 text-nowrap text-sm leading-7 tracking-tight lg:mt-0 lg:w-[410px] lg:gap-5 lg:text-base"
        >
          {/* <motion.button
            variants={contentItemVariant}
            className="flex-1 cursor-pointer rounded-full bg-black px-3 py-2 text-white lg:px-6"
            onClick={onClickAccess}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            Apply for Access
          </motion.button> */}
          <div className="flex-1"></div>
          <motion.button
            variants={contentItemVariant}
            className="flex-1 cursor-pointer rounded-full border bg-white px-3 py-2 text-black lg:px-6"
            onClick={onClickContribute}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            Start to Contribute
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Cards Container */}
      <motion.div
        variants={partContainerVariant}
        className="lg:mt-[80px] lg:flex lg:items-stretch lg:justify-between lg:gap-[60px]"
      >
        <Card1 />
        <Card2 />
      </motion.div>

      {/* Footnote Paragraph */}
      <motion.p variants={paragraphTextEntryVariant} className="mt-10 text-sm leading-[1.1] text-[#404049]">
        * Some members contribute through Crypto Defenders Alliance or Microscope Protocol, helping to build open,
        high-quality crypto address data.
      </motion.p>
    </motion.div>
  );
}

function Card1() {
  const card1Data = [
    { title: "46 Million", des: "High-Risk Addresses" },
    { title: "560 Million", des: "Annotations" },
    { title: "95", des: "Categories" },
    { title: "35", des: "Network Support" },
  ];

  return (
    <motion.div
      variants={partContainerVariant} // This card itself will animate as part of its parent's stagger
      className="mt-[60px] border border-dashed border-[#000000] p-6 text-[#404049] lg:mt-0 lg:flex-1 lg:px-0"
    >
      <motion.h3
        variants={contentItemVariant}
        className="relative z-10 mt-[-40px] text-base font-bold leading-none lg:mt-[-38px] lg:text-center lg:text-xl"
      >
        <span className="bg-warm px-2 lg:py-1">560 Million Labeled Addresses, 10+ Blockchains Supported</span>
      </motion.h3>
      <motion.ul
        variants={groupWithStaggeredItemsVariant} // Uses the original stagger for its items
        className="mt-6 space-y-3 lg:mt-11 lg:grid lg:grid-cols-2 lg:grid-rows-2 lg:gap-x-[60px] lg:gap-y-10 lg:space-y-0 lg:px-[74px]"
      >
        {card1Data.map((item) => (
          <motion.li variants={contentItemVariant} key={item.title}>
            <h5 className="text-[32px] font-bold leading-[40px] text-[#1C1C26] lg:text-[36px] lg:leading-[44px]">
              {item.title}
            </h5>
            <p className="text-nowrap text-base font-bold leading-5 lg:mt-2 lg:text-xl lg:leading-6">{item.des}</p>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
}

function Card2() {
  const list = [
    { Icon: Icon1, link: "http://binance.com/" },
    { Icon: Icon2, link: "https://www.chainalysis.com/" },
    { Icon: Icon3, link: "http://coinbase.com/" },
    { Icon: Icon4, link: "http://circle.com/" },
    { Icon: Icon5, link: "http://messari.io/" },
    { Icon: Icon6, link: "http://changelly.com/" },
    { Icon: Icon7, link: "https://www.elliptic.co/" },
    { Icon: Icon8, link: "http://hacken.io/" },
    { Icon: Icon9, link: "http://consensys.net/" },
    { Icon: Icon10, link: "http://slowmist.com/" },
    { Icon: Icon11, link: "https://crystalintelligence.com/" },
    { Icon: Icon12, link: "https://polkadot.com/" },
  ];

  return (
    <motion.div
      variants={partContainerVariant} // This card itself will animate as part of its parent's stagger
      className="mt-[56px] border border-dashed border-[#000000] p-6 text-[#404049] lg:mt-0 lg:flex-1"
    >
      <motion.h3
        variants={contentItemVariant} // Title animates as a content item
        className="relative z-10 mt-[-33px] text-base font-bold leading-none lg:mt-[-38px] lg:text-center lg:text-xl"
      >
        <span className="bg-warm px-2 lg:py-1">Contributed by</span>
      </motion.h3>
      <motion.ul
        // Apply the new variant here for near-simultaneous icon appearance
        variants={card2IconsContainerVariant}
        className="mt-6 grid grid-cols-4 grid-rows-3 gap-x-4 gap-y-7 lg:gap-x-[30px] lg:gap-y-6"
      >
        {list.map((item, index) => (
          <motion.li
            // Each icon will use contentItemVariant, but their start time is now very close
            variants={contentItemVariant}
            key={"contribute-icon-" + index}
            className="flex items-center justify-center"
          >
            <item.Icon className="hover:cursor-pointer" onClick={() => window.open(item.link, "_blank")} />
          </motion.li>
        ))}
      </motion.ul>
      <motion.p variants={contentItemVariant} className="mt-5 lg:text-center lg:text-base">
        ··· More ···
      </motion.p>
    </motion.div>
  );
}
