import { cn } from "@udecode/cn";
import { motion } from "motion/react";
import { useRef } from "react";

import { CARDS, TCard } from "./data";

import checkCircleIcon from "@/assets/check-circle.png?url";

export default function Section({ className }: { className?: string }) {
  return (
    <section className={cn("text-white lg:flex lg:items-start", className)}>
      <h2 className="text-center text-[32px] font-extrabold leading-10 lg:sticky lg:top-[60px] lg:w-1/2 lg:text-left">
        Codatta Platform
        <br />
        Roadmap
      </h2>
      <Cards />
    </section>
  );
}

function Cards() {
  const carouselRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mt-[80px] flex gap-10 pb-[80px] lg:mt-0 lg:w-1/2" ref={carouselRef}>
      <div className="w-[2px] bg-[#2B2B2B]">
        <div className="sticky top-[200px] h-[120px] bg-gradient-to-b from-[#2B2B2B] to-[#4190FF]"></div>
      </div>
      <div className="flex-1">
        {CARDS.map((card, index) => (
          <Card data={card} className={index !== 0 ? "mt-[160px]" : ""} key={card.title} />
        ))}
      </div>
    </div>
  );
}

function Card({ data, className }: { data: TCard; className?: string }) {
  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between text-base">
        <div className="rounded-full bg-white px-3 font-semibold leading-[34px] text-black">{data.status}</div>
        <div className="font-medium text-white">Codatta {data.version}</div>
      </div>
      <motion.h3
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="mt-6 text-2xl font-bold"
      >
        {data.title}
      </motion.h3>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        viewport={{ once: true }}
        className="mt-3 text-base leading-7 tracking-wide text-white/40"
      >
        {data.des}
      </motion.p>
      <motion.ul
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        viewport={{ once: true }}
        className="mt-[56px] list-inside text-base tracking-wide text-white"
      >
        {data.steps.map((item) => (
          <li
            key={item}
            className="mt-8 bg-left-top bg-no-repeat pl-8 first-of-type:mt-0"
            style={{
              backgroundImage: `url('${checkCircleIcon}')`,
              backgroundSize: "20px 20px",
              backgroundPositionY: "2px",
            }}
          >
            {item}
          </li>
        ))}
      </motion.ul>
    </div>
  );
}
