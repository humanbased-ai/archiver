// import React, { useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { COMMUNITY_ITEMS, FRONTIER_ITEMS, TMenuItemProps } from "./data";

import Logo from "@/assets/home/logo.png";
// import arrowUpRightIcon from "@/assets/icons/arrow-up-right.svg";

// const DropdownMenu = ({ items, isOpen }: { items: TMenuItemProps[]; isOpen: boolean }) => {
//   return (
//     <AnimatePresence>
//       {isOpen && (
//         <motion.div
//           initial={{ opacity: 0, y: -10 }}
//           animate={{ opacity: 1, y: 0 }}
//           exit={{ opacity: 0, y: -10 }}
//           transition={{ duration: 0.2 }}
//           className="absolute left-0 top-[60px] w-[420px] rounded-2xl border border-[#00000014] bg-white p-3 shadow-lg"
//         >
//           <div className="grid grid-cols-1 gap-8">
//             {items.map((item, index) => (
//               <a key={item.title + index} href={item.href} className="group rounded-xl p-4 hover:bg-[#0000000A]">
//                 <div className="flex items-center justify-between">
//                   <h3 className="text-sm font-semibold leading-4 text-black">{item.title}</h3>
//                   <img src={arrowUpRightIcon} className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
//                 </div>
//                 <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#666666]">{item.description}</p>
//               </a>
//             ))}
//           </div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   );
// };

const PCMenu = () => {
  // const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // const onClick = (e: React.MouseEvent<HTMLElement> | undefined, url: string) => {
  //   e?.preventDefault();
  //   if (url) {
  //     window.open(url);
  //   }
  // };

  // const BUTTON = {
  //   label: "Launch App",
  //   url: "https://app.codatta.io/",
  // };

  // const subMenuItems = [
  //   {
  //     title: "Frontier",
  //     items: FRONTIER_ITEMS,
  //   },
  //   {
  //     title: "Community",
  //     items: COMMUNITY_ITEMS,
  //   },
  // ];

  return (
    <nav className="px-6 min-w-[320px] max-w-[1680px] m-auto lg:px-[80px] xl:px-[120px] mx-auto hidden items-center justify-between lg:flex">
      <img src={Logo} className="relative z-30 h-8" alt="Logo" />
      <div className="hidden lg:flex lg:items-center lg:gap-20">
        {/* {subMenuItems.map((item, index) => (
          <div
            key={index}
            className="relative flex cursor-pointer items-center space-x-1 text-base text-gray-700 transition-colors hover:text-gray-900"
            onMouseEnter={() => setActiveMenu(item.title)}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <span>{item.title}</span>
            {item.items && (
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}

            {item.items && <DropdownMenu items={item.items} isOpen={activeMenu === item.title} />}
          </div>
        ))} */}
      </div>
      {/* <button className="px-6 py-2 transition-colors hover:bg-gray-800" onClick={(e) => onClick(e, BUTTON.url)}>
        {BUTTON.label}
      </button> */}
    </nav>
  );
};

export default PCMenu;
