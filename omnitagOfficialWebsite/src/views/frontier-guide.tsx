import { Player, BigPlayButton, ControlBar } from "video-react";

import Section1 from "@/components/frontier-guide/section-1-home";
import Section2 from "@/components/frontier-guide/setcion-2-what";

export default function Page() {
  return (
    <div className="pb-[130px] lg:pb-[188px]">
      <Section1 />
      <Section2 />
      <Section3 />
      <Section4 />
      <Section5 />
      <Section6 />
    </div>
  );
}

function Section3() {
  return (
    <div className="page mt-16">
      <h2 className="text-xl font-semibold leading-6 text-black">🚀 Ready to Create Your Frontier?</h2>
      <p className="mt-3 text-sm font-bold text-[#66666670]">
        Start your data collection journey today by clicking the <span className="text-black">“Create Frontier” </span>
        button below.
      </p>
    </div>
  );
}

function Section4() {
  return (
    <div className="page mt-16">
      <h2 className="text-xl font-semibold leading-6 text-black">🌐 Empowering Data Ownership</h2>
      <p className="mt-3 text-sm font-bold text-[#66666670]">
        Codatta Frontier helps you create a dynamic ecosystem where data contributors retain ownership and businesses
        can efficiently define and fulfill their data collection needs. Join the future of data collaboration with
        Codatta Frontier.
      </p>
    </div>
  );
}

function Section5() {
  const video = {
    img: "https://static.codatta.io/static/images/frontier-20250109-113735.jpeg",
    url: "https://static.codatta.io/static/video/frontier-20250109-113735.mp4",
  };

  return (
    <div className="page mt-16">
      <Player src={video.url} poster={video.img}>
        <BigPlayButton position="center" />
        <ControlBar autoHide={true} />
      </Player>
    </div>
  );
}

function Section6() {
  function handleClick() {
    window.location.href = "https://forms.gle/x1XRkCnUjK3w1UkK8";
  }
  return (
    <button
      className="sticky bottom-[100px] mx-auto mt-16 block rounded-xl bg-black px-6 py-3 text-base tracking-tight text-white transition-colors hover:bg-gray-800"
      onClick={handleClick}
    >
      Create Frontier
    </button>
  );
}
