import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Button from "@/components/button";
import { trackEvent, TRACK_CATEGORY } from "@/utils/track";
import { COMMUNITY_ITEMS, FRONTIER_ITEMS, SOCIAL_MEDIAS, TMenuItemProps } from "./data";

import Logo from "@/assets/logo-2.png";
import arrowUpRightIcon from "@/assets/icons/arrow-up-right.svg";

const DropdownMenu = ({ items, isOpen }: { items: TMenuItemProps[]; isOpen: boolean }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-x-0 top-[61px] bg-[#E1E4E9] pb-[60px] pt-10 shadow-lg"
        >
          <div className="grid grid-cols-1 gap-8">
            {items.map((item, index) => (
              <a
                key={item.title + index}
                href={item.href}
                target={item.target ? item.target : "_self"}
                className="group rounded-xl p-4 hover:bg-[#0000000A]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.icon && item.icon}
                    <h3 className="text-sm font-semibold leading-4 text-black">{item.title}</h3>
                  </div>
                  <img src={arrowUpRightIcon} className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                {item.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#666666]">{item.description}</p>
                )}
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PCMenu = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const onClick = (e: React.MouseEvent<HTMLElement> | undefined, url: string) => {
    e?.preventDefault();
    trackEvent(TRACK_CATEGORY.NAV_CLICK, { method: "click", contentType: url });
    if (url) {
      window.open(url);
    }
  };

  const BUTTON = {
    label: "Launch App",
    url: "https://app.codatta.io/",
  };

  const subMenuItems = [
    {
      title: "Ecosystem",
      items: FRONTIER_ITEMS,
    },
    {
      title: "Community",
      items: COMMUNITY_ITEMS,
    },
    {
      title: "Contact Us",
      items: SOCIAL_MEDIAS,
    },
  ];

  return (
    <nav className="page mx-auto hidden items-center justify-between lg:flex">
      <img src={Logo} className="relative z-30 h-8" alt="Logo" />
      <div className="hidden lg:flex lg:items-center lg:gap-20">
        {subMenuItems.map((item, index) => (
          <div
            key={index}
            className="flex cursor-pointer items-center space-x-1 text-base text-gray-700 transition-colors hover:text-gray-900"
            onMouseEnter={() => setActiveMenu(item.title)}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <span
              className={`border-b py-[6px] transition-all duration-300 ${item.title === activeMenu ? "border-black" : "border-white"}`}
            >
              {item.title}
            </span>
            {item.items && (
              <svg
                className={`size-5 transition-all duration-300 ${activeMenu === item.title ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}

            {item.items && <DropdownMenu items={item.items} isOpen={activeMenu === item.title} />}
          </div>
        ))}
      </div>
      <Button className="px-6 py-2 transition-colors hover:bg-gray-800" onClick={(e) => onClick(e, BUTTON.url)}>
        {BUTTON.label}
      </Button>
    </nav>
  );
};

export default PCMenu;
