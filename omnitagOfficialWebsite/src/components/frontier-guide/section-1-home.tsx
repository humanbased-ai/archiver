import { useMemo } from "react";

import gridBg from "@/assets/fontier-guide/grid.svg";
import PcgridBg from "@/assets/fontier-guide/grid-pc.svg";
import pinImg from "@/assets/fontier-guide/home-pin.png";

import { useWindowResize } from "@/hooks/useWindowResize";

export default function Section() {
  const { width } = useWindowResize();
  const isMobile = useMemo(() => width < 1024, [width]);

  return (
    <div
      className="bg-black bg-no-repeat pb-10 pt-6 text-white lg:py-[62px]"
      style={{
        backgroundImage: `url(${isMobile ? gridBg : PcgridBg})`,
        backgroundSize: isMobile ? "auto 110%" : "auto 200%",
        backgroundPosition: isMobile ? "right" : "center",
      }}
    >
      <div className="page lg:flex lg:items-center lg:gap-[130px]">
        <div>
          <h1 className="max-w-[292px] text-[32px] font-extrabold leading-10 lg:text-[32px] lg:font-extrabold lg:leading-10">
            How to Create a Codatta Frontier
          </h1>
          <p className="mt-6 text-sm leading-6 text-[#F2F2F2]">
            Creating a Codatta Frontier on the Codatta platform enables you to seamlessly connect data collection needs
            with contributors, leveraging Web3 principles to maximize the value of your data. By building a Frontier,
            you can reduce transaction barriers, ensure confidentiality, and share value with both data contributors and
            users.
          </p>
        </div>
        <div className="mt-12 px-8 lg:mt-0 lg:h-[235px] lg:w-[266px] lg:shrink-0 lg:px-0">
          <img src={pinImg} className="mx-auto block" />
        </div>
      </div>
    </div>
  );
}
