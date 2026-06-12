export interface TMenuItemProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

export const FRONTIER_ITEMS: TMenuItemProps[] = [
  {
    title: "Robotics",
    description: "A global collaboration platform revolutionizing robotics innovation with high-quality data curation.",
    href: "/robotics",
  },
];

export const COMMUNITY_ITEMS: TMenuItemProps[] = [
  {
    title: "Documentation",
    href: "https://docs.codatta.io/codatta",
    description: "Support understanding the platform.",
  },
  {
    title: "Blog",
    href: "https://blog.codatta.io/",
    description: "Track the latest concepts and progress of the platform.",
  },
];

export const BUTTON = {
  label: "Launch App",
  url: "https://app.codatta.io/",
};
