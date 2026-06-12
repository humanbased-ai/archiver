import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react"; // 确保是 framer-motion
import { Link, useNavigate } from "react-router-dom";

import Logo from "@/assets/v3/logo-text.svg"; // 假设这是图片路径
import arrowUpRightIcon from "@/assets/icons/arrow-up-right.svg";
import NavBox from "@/assets/v3/nav-item-box.svg?react";
import CornerDownRightIcon from "@/assets/v3/corner-down-right-line.svg?react"; // 修正拼写

import { MENU_ITEMS, TMenuItemProps } from "./data";
import { TRACK_CATEGORY, trackEvent } from "@/utils/track";

// 下拉菜单容器动画变体
const dropdownContainerVariants = {
  hidden: {
    opacity: 0,
    y: -15, // 起始位置稍远一些
    scaleY: 0.98, // 轻微垂直压缩
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1], // Expo Out缓动
      when: "afterChildren", // 子元素先消失
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    scaleY: 1,
    transition: {
      duration: 0.3, // 动画时间稍长，更优雅
      ease: [0.22, 1, 0.36, 1], // Expo Out缓动
      delayChildren: 0.1, // 子元素延迟出现
      staggerChildren: 0.06, // 子元素交错出现
    },
  },
  exit: {
    // 与hidden类似或更快速
    opacity: 0,
    y: -15,
    scaleY: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.6, 0, 0.8, 0], // Expo In
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
};

// 下拉菜单项动画变体
const dropdownItemVariants = {
  hidden: { opacity: 0, x: -10, scale: 0.95 }, // 从左侧轻微移入并缩放
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 250, damping: 25 },
  },
  exit: { opacity: 0, x: 5, scale: 0.95, transition: { duration: 0.1 } },
};

const DropdownMenu = ({ items, isOpen }: { items: TMenuItemProps[]; isOpen: boolean }) => {
  const navigate = useNavigate();

  const onClick = (e: React.MouseEvent<HTMLElement> | undefined, url: string) => {
    e?.preventDefault();
    if (/^\//.test(url)) {
      navigate(url);
    } else {
      trackEvent(TRACK_CATEGORY.NAV_CLICK, { method: "click", contentType: url });
      window.open(url, "_blank", "noopener,noreferrer"); // 始终在新标签页打开外部链接
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={dropdownContainerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="absolute inset-x-0 top-[calc(80px-1px)] z-40 w-full overflow-hidden rounded-b-lg bg-warm shadow-2xl backdrop-blur-md" // 调整top值紧贴导航栏，增加圆角和更强的阴影、模糊
        >
          <div className="section flex gap-x-5 pb-[50px] pt-8">
            {items.map((item, index) => (
              <motion.div
                key={item.title + index}
                onClick={(e) => item.href && onClick(e, item.href)}
                className="group relative flex h-[102px] w-[350px] cursor-pointer flex-col justify-end p-6 transition-colors duration-200" // 使用white/70作为hover背景
                variants={dropdownItemVariants}
                whileHover={{ y: -3, scale: 1.015 }} // 轻微上浮和放大
                transition={{ type: "spring", stiffness: 350, damping: 15 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {item.icon ? (
                      React.cloneElement(item.icon as React.ReactElement, { className: "size-5 text-slate-700" }) // 确保图标有合适的大小和颜色
                    ) : (
                      <CornerDownRightIcon className="size-5 text-slate-600" />
                    )}
                    <h3
                      className={`text-sm font-semibold leading-4 transition-colors duration-200 ${item.href ? "text-slate-800 group-hover:text-blue-600" : "text-slate-800"}`}
                    >
                      {item.title}
                    </h3>
                  </div>
                  <img
                    src={arrowUpRightIcon}
                    className="size-4 text-slate-600 opacity-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:opacity-100" // 箭头hover时也轻微移动
                  />
                </div>
                {/* NavBox可以作为背景装饰，也可以考虑让它对hover有响应 */}
                <NavBox className="absolute left-0 top-0 -z-10 h-[111px] w-[359px] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PCMenu = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleMouseEnter = (title: string | null) => {
    if (title) setActiveMenu(title);
  };

  const handleMouseLeave = () => {
    setActiveMenu(null);
  };

  const onClick = (e: React.MouseEvent<HTMLElement> | undefined, url: string) => {
    e?.preventDefault();
    if (/^\//.test(url)) {
      navigate(url);
    } else {
      trackEvent(TRACK_CATEGORY.NAV_CLICK, { method: "click", contentType: url });
      window.open(url, "_blank", "noopener,noreferrer"); // 始终在新标签页打开外部链接
    }
  };

  return (
    <header className="sticky top-0 z-50 shadow-sm backdrop-blur-md">
      <nav className="section mx-auto flex h-[80px] items-center justify-between lg:min-w-[720px]">
        <Link to="/">
          <img
            src={Logo}
            className="relative z-30 h-8 cursor-pointer transition-transform hover:scale-105 md:h-9" // Logo hover效果
            alt="Codatta Logo"
          />
        </Link>
        <div className="flex items-center gap-x-8 lg:gap-x-10 xl:gap-x-12">
          {MENU_ITEMS.map((item) => (
            <div
              key={item.title}
              className="flex cursor-pointer items-center py-2" // 增加py使hover区域更舒适
              onMouseEnter={() => handleMouseEnter("items" in item ? item.title : null)} // 只有有子菜单的项才激活
              onMouseLeave={handleMouseLeave} // 移出整个区域（包括可能的下拉菜单）时关闭
              onClick={(e) => "href" in item && onClick(e, item.href)} // 如果有href则点击跳转
            >
              <span
                className={`text-base transition-colors duration-200 ${activeMenu === item.title ? "font-medium text-blue-600" : "href" in item ? "text-slate-700 hover:text-blue-600" : "text-slate-700 hover:text-slate-900"}`}
              >
                {item.title}
              </span>
              {"items" in item && (
                <motion.svg
                  className={`ml-1.5 size-4 transition-colors duration-200 ${activeMenu === item.title ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{ rotate: activeMenu === item.title ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </motion.svg>
              )}
              {/* 下方添加一个激活指示器，可选 */}
              <AnimatePresence>
                {activeMenu === item.title && "items" in item && (
                  <motion.div
                    className="absolute inset-x-0 -bottom-px h-[2.5px] bg-blue-600"
                    layoutId={`underline-${item.title}`} // 平滑切换的下划线
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </AnimatePresence>

              {"items" in item && <DropdownMenu items={item.items} isOpen={item.title === activeMenu} />}
            </div>
          ))}
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="https://app.codatta.io/"
              className="flex cursor-pointer items-center justify-center rounded-md border border-solid border-[#000000] bg-black px-5 py-2 text-sm font-medium tracking-tight text-white shadow-sm hover:shadow-md active:shadow-inner"
            >
              Launch App
            </Link>
          </motion.div>
        </div>
      </nav>
    </header>
  );
};

export default PCMenu;
