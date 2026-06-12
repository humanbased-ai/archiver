import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import gsap from "gsap";

export default function Demo4() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: containerRef });
  const timeline: gsap.core.Timeline = gsap.timeline({
    repeat: -1,
    repeatDelay: 1,
    yoyo: true,
  });

  const onClick = contextSafe(() => {
    // animation.paused(false);
    timeline
      .to(".green", { x: 600, rotation: 360 })
      .to(".purple", { x: 600, rotation: 360 })
      .to(".orange", { x: 600, rotation: 360 });
  });

  return (
    <div className="flex items-center justify-center" ref={containerRef}>
      <div>
        <div className="green size-[100px] rounded-md bg-[green]"></div>
        <div className="purple size-[100px] rounded-md bg-[purple]"></div>
        <div className="orange size-[100px] rounded-md bg-[orange]"></div>
      </div>
      <button onClick={onClick}>Toggle Animation</button>
    </div>
  );
}
