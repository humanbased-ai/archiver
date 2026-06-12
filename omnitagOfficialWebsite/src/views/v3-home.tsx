import Section1 from "@/components/v3/section-1";
import Section2 from "@/components/v3/section-2";
import Section3 from "@/components/v3/section-3";
import Section4 from "@/components/v3/section-4";
import Section5 from "@/components/v3/section-5";
import Section6 from "@/components/v3/section-6";
import Section7 from "@/components/v3/section-7";
import Section8 from "@/components/v3/section-8";
import Footer from "@/components/v3/footer/index";

export default function HomePage() {
  return (
    <div className="bg-warm font-sora lg:h-screen lg:snap-y lg:snap-mandatory lg:overflow-y-auto">
      <Section1 />
      <Section2 />
      <Section3 />
      <Section4 />
      <Section5 />
      <Section6 />
      <Section7 />
      <Section8 />
      <Footer />
    </div>
  );
}
