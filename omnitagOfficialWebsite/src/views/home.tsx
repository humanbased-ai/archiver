import Section1 from "@/components/section-1-banners";
import Section2 from "@/components/section-2-partners";
import Section3 from "@/components/section-3-agents";
import Section4 from "@/components/section-4-works";
import Section5 from "@/components/section-5-roadmap";
import Section6 from "@/components/section-6-history";
import Section7 from "@/components/section-7-blog";
import Section8 from "@/components/section-8-service";

export default function HomePage() {
  return (
    // <div className="snap-mandatory snap-y overflow-y-auto h-screen">
    <>
      <div className="flex h-screen flex-col justify-between">
        <Section1 className="page mt-7 flex-1 lg:mt-0" />
        <Section2 className="mt-0 pb-5 lg:pb-10" />
      </div>
      <Section3 className="page mt-[80px] lg:mt-[160px]" />
      <div className="mt-[120px] rounded-3xl bg-black lg:mt-[200px] lg:pb-[180px]">
        <Section4 className="page" />
        <Section5 className="page mt-[180px]" />
      </div>
      <Section6 className="page mt-[120px] lg:mt-[240px]" />
      <Section7 className="page mt-[120px] lg:mt-[240px]" />
      <Section8 className="page mt-[120px] lg:mt-[240px]" />
    </>
  );
}
