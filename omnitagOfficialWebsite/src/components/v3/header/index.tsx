import MobileHeader from "./mobile-header";
import PcHeader from "./pc-header";
import { useWindowResize } from "@/hooks/useWindowResize";

export default function Section() {
  const windowSize = useWindowResize();

  return (
    <div className="sticky top-0 z-50 w-screen border-b border-b-[#00000014] bg-warm lg:fixed">
      {windowSize.width < 768 ? <MobileHeader /> : <PcHeader />}
    </div>
  );
}
