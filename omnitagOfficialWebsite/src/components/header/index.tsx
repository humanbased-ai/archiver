import { cn } from "@udecode/cn";

import MobileMenu from "./mobile-menu";
import PcMenu from "./pc-menu";

export default function Header({ className }: { className?: string }) {
  return (
    <>
      <header
        className={cn(
          "fixed top-0 z-50 w-full bg-[#FFFFFF29] py-4 backdrop-blur-md lg:border-b lg:border-b-[#00000014] lg:py-5",
          className,
        )}
      >
        <MobileMenu />
        <PcMenu />
      </header>
    </>
  );
}
