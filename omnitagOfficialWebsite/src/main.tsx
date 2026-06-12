import { createRoot } from "react-dom/client";
import Router from "@/router";
import { initGA } from "./utils/track";

import "@/styles/tailwind.css";
import "@/styles/index.css";
import "video-react/styles/scss/video-react.scss";

initGA();

const container = document.getElementById("root");
if (!container) {
  throw new Error("root container not found");
}
const root = createRoot(container);
root.render(<Router></Router>);
