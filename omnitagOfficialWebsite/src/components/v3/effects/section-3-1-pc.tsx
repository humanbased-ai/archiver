import { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useInView } from "framer-motion"; // 1. Import useInView from framer-motion

gsap.registerPlugin(useGSAP);

/**
 * Data flow animation component controlled by Framer Motion's useInView Hook
 * Features:
 * 1.  Animations play only when in the viewport, pause when out.
 * 2.  Uses CSS will-change property for smoother animations (GPU acceleration).
 * 3.  Animation speed is 2x the original speed.
 */
const DataFlowDiagramFinalLoop = ({ className }: { className?: string }) => {
  const container = useRef(null);
  const masterTimeline = useRef<gsap.core.Timeline | null>(null);

  // 2. Use useInView Hook to monitor container visibility
  //    - once: false ensures isInView returns to false when element leaves viewport
  //    - amount: 0.1 means the element is considered in view when 10% visible
  const isInView = useInView(container, { once: false, amount: 0.1 });

  // 3. Use useEffect as a "bridge" to connect visibility state and GSAP animation control
  useEffect(() => {
    if (masterTimeline.current) {
      if (isInView) {
        masterTimeline.current.play();
      } else {
        masterTimeline.current.pause();
      }
    }
  }, [isInView]); // This effect depends on changes to isInView

  useGSAP(
    () => {
      // 4. Create GSAP timeline and assign it to ref
      masterTimeline.current = gsap.timeline({
        paused: true, // Key: initial state is paused, waiting for instruction
        onComplete: () => {
          // Loop logic: after playing, delay and restart
          gsap.delayedCall(0.75, () => masterTimeline.current?.restart());
        },
      });

      // Retain previous speed setting
      masterTimeline.current.timeScale(2);

      // ---- Detailed animation sequence definition (logic unchanged) ----
      const foundationalIntro = () => {
        const tl = gsap.timeline();
        tl.to(".f-circle-bg", { autoAlpha: 1, scale: 1, duration: 0.7, ease: "expo.out" })
          .to(".f-circle-fg", { autoAlpha: 1, x: 0, duration: 0.6, ease: "power2.out" }, "-=0.5")
          .to(".f-text", { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.3");
        return tl;
      };

      const specializedIntro = () => {
        const tl = gsap.timeline();
        tl.to(".s-tri-bg", { autoAlpha: 1, scaleY: 1, duration: 0.6, ease: "expo.out" })
          .to(".s-tri-fg", { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.4")
          .to(".s-text", { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.3");
        return tl;
      };

      // Initialize all elements' pre-animation states
      gsap.set(".knowledge-group", { autoAlpha: 0, x: 256, scale: 0.95 });
      gsap.set([".k-text", ".f-text", ".s-text"], { autoAlpha: 0, y: 15 });
      gsap.set(".f-circle-bg", { autoAlpha: 0, scale: 0.7 });
      gsap.set(".f-circle-fg", { autoAlpha: 0, x: 20 });
      gsap.set(".s-tri-bg", { autoAlpha: 0, scaleY: 0, transformOrigin: "bottom center" });
      gsap.set(".s-tri-fg", { autoAlpha: 0, y: -10 });
      gsap.set([".arrow-1", ".arrow-2"], { autoAlpha: 0 });

      // Build animation sequence
      masterTimeline.current
        .to(".knowledge-group", { autoAlpha: 1, scale: 1, duration: 0.8, ease: "expo.out" })
        .to(".k-text", { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.5")
        .to(".knowledge-group", { x: 0, duration: 1.2, ease: "power4.inOut" }, "+=1.2")
        .to(".arrow-1", { autoAlpha: 1, duration: 0.5 }, "+=0.5")
        .add(foundationalIntro(), "-=0.3")
        .to(".arrow-2", { autoAlpha: 1, duration: 0.5 }, "+=1.2")
        .add(specializedIntro(), "-=0.3")
        .to({}, { duration: 2.5 })
        .to([".specialized-group", ".arrow-2"], {
          autoAlpha: 0,
          y: "+=15",
          duration: 0.6,
          ease: "power2.in",
          stagger: 0.1,
        })
        .to(
          [".foundational-group", ".arrow-1"],
          {
            autoAlpha: 0,
            y: "+=15",
            duration: 0.6,
            ease: "power2.in",
            stagger: 0.1,
          },
          "-=0.4",
        )
        .to(
          ".knowledge-group",
          {
            autoAlpha: 0,
            scale: 0.95,
            duration: 0.6,
            ease: "power2.in",
          },
          "-=0.4",
        );
    },
    { scope: container },
  );

  return (
    <div ref={container} className={className}>
      <style>
        {`
          .knowledge-group,
          .arrow-1,
          .arrow-2,
          .foundational-group,
          .specialized-group {
            will-change: transform, opacity;
          }
        `}
      </style>
      <svg
        width="717"
        height="224"
        viewBox="0 0 717 224"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="font-sora"
      >
        {/* SVG content remains unchanged */}
        <g className="knowledge-group">
          <rect width="60" height="60" transform="translate(0.156006 30.7539)" fill="black" />
          <path
            d="M21.7118 69.7539L27.6878 60.4179L27.7359 60.8259L22.2158 52.2339H26.5358L29.9439 57.7059H30.4959L33.8559 52.2339H38.0559L32.5119 60.8739L32.4399 60.4899L38.6079 69.7539H34.2638L30.2799 63.5619H29.7038L25.9118 69.7539H21.7118Z"
            fill="white"
          />
          <rect
            width="60"
            height="60"
            transform="translate(72.156 30.7539)"
            fill="white"
            stroke="#EAEAEA"
            strokeWidth="1"
          />
          <path
            d="M99.5493 63.1059L94.4373 52.2339H98.4693L102.141 60.3699L101.445 60.1539H103.461L102.717 60.3699L106.029 52.2339H109.845L105.141 63.1059H99.5493ZM100.413 69.7539V62.5539H104.277V69.7539H100.413Z"
            fill="black"
          />
          <rect
            width="60"
            height="60"
            transform="translate(144.156 30.7539)"
            fill="white"
            stroke="#EAEAEA"
            strokeWidth="1"
          />
          <path
            d="M171.5493 63.1059L166.4373 52.2339H170.4693L174.1413 60.3699L173.4453 60.1539H175.4613L174.7173 60.3699L178.0293 52.2339H181.8453L177.1413 63.1059H171.5493ZM172.4133 69.7539V62.5539H176.2773V69.7539H172.4133Z"
            fill="black"
          />
          <rect x="72.156" y="106.754" width="60" height="16" fill="black" />
          <rect x="144.156" y="106.754" width="60" height="16" fill="#FCA800" />
          <rect x="144.156" y="138.754" width="60" height="16" fill="black" />
          <text className="k-text" x="102.5" y="200" textAnchor="middle" fontSize="20" fill="#000" fontWeight="bold">
            Knowledge * Data
          </text>
        </g>

        <path className="arrow-1" d="M244.156 88L256.156 80L244.156 72V88Z" fill="black" />
        <g className="foundational-group">
          <circle className="f-circle-bg" cx="363.156" cy="88" r="62" fill="#FCA800" />
          <circle className="f-circle-fg" cx="353.156" cy="88" r="62" fill="black" />
          <text className="f-text" x="358" y="200" textAnchor="middle" fontSize="20" fill="#000" fontWeight="bold">
            Foundational AI
          </text>
        </g>

        <path className="arrow-2" d="M480.156 88L492.156 80L480.156 72V88Z" fill="black" />
        <g className="specialized-group">
          <path className="s-tri-bg" d="M618.959 25.752L690.565 149.752H547.353L618.959 25.752Z" fill="#FCA800" />
          <path className="s-tri-fg" d="M609.354 25.752L680.959 149.752H537.748L609.354 25.752Z" fill="black" />
          <text className="s-text" x="618" y="200" textAnchor="middle" fontSize="20" fill="#000" fontWeight="bold">
            Specialized AI
          </text>
        </g>
      </svg>
    </div>
  );
};

export default DataFlowDiagramFinalLoop;
