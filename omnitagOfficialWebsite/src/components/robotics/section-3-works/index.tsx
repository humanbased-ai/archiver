import playlistIcon from "@/assets/robotics/icons/playlist.svg";
import sparkleIcon from "@/assets/robotics/icons/sparkle.svg";
import noteIcon from "@/assets/robotics/icons/note-list-check-square.svg";
import giftIcon from "@/assets/robotics/icons/gift.svg";

const data: { icon: string; title: string; des: string }[] = [
  { icon: playlistIcon, title: "Master the Basics", des: "Watch a 3-minute tutorial to learn the basics." },
  { icon: sparkleIcon, title: "Get Qualified", des: "Complete test cases to demonstrate your skills." },
  { icon: noteIcon, title: "Annotate and Label", des: "Start contributing by annotating and labeling datasets." },
  {
    icon: giftIcon,
    title: "Claim Rewards",
    des: "Earn guaranteed rewards and improve your reputation as a data creator.",
  },
];
export default function Page() {
  return (
    <div className="page pt-20 lg:pt-[120px]">
      <h2 className="text-3xl font-extrabold lg:text-center lg:text-[56px] lg:leading-[68px] lg:tracking-tight">
        How It Works
      </h2>
      <p className="mt-2 text-base tracking-wide lg:text-center lg:tracking-normal">
        Anyone! From beginners to professionals, anyone can help innovate robotics.
      </p>
      <ul className="mt-16 lg:grid lg:grid-cols-2 lg:gap-[120px]">
        {data.map((item, index) => (
          <li className="flex gap-6 border-t-2 border-white py-6">
            <span className="text-5xl font-bold italic leading-[58px]">{index + 1}</span>
            <div>
              <img src={item.icon} className="block size-12" />
              <h3 className="mt-8 text-xl font-bold leading-6">{item.title}</h3>
              <p className="mt-3 text-base">{item.des}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
