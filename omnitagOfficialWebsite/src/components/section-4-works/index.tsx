import { cn } from '@udecode/cn'
import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

import Card from "./card";

export default function Section({ className }: { className?: string }) {
  const [index, setIndex] = useState<number>(0);

  return (
    <div className={cn("works-box", className)}>
      <div className="sticky top-0 h-screen flex flex-col justify-center">
        <h2 className="font-extrabold text-[32px] leading-10 text-center text-white lg:font-bold lg:text-[56px] lg:leading-[68px] lg:tracking-tight">
          How It Works
        </h2>
        <Card total={3} index={index} />
      </div>
      <Item className="h-screen mt-[-100vh]" onShow={() => setIndex(0)} />
      <Item className="h-screen " onShow={() => setIndex(1)} />
      <Item className="h-screen " onShow={() => setIndex(2)} />
    </div>
  );
}

function Item({
  className,
  onShow,
}: {
  className?: string;
  onShow: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInview = useInView(cardRef, { amount: 0.5 });

  useEffect(() => {
    console.log("isInview", isInview);
    if (isInview) {
      onShow?.();
    }
  }, [isInview]);

  return <div className={className} ref={cardRef}></div>;
}
