import { cn } from '@udecode/cn'
import { useEffect, useState } from "react";

import aiIcon from "@/assets/icons/rect-ai.svg?url";
import ballIcon from "@/assets/icons/rect-ball.svg?url";
import crossIcon from "@/assets/icons/rect-cross.svg?url";
import aniAiIcon from "@/assets/icons/ani-rect-ai.svg?url";
import aniBallIcon from "@/assets/icons/ani-rect-ball.svg?url";
import aniCrossIcon from "@/assets/icons/ani-rect-cross.svg?url";

import { isMobile } from "@/utils/ua";

export default function Section({ className }: { className?: string }) {
  return (
    <div className={cn("text-center", className)}>
      <p className="font-medium text-xl tracking-wide lg:text-2xl">
        Vertical AI Agents:The New SaaS
      </p>
      <h3 className="font-extrabold text-[32px] leading-10 mt-4 lg:font-bold lg:text-[56px] lg:leading-[68px] lg:tracking-tight">
        Build Vertical AI Agents That Transform Industries
      </h3>
      <p className="text-base tracking-wide mt-4 lg:text-[18px] lg:leading-[28px] max-w-[1000px] mx-auto">
        Connect AI developers with domain experts to create specialized AI
        agents that revolutionize specific verticals. The next evolution of SaaS
        is vertical, intelligent, and collaborative.
      </p>
      <div className="text-left mt-[48px] flex flex-col gap-6 lg:mt-[100px] lg:flex lg:gap-10 lg:justify-center lg:flex-row">
        <Card
          iconName="rect-ai"
          title="Industry-Specific Intelligence"
          des="Create Al agents with deep vertical knowledge that understand specific industry contexts, workflows, and challenges."
        />
        <Card
          iconName="rect-ball"
          title="Domain Expert Integration"
          des="Seamlessly combine Al capabilities with human domain expertise to build solutions that truly understand your industry."
        />
        <Card
          iconName="rect-cross"
          title="Automated Workflows"
          des="Transform traditional SaaS functions into intelligent agents that automate complex industry-specific processes."
        />
      </div>
    </div>
  );
}

function Card({
  className,
  iconName,
  title,
  des,
}: {
  className?: string;
  iconName: string;
  title: string;
  des: string;
}) {
  const icons: Record<string, string> = {
    "rect-ai": aiIcon,
    "rect-ball": ballIcon,
    "rect-cross": crossIcon,
    "ani-rect-ai": aniAiIcon,
    "ani-rect-ball": aniBallIcon,
    "ani-rect-cross": aniCrossIcon,
  };
  const [hover, setHover] = useState<boolean>(false);
  const [mobile, setMobile] = useState<boolean>(false);

  useEffect(() => {
    setMobile(isMobile());
  }, []);

  return (
    <div
      className={cn(
        "border border-[#0000001F] border-solid rounded-3xl flex flex-col p-10 tracking-wide",
        className
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* <div
        className={`h-[72px] bg-left bg-contain bg-no-repeat`}
        style={{
          backgroundImage: `url(${icons[(hover && !mobile ? "ani-" : "") + iconName]})`,
        }}
      /> */}
      <div className="h-[72px]">
        <img
          src={icons[iconName]}
          className={`h-full ${hover && !mobile ? "hidden" : ""}`}
        />
        <img
          src={icons["ani-" + iconName]}
          className={`h-full ${hover && !mobile ? "" : "hidden"}`}
        />
      </div>
      <h3 className="mt-10 font-semibold text-xl">{title}</h3>
      <p className="mt-[14px] text-base leading-7 text-[#00000080]">{des}</p>
    </div>
  );
}
