import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        inter: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
      },
      colors: {
        primary: "#875dff",
        white: "#FFFFFF",
        gray: {
          1: "#FFFFFF",
          2: "#D2D2D4",
          5: "#8D8D93",
          9: "#252532",
          10: "#1C1C26",
        },
      },
      components: {
        ".section":
          "@apply px-6 min-w-[320px] max-w-[1200px] m-auto lg:px-[80px] xl:px-[120px]",
      },
    },
    screens: {
      sm: "480px",
      md: "1024px",
      lg: "1440px",
      tablet: "480x",
      laptop: "1024px",
      desktop: "1440px",
    },
  },
} satisfies Config;
