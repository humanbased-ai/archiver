import { Outlet } from "react-router-dom";

// import Footer from "@/components/v3/footer";
import Header from "@/components/v3/header";

export default function AppLayout() {
  return (
    <div>
      <Header />
      <Outlet />
      {/* <Footer /> */}
    </div>
  );
}
