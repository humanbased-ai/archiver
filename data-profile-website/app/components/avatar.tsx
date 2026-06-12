import { cn } from "@udecode/cn";
import { useEffect, useMemo, useRef, useState } from "react";

import { getAsciiSum } from "~/utils/str";

export default function Avatar({
  className,
  name = "",
  url,
  onlySenior = false,
}: {
  name: string;
  className?: string;
  url?: string;
  onlySenior?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const rand = useMemo(() => getAsciiSum(name), [name]);
  const pos = useMemo<[number, number]>(() => {
    const totalRows = 7;
    const totalCols = 7;
    const pos = rand % (totalRows * totalCols);
    const newRow = Math.floor(pos / totalCols);
    const newCol = pos % totalCols;

    return [-58 * newCol, -58 * newRow];
  }, [rand]);
  const label = useMemo(() => {
    if (onlySenior) return "Senior";
    return rand % 2 === 0 ? "Senior" : "Junior";
  }, [rand, onlySenior]);

  useEffect(() => {
    if (ref.current) {
      const size = ref.current.getBoundingClientRect().width ?? 40;
      setScale(size / 40);
    }
  }, [ref]);

  return (
    <div
      ref={ref}
      className={cn(
        "block rounded-full bg-cover bg-center bg-no-repeat aspect-square w-10",
        className
      )}
      style={
        !!url
          ? {
              backgroundImage: `url(${url})`,
            }
          : {
              backgroundImage: `url(/avatars-default.png)`,
              backgroundPosition: `${pos[0] * scale}px ${pos[1] * scale}px`,
              backgroundSize: `${562 * scale}px auto`,
            }
      }
    >
      <div className="w-full h-[14px] text-[#200D55] font-medium text-xs flex items-center justify-center bg-white rounded-full mt-[30px]">
        <span className="scale-[0.67] origin-center">{label}</span>
      </div>
    </div>
  );
}
