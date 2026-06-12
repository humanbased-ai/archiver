import Section1 from "@/components/arena/section-1";
import Section2 from "@/components/arena/section-2";
import Section3 from "@/components/arena/section-3";
import Section4 from "@/components/arena/section-4";
import Footer from "@/components/v3/footer/index";

export default function ArenaPage() {
  return (
    <div className="bg-warm font-sora text-black lg:h-screen lg:snap-y lg:snap-mandatory lg:overflow-y-auto">
      <Section1 />
      <Section2 />
      <Section3 />
      <Section4 />
      <Footer />
    </div>
  );
}
