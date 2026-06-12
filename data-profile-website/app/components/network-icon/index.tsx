import { NETWORK_ICON_MAP } from "./data";
import { cn } from "@udecode/cn";

const Icon = ({
  type,
  size = 14,
  className,
}: {
  type: string;
  size: number;
  className?: string;
}) => {
  const icon = NETWORK_ICON_MAP[type?.toLocaleLowerCase()];

  return (
    <span
      className={cn(
        "block rounded-full bg-contain bg-center bg-no-repeat",
        className
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url(${icon}?ver=1.1)`,
      }}
    ></span>
  );
};

export default Icon;
