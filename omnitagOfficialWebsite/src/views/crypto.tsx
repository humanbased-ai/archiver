import Section1 from "@/components/crypto/section-1";
import Section2 from "@/components/crypto/section-2";
import Section3 from "@/components/crypto/section-3";
import Section4 from "@/components/crypto/section-4";
import Footer from "@/components/v3/footer/index";

export default function Page() {
  return (
    <div className="bg-warm font-sora lg:h-screen lg:snap-y lg:snap-mandatory lg:overflow-y-auto">
      <Section1 />
      <Section3 />
      <Section4 />
      <Section2 />
      <Footer />
    </div>
  );
}
