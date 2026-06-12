import { useMemo } from "react";
import { cn } from "@udecode/cn";

import Indicators from "./indicators";

import gridBg from "@/assets/works-grid-bg.png";
import { CARDS } from "./data";

export default function Card({
  total,
  index,
}: {
  total: number;
  index: number;
}) {
  const data = useMemo(() => {
    return CARDS[index];
  }, [index]);

  return (
    <div className="lg:mt-[118px] lg:px-[110px] lg:flex lg:gap-[100px] lg:items-center lg:justify-center overflow-hidden">
      <div className="relative lg:w-[600px] lg:min-w-[400px]">
        <div
          className="relative z-10 bg-center bg-no-repeat bg-contain"
          // style={{
          //   backgroundImage: `url(${data.bg})`,
          // }}
        >
          {CARDS.map(({ icon }, i) => (
            <div key={i} className={"" + (index === i ? "visible" : "hidden")}>
              <img
                src={icon}
                className={cn("m-auto max-w-full max-h-full block")}
              />
              <img
                src={data.bg}
                className={cn(
                  "max-w-full max-h-full object-center object-cover absolute inset-0 m-auto"
                )}
              />
            </div>
          ))}
        </div>
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center overflow-hidden">
          <img
            src={gridBg}
            className="scale-[1.3] origin-left min-w-full min-h-full"
            alt="Grid Background"
          />
        </div>
      </div>
      <div className="flex flex-col justify-between lg:flex-1 lg:min-w-[400px]">
        <div className="lg:min-h-[200px] min-h-[250px]">
          <h3
            className={`tracking-tight text-2xl font-semibold ${data.titleColor} `}
          >
            {data.title}
          </h3>
          <p className="text-[#FFFFFFA3] text-base leading-8 tracking-wide mt-6">
            {data.des}
          </p>
        </div>
        <Indicators
          total={total}
          index={index}
          className="mt-[80px] lg:mt-[243px]"
        />
      </div>
    </div>
  );
}
