import React from "react";
import TwitterIcon from "@/assets/twitter-icon.svg";
import MediumIcon from "@/assets/medium-icon.svg";
import TelegramIcon from "@/assets/telegram-icon.svg";
import DiscordIcon from "@/assets/discord-icon.svg";

export type TMenuItem =
  | {
      title: string;
      items: TMenuItemProps[];
    }
  | {
      title: string;
      href: string;
      target?: string;
    };

export interface TMenuItemProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  target?: string;
  onClick?: () => void;
}

export const FRONTIER_ITEMS: TMenuItemProps[] = [
  {
    title: "Crypto Account Annotation",
    description: "",
    href: "/crypto",
  },
  {
    title: "Arena",
    description: "",
    href: "/arena",
  },
  {
    title: "Robotics",
    description: "A global collaboration platform revolutionizing robotics innovation with high-quality data curation.",
    href: "/robotics",
  },
];

export const COMMUNITY_ITEMS: TMenuItemProps[] = [
  {
    title: "Documentation",
    // href: "https://docs.codatta.io/codatta",
    href: "https://docs.codatta.io/",
    description: "Support understanding the platform.",
  },
  {
    title: "Blog",
    href: "https://blog.codatta.io/",
    description: "Track the latest concepts and progress of the platform.",
  },
];

export const SOCIAL_MEDIAS: TMenuItemProps[] = [
  {
    title: "Twitter",
    icon: React.createElement("img", { src: TwitterIcon }),
    href: "https://x.com/codatta_io",
    target: "_blank",
  },
  {
    title: "Discord",
    icon: React.createElement("img", { src: DiscordIcon }),
    href: "https://discord.gg/YCESVmHEYv",
    target: "_blank",
  },
  {
    title: "Telegram",
    icon: React.createElement("img", { src: TelegramIcon }),
    href: "https://t.me/codatta_io",
    target: "_blank",
  },
  {
    title: "Medium",
    icon: React.createElement("img", { src: MediumIcon }),
    href: "https://codatta.medium.com/",
    target: "_blank",
  },
];

export const MENU_ITEMS: TMenuItem[] = [
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
  {
    title: "Vision",
    href: "/vision",
  },
];

export const BUTTON = {
  label: "Launch App",
  url: "https://app.codatta.io/",
};
