import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // ← important
  theme: {
    extend: {
      colors: {
        // Semantic tokens mapped to CSS vars with alpha support
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
      },
      ringColor: ({ theme }) => ({
        DEFAULT: theme("colors.primary"), // ring-primary by default
      }),
      boxShadow: {
        card: "0 10px 30px rgba(0,0,0,.25)",
      },
    },
  },
  plugins: [],
};
export default config;
