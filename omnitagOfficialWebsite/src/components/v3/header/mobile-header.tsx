import React, { useState, useEffect } from "react";
import { cn } from "@udecode/cn";
import { motion, AnimatePresence } from "motion/react";

import LogoIcon from "@/assets/v3/logo.svg?react";
import closeIcon from "@/assets/icons/close-btn.svg";
import menuIcon from "@/assets/icons/menu-btn.svg";
import arrowRightIcon from "@/assets/icons/arrow-right.svg";
import CornerDownRightIcon from "@/assets/v3/corner-down-right-line.svg?react";

import Button from "@/components/button";
import ScrollLinked from "./progress";

import { TMenuItemProps, MENU_ITEMS } from "./data";
import { Link, useNavigate } from "react-router-dom";
import { TRACK_CATEGORY, trackEvent } from "@/utils/track";

interface SubMenuProps {
  title: string;
  items: TMenuItemProps[];
  href?: string;
  isOpen: boolean;
  onToggle: () => void;
}

const SubMenu: React.FC<SubMenuProps> = ({ title, items, isOpen, onToggle }) => {
  return (
    <motion.div layout className="border-b border-gray-300/80 font-sora last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-md py-4 focus:outline-none focus-visible:bg-slate-200/50"
        aria-expanded={isOpen}
      >
        <span className="text-2xl">{title}</span>
        <motion.img
          src={arrowRightIcon}
          alt="toggle submenu"
          className={cn("size-6")}
          animate={{ rotate: isOpen ? 90 : -90 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
      </button>
      <div className="h-px w-full bg-[#00000014]" />
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="submenu-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden" // 确保内容在折叠时被裁剪
          >
            <div className="py-3 text-base">
              {items.map((item, index) => (
                <motion.a
                  key={"link-" + index}
                  href={item.href}
                  target={item.target ? item.target : "_self"}
                  className="block rounded-md py-3 pl-2" // 增加了 pl-2 以示层级
                  whileHover={{ x: 5, backgroundColor: "rgba(0,0,0,0.03)" }} // 悬停时轻微右移并变色
                  transition={{ duration: 0.2 }}
                  onClick={(e) => {
                    if (item.href) {
                      e.preventDefault();
                      window.open(item.href, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[#1C1C26]">
                      {item.icon ? (
                        React.cloneElement(item.icon as React.ReactElement, { className: "size-5 " })
                      ) : (
                        <CornerDownRightIcon className="size-5" />
                      )}
                      <span className="text-base">{item.title}</span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {isOpen && <div className="h-px w-full bg-[#00000014]" />}
    </motion.div>
  );
};

// 主菜单覆盖层动画变体
const menuOverlayVariants = {
  hidden: {
    opacity: 0,
    y: "-20px",
    transition: {
      duration: 0.2,
      ease: "easeOut",
      when: "afterChildren",
    },
  },
  visible: {
    opacity: 1,
    y: "0px",
    transition: {
      duration: 0.25,
      ease: "easeIn",
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
};

// 主菜单项（SubMenu组件及其容器）的动画变体
const menuItemContainerVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { ease: "easeOut", duration: 0.2 } },
};

const Menu: React.FC = () => {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(
    MENU_ITEMS.length > 0 ? MENU_ITEMS[0].title : null, // 默认展开第一个
  );

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleSubmenu = (menuTitle: string) => {
    setActiveSubMenu(activeSubMenu === menuTitle ? null : menuTitle);
  };
  const onClick = (e: React.MouseEvent<HTMLElement> | undefined, url: string) => {
    e?.preventDefault();
    if (/^\//.test(url)) {
      console.log("navigate", url);
      navigate(url);
    } else {
      trackEvent(TRACK_CATEGORY.NAV_CLICK, { method: "click", contentType: url });
      window.open(url, "_blank", "noopener,noreferrer"); // 始终在新标签页打开外部链接
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.getElementById("mobile-app-btn")?.classList.add("hidden");
    } else {
      document.body.style.overflow = "unset";
      document.getElementById("mobile-app-btn")?.classList.remove("hidden");
    }
    return () => {
      // 清理函数
      document.body.style.overflow = "unset";
      document.getElementById("mobile-app-btn")?.classList.remove("hidden");
    };
  }, [isOpen]);

  return (
    <div className="text-[#404049]">
      <motion.button
        onClick={toggleMenu}
        className="relative z-[60] flex items-center rounded-full" // 提高 z-index, 增加交互反馈
        aria-label="Toggle menu"
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <AnimatePresence initial={false} mode="wait">
          {isOpen ? (
            <motion.img
              key="close"
              src={closeIcon}
              className="size-6"
              alt="Close menu"
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.25, ease: "circOut" }}
            />
          ) : (
            <motion.img
              key="menu"
              src={menuIcon}
              className="size-6"
              alt="Open menu"
              initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
              transition={{ duration: 0.25, ease: "circOut" }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="menu-overlay"
            className="fixed inset-x-0 top-[61px] z-50 flex h-[calc(100dvh-61px)] w-screen flex-col bg-warm p-6 shadow-2xl backdrop-blur-md" // 使用dvh, 增强背景模糊和阴影
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={menuOverlayVariants}
          >
            <motion.div
              className="custom-scrollbar grow space-y-1 overflow-y-auto pb-4 pr-1" // 为滚动条和底部内容留出空间
            >
              {MENU_ITEMS.map((item, index) => (
                <motion.div key={item.title + index} variants={menuItemContainerVariants}>
                  {"href" in item ? (
                    <a
                      href={item.href}
                      target={item.target || "_self"}
                      className="block border-b border-gray-300/80 py-4 last:border-b-0"
                    >
                      <span className="text-2xl">{item.title}</span>
                    </a>
                  ) : (
                    <SubMenu
                      title={item.title}
                      items={item.items}
                      isOpen={activeSubMenu === item.title}
                      onToggle={() => toggleSubmenu(item.title)}
                    />
                  )}
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="pb-3 pt-5" // 调整按钮区域边距
              variants={menuItemContainerVariants} // 复用或创建新的动画变体
            >
              <Button
                className="w-full rounded-lg px-6 py-3.5 text-base font-semibold tracking-wide shadow-md hover:shadow-lg active:shadow-sm" // 按钮样式微调
                onClick={(e) => onClick(e as unknown as React.MouseEvent<HTMLButtonElement>, "https://app.codatta.io/")}
              >
                Launch App
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Header() {
  return (
    <>
      <ScrollLinked />
      <header className="section sticky top-0 z-[55] flex h-[60px] items-center justify-between shadow-sm backdrop-blur-sm">
        <Link to="/" className="-ml-2 cursor-pointer p-2">
          <LogoIcon className="h-6" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            id="mobile-app-btn"
            className="text-base font-semibold text-[#1C1C26]" // 按钮样式微调
            to="https://app.codatta.io/"
          >
            App
          </Link>
          <Menu />
        </div>
      </header>
    </>
  );
}
