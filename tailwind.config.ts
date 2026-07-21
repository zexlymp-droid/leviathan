import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: "#060B12",     // base background — deep ocean
        surface: "#0D1620",   // panel background
        border: "#1B2836",    // hairline dividers
        foam: "#DCE8E8",      // primary text
        muted: "#6B8A94",     // secondary text
        signal: "#3ED0B8",    // bioluminescent accent — the "detection" color
        signalDim: "#276F63",
        alert: "#D9633B",     // whale alert / warning
      },
      fontFamily: {
        display: ["var(--font-space)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
