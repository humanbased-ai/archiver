import { Link } from "@remix-run/react";
import { cn } from "@udecode/cn";
import { trackEvent, TRACK_CATEGORY } from "~/utils/track";

import logoImg from "~/assets/svg/logo.svg";

export default function Header({ className }: { className?: string }) {
  const onClick = () => {
    trackEvent(TRACK_CATEGORY.NAV_CLICK, {
      contentType: "https://app.codatta.io/app",
    });
  };

  return (
    <>
      <header
        className={cn("py-4 flex items-center justify-between", className)}
      >
        <img src={logoImg} className="h-8" />
        <div className="font-bold text-base">DATA PROFILE</div>
        <Link
          to="https://app.codatta.io/app"
          className="rounded-full px-6 py-2 border border-solid border-white bg-none font-normal text-xs hover:text-primary hover:border-primary"
          onClick={onClick}
        >
          View More
        </Link>
      </header>
      <div className="h-[1px] bg-[#FFFFFF1F] w-full"></div>
    </>
  );
}
