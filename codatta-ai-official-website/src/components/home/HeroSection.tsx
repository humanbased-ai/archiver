import { cn } from "@udecode/cn";
// import { useNavigate } from "react-router-dom";
import GridBackgound from "@/assets/home/grid-bg.svg";

export default function HeroSection({ className }: { className?: string }) {
  // const navigate = useNavigate();
  // const handleCreateFrontier = () => {
  //   navigate("/frontier-guide");
  // };

  return (
    <div
      className={cn("flex min-h-[766px] flex-col bg-no-repeat lg:flex-row lg:gap-[120px]", className)}
      style={{
        backgroundImage: `url(${GridBackgound})`,
        backgroundSize: "auto 110%",
        backgroundPosition: "center",
      }}
    >
      <div className="flex min-h-[220px] flex-col justify-center lg:w-[57%] shrink-0">
        <h1 className="text-wrap text-[40px] font-extrabold leading-[48px] text-[#1D1D1D] lg:text-[72px] lg:leading-[100px] mb-[48px]">
        Accelerate <br></br>
        Next-Gen AI with <br></br>
        <div className="border-primary text-primary border px-2 -mx-2 inline-block bg-primary/10 relative">
        <div className="bg-primary size-4 absolute -bottom-2 -left-2"></div>
        <div className="bg-primary size-4 absolute -top-2 -right-2"></div>
        Human-Centric
        </div> Insight
        </h1>
        <p className="lg:w-[80%] text-xl text-black/70 leading-[32px] mb-9">
        Turn raw data into AI breakthroughs. Codatta’s platform delivers end-to-end data labeling, synthetic generation, and human-AI collaboration for models that outperform.
        </p>
        {/* <button
          className="bg-black rounded-md text-white px-4 py-3 w-[200px]"
          onClick={handleCreateFrontier}
        >
          Start a Frontier
        </button> */}
      </div>
      <div className="pointer-events-none relative flex flex-1 items-center justify-center overflow-hidden lg:w-[43%] lg:justify-end">
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
