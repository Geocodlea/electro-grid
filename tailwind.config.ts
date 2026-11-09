import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        grid: {
          navy: "#102c48",
          darkNavy: "#0c2238",
          header: "#123b57",
          blue: "#156987",
          accent: "#1877a6",
          lightBg: "#f0f4f7",
          cardBg: "#ffffff",
          border: "#d9e3eb",
          muted: "#597284",
          statusGreen: "#1a9854",
          statusGreenBg: "#eaf7ed",
          statusYellow: "#d7a52c",
          statusYellowBg: "#fff8e7",
          statusRed: "#d53f4b",
          statusRedBg: "#fdebec",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

