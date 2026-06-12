import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        v: {
          bg: "#0f0d0b",
          panel: "#1a1714",
          panel2: "#242018",
          cream: "#f5f0e8",
          muted: "#9a8e80",
          line: "#2e2820",
          green: "#6abf7b",
          "green-dim": "#1e3324",
          amber: "#d4a24e",
          "amber-dim": "#2e2410",
          red: "#cf6b5e",
          "red-dim": "#2e1a16",
          gold: "#c9a86a",
          "gold-hover": "#d4b87a",
        },
      },
      fontFamily: {
        display: ["DM Serif Display", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
        typing: {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "30%": { transform: "translateY(-4px)", opacity: "1" },
        },
      },
      animation: {
        rise: "rise 0.3s ease",
        shake: "shake 0.35s ease",
        typing: "typing 1.2s ease infinite",
      },
    },
  },
  plugins: [],
};
export default config;
