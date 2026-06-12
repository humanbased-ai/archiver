import Section1 from "@/components/vision/section-1";
import Section2 from "@/components/vision/section-2";
import Section3 from "@/components/vision/section-3";
import Footer from "@/components/v3/footer/index";

export default function Page() {
  return (
    // <div className="bg-warm font-sora lg:h-screen lg:snap-y lg:snap-mandatory lg:overflow-y-auto">
    <div className="bg-warm font-sora text-black lg:py-[80px]">
      <Section1 />
      <Section2 />
      <Section3 />
      <Footer />
    </div>
  );
}
