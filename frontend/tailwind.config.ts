import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"EB Garamond"', "Georgia", "serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        cream: "#f5f1e8",
        ink: "#1a1a1a",
      },
    },
  },
  plugins: [],
} satisfies Config;
