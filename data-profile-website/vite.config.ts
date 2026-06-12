import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/*.css"],
      future: {
        // v3_fetcherPersist: true,
        // v3_relativeSplatPath: true,
        // v3_throwAbortReason: true,
        v3_singleFetch: true,
        // v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
    svgr(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
});
