import { cn } from "@udecode/cn";
import { useRef, useEffect } from "react"; // useEffect for initial animation trigger if needed
import { motion, useInView, useAnimation, Variants } from "motion/react"; // Corrected import for framer-motion

import logo from "@/assets/logo-2.png";
import DynamicSvg from "@/components/dynamic-svg";

import LogoBg from "@/components/v3/logo-bg";
import { useNavigate } from "react-router-dom";
import { TRACK_CATEGORY, trackEvent } from "@/utils/track";

type TItem = {
  iconName: string;
  label: string;
  url: string;
};

const SOCIALS: TItem[] = [
  { iconName: "logo-twitter", label: "Twitter", url: "https://x.com/codatta_io" },
  { iconName: "logo-telegram", label: "Telegram", url: "https://t.me/codatta_io" },
  { iconName: "logo-medium", label: "Medium", url: "https://codatta.medium.com" },
  { iconName: "logo-discord", label: "Discord", url: "https://discord.gg/YCESVmHEYv" },
  { iconName: "logo-announcement", label: "Announcement", url: "https://t.me/codatta_ann" },
];
const DOCS: TItem[] = [
  { iconName: "logo-github", label: "Brand Kit", url: "https://github.com/codatta/brand-kit/" },
  { iconName: "logo-gitbook", label: "Documentation", url: "https://docs.codatta.io" },
  {
    iconName: "whitepaper-lite",
    label: "MiCA Whitepaper",
    url: "https://static.codatta.io/static/CODATTA%20%28XNY%29%20White%20paper.pdf",
  },
];
const LEGALS: TItem[] = [
  { iconName: "privacy", label: "Privacy Policy", url: "/privacy" },
  { iconName: "items", label: "Terms of Service", url: "/terms" },
];

// --- 优化后的动画 Variants ---

// 整体容器动画
const footerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      // duration: 0.3, // 容器自身的淡入可以快一些
      staggerChildren: 0.2, // 子元素入场间隔
      delayChildren: 0.1, // 子元素开始前的整体延迟
    },
  },
};

// 主要区块 (例如 Logo区域, 链接区域整体)
const sectionBlockVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1], // "easeOutExpo" like
    },
  },
};

// Logo 动画
const logoVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1], // "easeOutExpo"
      // delay: 0.1, // 可选：在 sectionBlockVariants 之后再稍微延迟一点
    },
  },
};

// 普通文本段落 (如Logo下的描述, 版权信息)
const textParagraphVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1.0], // Smooth ease-out
      // delay: 0.2, // 可选：在logo之后
    },
  },
};

// 链接列的容器 (用于编排单个列的入场)
const linkColumnContainerVariants: Variants = {
  hidden: {}, // 父级 sectionBlockVariants 控制显隐和位移
  visible: {
    transition: {
      staggerChildren: 0.2, // Social, Docs, Legal 各列之间的间隔
    },
  },
};

// 单个链接列 (Social, Docs, Legal)
const linkColumnVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.1, // 列标题和列表项之间的间隔
      delayChildren: 0.1, // 列标题出现后，列表项开始前的延迟
    },
  },
};

// 链接列标题 H3
const columnTitleVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

// 列表项 (ul) 的容器，用于编排 li
const listContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12, // 各个 li 之间的间隔
    },
  },
};

// 单个链接项 Li
const linkItemVariants: Variants = {
  hidden: { opacity: 0, x: 15 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut",
    },
  },
};

// HR 分割线动画
const hrVariants: Variants = {
  hidden: { opacity: 0, width: "0%" },
  visible: {
    opacity: 1,
    width: "100%",
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.1, // 稍微延迟，让它在内容开始出现时或之后展开
    },
  },
};

// 背景 LogoBg 动画
const backgroundLogoVariants: Variants = {
  hidden: { opacity: 0, scale: 1.05 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 1.2,
      ease: "easeOut",
      delay: 0.5, // 较晚出现，作为背景衬托
    },
  },
};

export default function Footer({ className }: { className?: string }) {
  const footerRef = useRef<HTMLDivElement>(null);
  // 动画只播放一次，当元素0.2的面积进入视口时
  const isInView = useInView(footerRef, { once: true, amount: 0.2 });
  const controls = useAnimation();
  const navigate = useNavigate();

  const onClick = (e: React.MouseEvent<HTMLElement> | undefined, url: string) => {
    e?.preventDefault();
    if (/^\//.test(url)) {
      console.log("navigate", url);
      navigate(url);
    } else {
      console.log("link click", url);
      trackEvent(TRACK_CATEGORY.LINK_CLICK, { method: "click", contentType: url });
      window.open(url, "_blank", "noopener,noreferrer"); // 始终在新标签页打开外部链接
    }
  };

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
    // 如果希望元素离开视口后动画重置并能再次播放（一般页脚不需要），可以添加下面逻辑：
    // else { controls.start("hidden"); } // Optional: Reset animation when out of view
  }, [isInView, controls]);

  return (
    <motion.div
      ref={footerRef}
      className="section-box relative snap-start justify-between overflow-hidden pb-[60px] pt-0 lg:py-[80px] lg:pb-[40px]"
      initial="hidden"
      animate={controls}
      variants={footerContainerVariants} // 主容器动画
    >
      {/* HR 动画 (移动端) */}
      <div>
        <motion.hr className="relative z-30 border-[#0000001F] pb-[60px] lg:hidden" variants={hrVariants} />

        <motion.div
          className={cn("section relative z-30 lg:my-[80px] lg:flex lg:justify-between", className)}
          variants={sectionBlockVariants} // 主要内容区块作为一个整体先进场
        >
          {/* 左侧 Logo 和描述 */}
          <motion.div
            className="lg:w-[450px]"
            // variants={sectionBlockVariants} // 父级 sectionBlockVariants 控制
          >
            <motion.img
              src={logo}
              alt="Codatta Logo"
              className="h-11 cursor-pointer"
              variants={logoVariants}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              onClick={() => navigate("/v3")}
            />
            <motion.p className="mt-4 text-lg" variants={textParagraphVariants}>
              Knowledge Layer for AI: Your Knowledge, Your Data Asset, Endless AI Royalties
            </motion.p>
          </motion.div>

          {/* 右侧链接区域 */}
          <motion.div
            className="mt-[64px] space-y-10 lg:mt-0 lg:flex lg:gap-[100px] lg:space-y-0 lg:text-lg"
            variants={linkColumnContainerVariants} // 用于编排 Social, Docs, Legal 列
          >
            {/* Social 列 */}
            <motion.div variants={linkColumnVariants}>
              <motion.h3 className="text-xl font-normal leading-8 text-[#00000066]" variants={columnTitleVariants}>
                Social
              </motion.h3>
              <motion.ul
                className="mt-4 grid grid-cols-2 gap-7 lg:grid-cols-1"
                variants={listContainerVariants} // 用于编排 li
              >
                {SOCIALS.map((item) => (
                  <motion.li
                    key={item.label}
                    className="transition-all" // You can keep this or remove if Framer Motion handles all transitions
                    variants={linkItemVariants}
                    whileHover={{ scale: 1.08, transition: { duration: 0.2, ease: "easeInOut" } }} // Added smooth scale
                  >
                    <a
                      className="flex cursor-pointer items-center gap-2"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={item.url}
                      onClick={(e) => onClick(e as unknown as React.MouseEvent<HTMLButtonElement>, item.url)}
                    >
                      <DynamicSvg iconName={item.iconName} className="size-6" />
                      {item.label}
                    </a>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            {/* Docs 列 */}
            <motion.div variants={linkColumnVariants}>
              <motion.h3
                className="text-xl font-normal leading-8 tracking-wide text-[#00000066]"
                variants={columnTitleVariants}
              >
                Docs
              </motion.h3>
              <motion.ul className="mt-4 grid grid-cols-1 gap-7" variants={listContainerVariants}>
                {DOCS.map((item) => (
                  <motion.li
                    key={item.label}
                    variants={linkItemVariants} // Apply initial animation for the list item
                    whileHover={{ scale: 1.08, transition: { duration: 0.2, ease: "easeInOut" } }} // Added smooth scale
                  >
                    <a
                      className="flex cursor-pointer items-center gap-2"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={item.url}
                      onClick={(e) => onClick(e as unknown as React.MouseEvent<HTMLButtonElement>, item.url)}
                    >
                      <DynamicSvg iconName={item.iconName} className="size-6" />
                      {item.label}
                    </a>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            {/* Legal 列 */}
            <motion.div variants={linkColumnVariants}>
              <motion.h3
                className="text-xl font-normal leading-8 tracking-wide text-[#00000066]"
                variants={columnTitleVariants}
              >
                Legal
              </motion.h3>
              <motion.ul className="mt-4 grid grid-cols-1 gap-7" variants={listContainerVariants}>
                {LEGALS.map((item) => (
                  <motion.li
                    key={item.label}
                    variants={linkItemVariants} // Apply initial animation for the list item
                    whileHover={{ scale: 1.08, transition: { duration: 0.2, ease: "easeInOut" } }} // Added smooth scale
                  >
                    {/* 对于内部链接，不需要 target="_blank" */}
                    <a
                      className="flex cursor-pointer items-center gap-2"
                      href={item.url}
                      onClick={(e) => onClick(e as unknown as React.MouseEvent<HTMLButtonElement>, item.url)}
                      target={item.url.startsWith("/") ? "_self" : "_blank"}
                      rel="noopener noreferrer"
                    >
                      <DynamicSvg iconName={item.iconName} className="size-6" />
                      {item.label}
                    </a>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* 版权信息 */}
      <motion.p
        className="relative z-30 mt-10 text-center text-sm"
        variants={textParagraphVariants} // 可以复用段落动画，或者给一个更靠后的延迟
      >
        © {new Date().getFullYear()} - Codatta Inc. All Rights Reserved.
      </motion.p>

      {/* 背景 Logo */}
      <motion.div
        variants={backgroundLogoVariants}
        style={{
          position: "absolute",
          zIndex: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <LogoBg />
      </motion.div>
    </motion.div>
  );
}
