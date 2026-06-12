import { useEffect, useState } from "react";
import { cn } from "@udecode/cn";
import blogApi from "@/apis/blog.api";
import DynamicSvg from "../dynamic-svg";

type TCard = {
  img?: string;
  title: string;
  des: string;
  url: string;
};

const DEFAULT_CARDS: TCard[] = [
  {
    img: "https://blog.codatta.io/content/images/size/w600/format/webp/2024/11/Devcon-AiFi-Summit-1.png",
    title:
      "Codatta at AiFi Summit: A New Era of Community-Driven, Domain-Specific AI",
    des: "The AiFi Summit at Devcon 2024 focused on the financialization of AI through blockchain technology, uniting leading thinkers in the AI and blockchain space. Topics at the Summit included the financialization of compute assets, open data economies, and next-gen decentralized infrastructure for AI.",
    url: "https://blog.codatta.io/codatta-at-aifi-summit-a-new-era-of-community-driven-domain-specific-ai-2/",
  },
  {
    img: "https://blog.codatta.io/content/images/size/w600/format/webp/2024/10/Codatta---Manta-Blog.png",
    title:
      "Data Analysis and Insights: Codatta x Manta Annotate to Earn Golden Bonanza Bash",
    des: "Codatta and Manta Network joined forces to host the Annotate to Earn event, designed to engage users in the Manta ecosystem by contributing high-quality data and benefiting from token rewards.",
    url: "https://blog.codatta.io/data-analysis-and-insights-codatta-x-manta-annotate-to-earn-golden-bonanza-bash/",
  },
  {
    img: "https://blog.codatta.io/content/images/size/w2000/2024/11/1_RMmxQvNG9010DgYuC2tpwg-1.webp",
    title: "🎉 Introducing the Codatta Genesis Pass: A New Era of NFT Utility",
    des: "Codatta has launched a unique, highly valuable non-fungible token (NFT) — the Codatta Genesis Pass. This NFT is a Soulbound Token (SBT) that rewards contributions to the platform and is positioned to represent long-term value and exclusive rights within Codatta’s ecosystem.",
    url: "https://blog.codatta.io/introducing-the-codatta-genesis-pass-a-new-era-of-nft-utility-2/",
  },
];

export default function Section({ className }: { className?: string }) {
  const [cards, setCards] = useState<TCard[]>(DEFAULT_CARDS);

  useEffect(() => {
    blogApi
      .getLatesBlogs()
      .then((blogs) => {
        if (!blogs?.length) return;

        console.log("blogs", blogs);

        let cards = [];

        for (let i = 0; i < blogs.length; i++) {
          const blog = blogs[i];
          cards.push({
            title: blog.title ?? "",
            des: blog.excerpt ?? "",
            url: blog.url ?? "",
            img: blog.feature_image ?? "",
          });
        }

        setCards(cards);
        console.log("new Blogs: ", cards);
      })
      .catch((e) => {
        console.error("get blogs error: ", e);
      });
  }, []);

  return (
    <div className={cn("", className)}>
      <h3 className="flex items-center justify-between lg:items-end ">
        <span className="text-[#1D1D1D] font-extrabold text-[32px] leading-10 lg:font-bold lg:text-[56px] lg:leading-[68px] lg:tracking-tight">
          Recent Blog
        </span>
        <a
          className="text-[#1C1C26] font-medium text-xl cursor-pointer"
          href="https://blog.codatta.io/"
          target="_blank"
        >
          View more
        </a>
      </h3>
      <div className="mt-10 flex flex-col gap-10 lg:grid lg:grid-cols-2 lg:gap-20 xl:grid-cols-3">
        {cards.map((card, index) => (
          <Card data={card} key={"section_7_" + index} />
        ))}
      </div>
    </div>
  );
}

function Card({ data }: { data: TCard }) {
  return (
    <div className="">
      <a href={data.url} target="_blank" className="cursor-pointer">
        {data.img && (
          <img
            src={data.img}
            className="w-full aspect-[16/9] object-cover rounded-3xl overflow-hidden"
            loading="lazy"
          />
        )}
        <h3 className="mt-8 font-semibold text-2xl leading-9 tracking-tight lg:text-[30px] lg:leading-10 line-clamp-2">
          {data.title}
        </h3>
      </a>

      <p className="mt-4 text-base line-clamp-3 text-[#999999]">{data.des}</p>
      <a
        className="gap-4 hidden lg:flex items-center lg:mt-8 cursor-pointer hover:opacity-80"
        href={data.url}
        target="_blank"
      >
        <DynamicSvg iconName="arrow-up-right-circle" className="h-10 w-10" />
        <span className="text-base">Read More</span>
      </a>
    </div>
  );
}
