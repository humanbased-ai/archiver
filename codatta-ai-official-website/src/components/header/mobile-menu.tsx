import React, { useState } from "react";
import { cn } from "@udecode/cn";

import closeIcon from "@/assets/icons/close-btn.svg";
import menuIcon from "@/assets/icons/menu-btn.svg";
import arrowRightIcon from "@/assets/icons/arrow-right.svg";
import arrowUpRightIcon from "@/assets/icons/arrow-up-right.svg";
import Logo from "@/assets/home/logo.png";

import { TMenuItemProps, FRONTIER_ITEMS, COMMUNITY_ITEMS, BUTTON } from "./data";

interface SubMenuProps {
  title: string;
  items: TMenuItemProps[];
  isOpen: boolean;
  onToggle: () => void;
}

const SubMenu: React.FC<SubMenuProps> = ({ title, items, isOpen, onToggle }) => {
  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center justify-between">
        <span className="text-base">{title}</span>
        <img
          src={arrowRightIcon}
          className={cn("h-5 w-5 text-gray-400 transition-transform", isOpen ? "rotate-90" : "")}
        />
      </button>
      {isOpen && (
        <div className="mt-4 space-y-2">
          {items.map((item, index) => (
            <a key={index} href={item.href} className="block rounded-xl bg-[#0000000A] p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{item.title}</span>
                <img src={arrowUpRightIcon} className="size-4 text-gray-400" />
              </div>
              {item.description && (
                <p className="mt-2 line-clamp-2 text-xs leading-[18px] text-gray-500">{item.description}</p>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

const subMenuItems = [
  {
    title: "Frontier",
    items: FRONTIER_ITEMS,
  },
  // {
  //   title: "Ecosystem",
  //   items: COMMUNITY_ITEMS,
  // },
  {
    title: "Community",
    items: COMMUNITY_ITEMS,
  },
];

const Menu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleSubmenu = (menu: string) => {
    setActiveSubMenu(activeSubMenu === menu ? null : menu);
  };

  const onClick = (e: React.MouseEvent<MouseEvent>, url: string) => {
    e.preventDefault();
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  return (
    <div className="page mx-auto flex items-center justify-between lg:hidden">
      <img src={Logo} className="relative z-30 h-8" />
      <div>
        <button onClick={toggleMenu} className="relative z-50 flex items-center p-2" aria-label="Toggle menu">
          {isOpen ? <img src={closeIcon} className="size-6" /> : <img src={menuIcon} className="size-6" />}
        </button>

        {/* Overlay */}
        {isOpen && (
          <div className="fixed inset-0 z-20 flex h-screen w-screen flex-col justify-end gap-12 overflow-y-auto bg-white p-6">
            {/* Menu content */}

            {subMenuItems.map((item, index) => (
              <SubMenu
                key={item.title + index}
                title={item.title}
                items={item.items}
                isOpen={activeSubMenu === item.title}
                onToggle={() => toggleSubmenu(item.title)}
              />
            ))}

            <button
              className="px-6 py-2"
              onClick={(e) => onClick(e as unknown as React.MouseEvent<MouseEvent>, BUTTON.url)}
            >
              {BUTTON.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
