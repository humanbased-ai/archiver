import { cn } from "@udecode/cn";
import { useEffect, useState } from "react";

import helpIcon from "~/assets/svg/help-icon.svg?url";

export default function ToolTip({
  tip,
  className,
}: {
  tip: string;
  className?: string;
}) {
  const [show, setShow] = useState<boolean>(false);
  const [hover, setHover] = useState<boolean>(false);

  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "unset";

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [show]);

  return (
    <>
      <div
        className="relative "
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <span
          className={cn(
            "hidden w-5 aspect-square bg-no-repeat bg-center bg-cover cursor-pointer md:block"
          )}
          style={{ backgroundImage: `url(${helpIcon})` }}
        ></span>
        {hover && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white  text-gray-10  text-sm rounded-md p-2 break-words w-[200px]">
            {tip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-[10px] border-transparent border-t-white"></div>
          </div>
        )}
      </div>
      <span
        className={cn(
          "block w-5 aspect-square bg-no-repeat bg-center bg-cover cursor-pointer md:hidden"
        )}
        style={{ backgroundImage: `url(${helpIcon})` }}
        onClick={() => setShow(true)}
      ></span>
      <div
        className={cn(
          "fixed top-0 bottom-0 left-0 right-0 bg-[#000000CC]",
          show ? "block" : "hidden"
        )}
        onClick={() => setShow(false)}
      >
        <div className="section h-full m-auto flex items-center justify-center">
          <div className="bg-white rounded-xl p-4 text-gray-10 text-sm">
            {tip}
          </div>
        </div>
      </div>
    </>
  );
}
