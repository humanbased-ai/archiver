import { cn } from '@udecode/cn'

import Copy from './copy'
import { trackEvent, TRACK_CATEGORY } from "@/utils/track";

import logo from "@/assets/logo-2.png";
import DynamicSvg from "../dynamic-svg";

type TItem = {
  iconName: string;
  label: string;
  url: string;
};

const SOCIALS: TItem[] = [
  {
    iconName: "logo-twitter",
    label: "Twitter",
    url: "https://x.com/codatta_io",
  },
  {
    iconName: "logo-telegram",
    label: "Telegram",
    url: "https://t.me/codatta_io",
  },
  {
    iconName: "logo-medium",
    label: "Medium",
    url: "https://codatta.medium.com",
  },
  {
    iconName: "logo-discord",
    label: "Discord",
    url: "https://discord.gg/YCESVmHEYv",
  },
  {
    iconName: "logo-announcement",
    label: "Announcement",
    url: "https://t.me/codatta_ann",
  },
];
const DOCS: TItem[] = [
  {
    iconName: "logo-github",
    label: "Brand Kit",
    url: "https://github.com/codatta/brand-kit/",
  },
  {
    iconName: "logo-gitbook",
    label: "Documentation",
    url: "https://docs.codatta.io",
  },
];
const LEGALS: TItem[] = [
  {
    iconName: "privacy",
    label: "Privacy Policy",
    url: "/privacy",
  },
  {
    iconName: "items",
    label: "Terms of Service",
    url: "/terms",
  },
];

export default function Footer({ className }: { className?: string }) {
  const onClick = (url: string) => {
    if (!url) return;

    trackEvent(TRACK_CATEGORY.LINK_CLICK, {
      contentType: url,
    });
  };

  return (
    <>
      <div
        className={cn(
          "lg:flex lg:justify-between mt-[150px] lg:mt-[240px] page",
          className
        )}
      >
        <div>
          <img src={logo} className="h-9 lg:h-[56px]" />
          <p className="text-lg tracking-tight mt-4 lg:max-w-[440px]">
            Creating Data Assets, Growing a Portfolio in AI and DeSci
          </p>
        </div>
        <div className="mt-[64px] lg:mt-0 lg:text-lg lg:flex lg:items-start lg:gap-[100px] space-y-10 lg:space-y-0">
          <div>
            <h3 className="text-[#00000066] text-xl leading-8 tracking-wide font-normal">
              Social
            </h3>
            <ul className="grid grid-cols-2 gap-7 mt-4 lg:grid-cols-1">
              {SOCIALS.map((item) => (
                <li key={item.label} onClick={() => onClick(item.url)}>
                  <a
                    className="flex items-center gap-2 cursor-pointer"
                    target="_blank"
                    href={item.url}
                  >
                    <DynamicSvg iconName={item.iconName} className="w-6 h-6" />
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[#00000066] text-xl leading-8 tracking-wide font-normal">
              Docs
            </h3>
            <ul className="grid grid-cols-1 gap-7 mt-4">
              {DOCS.map((item) => (
                <li key={item.label} onClick={() => onClick(item.url)}>
                  <a
                    className="flex items-center gap-2 cursor-pointer"
                    target="_blank"
                    href={item.url}
                  >
                    <DynamicSvg iconName={item.iconName} className="w-6 h-6" />
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[#00000066] text-xl leading-8 tracking-wide font-normal">
              Legal
            </h3>
            <ul className="grid grid-cols-1 gap-7 mt-4">
              {LEGALS.map((item) => (
                <li key={item.label} onClick={() => onClick(item.url)}>
                  <a
                    className="flex items-center gap-2 cursor-pointer"
                    target="_blank"
                    href={item.url}
                  >
                    <DynamicSvg iconName={item.iconName} className="w-6 h-6" />
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="h-[1px] bg-[#0000001F] my-10 mx-6 lg:my-[60px] lg:mx-0"></div>
      <Copy />
    </>
  );
}
