// import circleLogo from "@/assets/robotics/circle-logo.png";
// import coinbaseLogo from "@/assets/robotics/coinbase-logo.png";
// import messariLogo from "@/assets/robotics/messari-logo.png";
import bannerImg from "@/assets/robotics/banner.jpg";

const list: { title: string; des: string }[] = [
  { title: "Live Task", des: "1,1000" },
  { title: "Frontier Creator", des: "UniBot.AI" },
  { title: "Accessed By", des: "UniBot.AI, AiOrigin Group" },
  { title: "Data Contributors", des: "AiOrigin Group" },
];

export default function Page() {
  return (
    <div
      className="bg-warm flex h-screen flex-col bg-[length:auto_70%] bg-bottom bg-no-repeat pt-[74px] text-black lg:block lg:bg-[length:100%_auto] lg:pt-[82px]"
      style={{ backgroundImage: `url(${bannerImg})` }}
    >
      <div className="page flex-1 pt-6 lg:pt-8">
        <h1 className="text-[40px] font-black leading-[48px] text-[#001A27] lg:text-8xl lg:leading-[116px]">
          ROBOTICS
        </h1>
        <p className="mt-2 text-sm font-medium leading-6 lg:max-w-[568px]">
          A global collaboration platform enabling anyone to annotate data for robotics, reducing costs and creating
          reusable, high-quality datasets to drive innovation.
        </p>
        <Features />
      </div>
      {/* <Logos /> */}
    </div>
  );
}

function Features() {
  return (
    <div className="mt-6 space-y-6 text-sm leading-6 lg:mt-10 lg:flex lg:gap-[112px] lg:space-y-0">
      <ul className="flex flex-wrap items-center gap-[100px] lg:gap-[112px]">
        {list.slice(0, 2).map((item, index) => (
          <li key={item.title + index}>
            <div>{item.title}</div>
            <div className="font-semibold leading-5 lg:mt-[6px] lg:text-base">{item.des}</div>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap items-center justify-between lg:gap-[112px]">
        {list.slice(2).map((item, index) => (
          <li key={item.title + index}>
            <div>{item.title}</div>
            <div className="font-semibold leading-5 lg:mt-[6px] lg:text-base">{item.des}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// function Logos() {
//   return (
//     <div className="lg:page w-full overflow-hidden bg-[#FFFFFFa3] backdrop-blur-sm lg:mt-[72px] lg:bg-transparent lg:backdrop-blur-none">
//       <ul className="flex animate-[marquee_10s_linear_infinite] flex-nowrap items-center justify-between gap-[64px] py-3 hover:[animation-play-state:paused] lg:animate-none lg:justify-start">
//         {[coinbaseLogo, circleLogo, messariLogo].map((logo) => (
//           <li key={logo} className="h-[26px] shrink-0">
//             <img src={logo} className="h-full w-auto" />
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }
