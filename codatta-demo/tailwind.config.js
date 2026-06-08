/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "outline-variant": "#3b494b",
        "secondary": "#d0bcff",
        "outline": "#849495",
        "surface-variant": "#353436",
        "secondary-container": "#571bc1",
        "surface-container-low": "#1c1b1c",
        "surface": "#131314",
        "surface-bright": "#3a393a",
        "on-primary": "#ffffff",
        "surface-container-high": "#2a2a2b",
        "background": "#131314",
        "surface-container": "#201f20",
        "primary": "#c65ce8",
        "on-secondary-container": "#c4abff",
        "surface-container-highest": "#353436",
        "on-surface-variant": "#b9cacb",
        "on-surface": "#e5e2e3",
        "surface-container-lowest": "#0e0e0f",
      },
      fontFamily: {
        headline: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
