import coinsIcon from "@/assets/robotics/icons/coins.svg";
import coinConvertIcon from "@/assets/robotics/icons/coin-convert.svg";
import rocketIcon from "@/assets/robotics/icons/rocket-launch.svg";

const data: { icon: string; title: string; des: string }[] = [
  {
    icon: coinsIcon,
    title: "Guaranteed Rewards",
    des: "Earn fair compensation for all contributions.",
  },
  {
    icon: coinConvertIcon,
    title: "Blockchain Transfers",
    des: "Monetize earnings securely on decentralized networks.",
  },
  {
    icon: rocketIcon,
    title: "Future Opportunities",
    des: "Access exclusive datasets and research partnerships.",
  },
];

export default function Page() {
  return (
    <div className="page mt-20 lg:mt-[160px] lg:pb-[110px]">
      <h2 className="text-3xl font-extrabold text-[#1D1D1D] lg:text-[56px] lg:font-bold lg:leading-[68px] lg:tracking-tight lg:text-black">
        Incentives for Contributors
      </h2>
      <p className="mt-2 text-base tracking-wide">
        Anyone! From beginners to professionals, anyone can help innovate robotics.
      </p>
      <ul className="mt-16 space-y-6 lg:flex lg:gap-6 lg:space-y-0">
        {data.map((item, index) => (
          <li className="rounded-2xl border border-[#00000014] p-6" key={item.title + index}>
            <div>
              <img src={item.icon} />
            </div>
            <h3 className="mt-10 text-xl font-bold leading-6">{item.title}</h3>
            <p className="mt-3 h-12 text-base text-[#333333]">{item.des}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
