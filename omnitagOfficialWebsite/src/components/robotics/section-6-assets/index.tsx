import databaseIcon from "@/assets/robotics/icons/database.svg";
import shieldIcon from "@/assets/robotics/icons/shield-bolt.svg";
import globeIcon from "@/assets/robotics/icons/globe.svg";

const data: { icon: string; title: string; des: string }[] = [
  {
    icon: databaseIcon,
    title: "Flexible datasets",
    des: "Behavior recognition, robotic control, and action-space data.",
  },
  {
    icon: shieldIcon,
    title: "Blockchain-secured",
    des: "Ensures contributors retain ownership and share revenue.",
  },
  {
    icon: globeIcon,
    title: "Accessible",
    des: "Open to the global robotics community for innovation and R&D.",
  },
];

export default function Page() {
  return (
    <div className="page mt-20 lg:mt-[160px]">
      <h2 className="text-3xl font-extrabold text-[#1D1D1D] lg:text-[56px] lg:font-bold lg:leading-[68px] lg:tracking-tight lg:text-black">
        Asset Overview
      </h2>
      <p className="mt-2 text-base tracking-wide">
        Anyone! From beginners to professionals, anyone can help innovate robotics.
      </p>
      <ul className="mt-16 space-y-6 lg:flex lg:gap-6 lg:space-y-0">
        {data.map((item, index) => (
          <li
            className={`flex-1 rounded-2xl border border-[#00000014] p-6 ${index === 0 ? "bg-black text-white" : ""}`}
            key={item.title + index}
          >
            <div>
              <img src={item.icon} />
            </div>
            <h3 className="mt-10 text-xl font-bold leading-6">{item.title}</h3>
            <p className={`mt-3 h-12 text-base ${index === 0 ? "text-[#999999]" : "text-[#333333]"}`}>{item.des}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
