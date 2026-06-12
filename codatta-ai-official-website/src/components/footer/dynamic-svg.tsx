import { cn } from '@udecode/cn'
import React, { Suspense } from 'react'

// Function to dynamically import an SVG
export default function DynamicSvg({
  iconName,
  className,
  onClick,
  onLoaded,
}: {
  iconName: string;
  className?: string;
  onClick?: () => void;
  onLoaded?: () => void;
}) {
  const SvgIcon = React.lazy<React.ComponentType<any>>(async () => {
    const module = await import(`@/assets/icons/${iconName}.svg?react`);
    onLoaded?.();
    return { default: module.default };
  });

  return (
    <Suspense
      fallback={
        <div
          className={cn("text-black w-6 h-6 cursor-pointer", className)}
        ></div>
      }
    >
      <SvgIcon
        className={className}
        onClick={() => onClick?.()}
        onLoad={() => onLoaded?.()}
      />
    </Suspense>
  );
}
