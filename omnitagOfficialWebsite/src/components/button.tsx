import { cn } from "@udecode/cn";
import DynamicSvg from "@/components/dynamic-svg";

export default function Button({
  children,
  className,
  isLight,
  hasArrow,
  disable,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  isLight?: boolean;
  hasArrow?: boolean;
  disable?: boolean;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}) {
  return (
    <button
      disabled={disable}
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-xl border border-solid border-[#000000] px-3 py-3 text-base tracking-tight",
        isLight ? "bg-white text-black" : "bg-black text-white",
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
    >
      {children}
      {hasArrow && <DynamicSvg iconName="arrow-up-right" className="m-[5px] size-[14px]" />}
    </button>
  );
}
