import { cn } from "@udecode/cn";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

import { useWindowResize } from "@/hooks/useWindowResize";

import gridBg from "@/assets/grid.svg";
import PcgridBg from "@/assets/grid-pc.svg";
import Button from "../button";

export default function Section({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { width } = useWindowResize();
  const isMobile = useMemo(() => width < 1024, [width]);
  const [desIndex, setDesIndex] = useState<number>(0);
  const [hover, setHover] = useState<boolean>(false);
  const desList: [{ text: string; tip: string }, { text: string; tip: string; strong: string }][] = useMemo(
    () => [
      [
        { text: "AI Developers", tip: "" },
        {
          text: "Co-TRAIN ",
          strong: "VERTICAL AI AGENTS",
          tip: "Vertical Ai Agents",
        },
      ],
      [
        { text: "AI Developers", tip: "" },
        {
          text: "Co-TRAIN ",
          strong: "AGI",
          tip: "Artificial General Intelligence",
        },
      ],
      [
        { text: "AI Developers", tip: "" },
        {
          text: "Co-TRAIN ",
          strong: "ASI",
          tip: "Artificial Super Intelligence",
        },
      ],
      [
        { text: "Independent Scientists", tip: "" },
        { text: "Co-CONDUCT ", strong: "DESCI", tip: "Decenstralized Science" },
      ],
    ],
    [],
  );
  const des = useMemo(() => desList[desIndex], [desIndex, desList]);

  const timer = useRef<NodeJS.Timeout | null>(null);
  const startTimer = useCallback(() => {
    timer.current = setTimeout(() => {
      setDesIndex((prev) => (prev + 1) % desList.length);
      startTimer(); // Recursively call startTimer to create loop
    }, 3000);
  }, [desList]);

  useEffect(() => {
    startTimer();

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [startTimer]);

  const handleMouseEnter = useCallback(() => {
    console.log("handleMouseEnter");
    if (timer.current) {
      clearTimeout(timer.current);
    }

    setHover(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    console.log("handleMouseLeave");

    setHover(false);
    startTimer();
  }, []);

  const handleCreateFrontier = () => {
    navigate("/frontier-guide");
  };

  return (
    <div
      className={cn("flex flex-col bg-no-repeat pt-[74px] lg:flex-row lg:gap-[120px] lg:pt-[84px]", className)}
      style={{
        backgroundImage: `url(${isMobile ? gridBg : PcgridBg})`,
        backgroundSize: "auto 110%",
        backgroundPosition: isMobile ? "right" : "center",
      }}
    >
      <div className="flex min-h-[220px] flex-col justify-center lg:w-1/2">
        <h1 className="text-wrap text-[40px] font-extrabold leading-[48px] text-[#1D1D1D] lg:text-[96px] lg:leading-[110px]">
          Make AI Subscribe to Your Knowledge
        </h1>
        <div className="mt-2 w-full text-[20px] font-medium leading-[30px] text-[#606067] lg:mt-6 lg:h-[120px] lg:text-2xl lg:leading-10 lg:tracking-wide">
          Permissionless Marketplace Connects{" "}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="font-bold text-[#1C1C26]"
          >
            {des[0].text}
          </motion.span>{" "}
          and Data Creators to{" "}
          <motion.div
            className="inline-block cursor-pointer font-bold text-[#1C1C26]"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
              {des[1].text}
            </motion.span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="relative"
            >
              {des[1].strong}.
              <div
                className={`absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-black px-4 py-2 text-sm text-white transition-opacity ${hover && !isMobile ? "opacity-100" : "opacity-0"}`}
              >
                {des[1].tip}
                <div className="absolute left-1/2 top-full -mt-px -translate-x-1/2 border-[6px] border-transparent border-t-black"></div>
              </div>
            </motion.span>
          </motion.div>
        </div>
        <div className="mt-6">
          <Button
            hasArrow={true}
            className="w-full flex-1 cursor-pointer px-6 text-sm hover:bg-gray-800 lg:w-auto"
            onClick={handleCreateFrontier}
          >
            Start a Frontier
          </Button>
        </div>
      </div>
      <div className="pointer-events-none relative flex flex-1 items-center justify-center overflow-hidden lg:w-1/2 lg:justify-end">
        <div className="">
          <img
            src="https://static.codatta.io/static/official/logo-3d-2.png"
            className="relative z-10 h-auto max-h-[372px] w-full lg:max-h-[540px] lg:w-auto"
          />
        </div>
      </div>
    </div>
  );
}
