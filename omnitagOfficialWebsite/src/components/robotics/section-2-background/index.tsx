import { useState } from "react";
import img1 from "@/assets/robotics/bg-tab-1.png";
import img2 from "@/assets/robotics/bg-tab-2.png";
import img3 from "@/assets/robotics/bg-tab-3.png";

export default function Page() {
  return (
    <div className="page mt-[82px] lg:mt-[120px]">
      <Header />
      <Tabs />
    </div>
  );
}

function Header() {
  return (
    <>
      <h2 className="w-[300px] text-3xl font-extrabold text-[#1D1D1D] lg:w-full lg:text-center lg:text-[56px] lg:font-bold lg:leading-[68px] lg:tracking-tight">
        Background of Vertical AI in Robotics
      </h2>
      <p className="pt-2 text-base tracking-wide lg:m-auto lg:max-w-[860px] lg:text-center lg:tracking-normal">
        Robotics is revolutionizing industries, driving advancements in navigation, manipulation, and human-robot
        interaction. However, the volume of high-quality data is far from enough. The field faces significant
        challenges:
      </p>
    </>
  );
}

type TTab = "AI" | "Control" | "Embodiment";
function Tabs() {
  const tabs: TTab[] = ["AI", "Control", "Embodiment"];
  const [activeTab, setTab] = useState<TTab>("AI");

  return (
    <>
      <ul className="mb-8 mt-[64px] flex h-[47px] items-center justify-between rounded-full border border-[#0000001F] p-1 lg:mx-auto lg:w-[428px]">
        {tabs.map((tab) => (
          <li
            className={`flex h-full flex-1 items-center justify-center rounded-full transition-all ${tab === activeTab ? "bg-black text-white" : ""}`}
            onClick={() => setTab(tab)}
          >
            {tab}
          </li>
        ))}
      </ul>
      <View tab={activeTab} />
    </>
  );
}

const viewData: Record<
  TTab,
  {
    title: string;
    definition: string;
    includes: { keyword: string; des: string }[];
  }
> = {
  AI: {
    title: "AI",
    definition:
      "The cognitive layer that enables decision-making and learning, allowing the robot to adapt and improve over time.",
    includes: [
      {
        keyword: "Decision-Making",
        des: "Using AI models to plan and select the most appropriate actions.",
      },
      {
        keyword: "Learning",
        des: "Leveraging data and experiences to refine behaviors and adapt to new challenges.",
      },
    ],
  },
  Control: {
    title: "Control",
    definition:
      "The system responsible for executing tasks and ensuring the robot’s movements and actions align with its goals.",
    includes: [
      { keyword: "Actuators", des: "Motors, servos, or pneumatic systems to perform physical actions." },
      {
        keyword: "Control Policies",
        des: "Algorithms and feedback loops that adjust actions dynamically based on sensor inputs.",
      },
    ],
  },
  Embodiment: {
    title: "Embodiment",
    definition: "The physical structure and interface that allow the robot to interact with its environment.",
    includes: [
      {
        keyword: "Mechanics",
        des: "The body, joints, and physical design (e.g., robotic arms, wheels).",
      },
      {
        keyword: "Perception",
        des: "Sensors (e.g., cameras, LiDAR, microphones) to gather data about the environment.",
      },
      {
        keyword: "Communication",
        des: "Systems to exchange information internally (within subsystems) and externally (with other robots or systems).",
      },
    ],
  },
};
function View({ tab = "AI" }: { tab: TTab }) {
  const data = viewData[tab];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <div className="w-full overflow-hidden rounded-3xl lg:h-[400px] lg:bg-black">
        <img src={img1} className={`mx-auto aspect-1 lg:h-full ${tab === "AI" ? "block" : "hidden"}`} />
        <img src={img2} className={`mx-auto aspect-1 lg:h-full ${tab === "Control" ? "block" : "hidden"}`} />
        <img src={img3} className={`mx-auto aspect-1 lg:h-full ${tab === "Embodiment" ? "block" : "hidden"}`} />
      </div>
      <div className="text-sm font-medium text-[#666666] lg:flex lg:flex-col lg:justify-between">
        <h3 className="text-[40px] font-bold leading-[48px] text-black">{data.title}</h3>
        <div className="mt-10">
          <h3 className="mb-4 text-xl font-medium leading-6 text-black">Definition</h3>
          <p>{data.definition}</p>
          <h3 className="mb-4 mt-8 text-xl font-medium leading-6 text-black">Includes</h3>
          {data.includes.map((item, index) => (
            <p key={item.keyword + index} className="mb-2">
              {item.keyword}: {item.des}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
