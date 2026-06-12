import BannerSection from "@/components/robotics/section-1-banners";
import BackgroundSection from "@/components/robotics/section-2-background";
import WorksSection from "@/components/robotics/section-3-works";
import CasesSection from "@/components/robotics/section-4-cases";
import AchievementsSection from "@/components/robotics/section-5-achievements";
import AssetsSection from "@/components/robotics/section-6-assets";
import IncentivesSection from "@/components/robotics/section-7-incentives";

export default function Page() {
  return (
    <div className="bg-warm">
      <BannerSection />
      <BackgroundSection />
      <div className="mt-20 overflow-hidden rounded-[20px] bg-black text-white lg:rounded-[80px]">
        <WorksSection />
        <CasesSection />
      </div>
      <AchievementsSection />
      <AssetsSection />
      <IncentivesSection />
    </div>
  );
}
