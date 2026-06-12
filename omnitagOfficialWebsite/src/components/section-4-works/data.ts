import bg1 from "@/assets/works-light-1.svg?url";
import bg2 from "@/assets/works-light-2.svg?url";
import bg3 from "@/assets/works-light-3.svg?url";

export interface TCard {
  icon: string;
  title: string;
  titleColor: string;
  des: string;
  bg: string;
}

export const CARDS: TCard[] = [
  {
    // icon: 'https://s.xny.ai/static/works-movie-1.png',
    icon: "https://static.codatta.io/static/official/works-APNG-1.png",
    title: "For AI Developers: Open Collaboration Platform",
    titleColor: "text-[#30C341]",
    des: "Connect directly with data creators—no upfront costs. Permissionless access eliminates opinionated restrictions, allowing everyone to leverage human expertise to advance AI. Share rewards through our royalty model.",
    bg: bg1,
  },
  {
    // icon: "https://s.xny.ai/static/works-movie-2.png",
    icon: "https://static.codatta.io/static/official/works-APNG-2.png",
    title: "For Investors: Decentralized Data Asset Marketplace",
    titleColor: "text-[#3063C3]",
    des: "Invest in AI data assets with revenue potential. Build an AI portfolio by owning data assets and earning royalties from AI models using your data. Own a stake in AI innovation.",
    bg: bg2,
  },
  {
    // icon: "https://s.xny.ai/static/works-movie-3.png",
    icon: "https://static.codatta.io/static/official/works-APNG-3.png",
    title: "For Data Creators: Seamless Co-Training and Scaling",
    titleColor: "text-[#FCC800]",
    des: "Collaborate on AI models without upfront costs via royalty model. Optional kick-off funding from new AI developers accelerates data sourcing. Co-train efficiently, share future benefits together.",
    bg: bg3,
  },
];
