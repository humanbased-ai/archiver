import { Route, BrowserRouter, Routes, useLocation } from "react-router-dom";

import AppV3Layout from "@/layouts/app-v3-layout";
import V3HomePage from "./views/v3-home";
import PrivacyPage from "./views/privacy";
import TermsPage from "./views/terms";
import RoboticsPage from "./views/robotics";
import FrontierGuidePage from "./views/frontier-guide";
import CryptoPage from "./views/crypto";
import ArenaPage from "./views/arena";
import VisionPage from "./views/vision";
import { lazy, useEffect } from "react";
import { trackPageView } from "./utils/track";

const BoosterContributorsPage = lazy(() => import("./views/booster-contributors"));

export default function Router() {
  return (
    <BrowserRouter>
      <RouteTracker />
      <Routes>
        <Route element={<AppV3Layout />}>
          <Route index path="/" element={<V3HomePage />} />
          <Route path="/crypto" element={<CryptoPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/robotics" element={<RoboticsPage />} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/vision" element={<VisionPage />} />
          <Route path="/binance_booster_codatta_food_annotation_contributors" element={<BoosterContributorsPage />} />
        </Route>
        <Route path="/frontier-guide" element={<FrontierGuidePage />} />
      </Routes>
    </BrowserRouter>
  );
}

function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    console.log("trackPageView", location.pathname);
    trackPageView(location.pathname);
  }, [location]);

  return null;
}
