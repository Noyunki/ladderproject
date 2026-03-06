import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease-out both",
        "card-pop": "cardPop 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        shimmer: "shimmer 2.2s linear infinite"
      },
      boxShadow: {
        glow: "0 18px 60px rgba(15, 23, 42, 0.15)"
      },
      colors: {
        ink: "#102018",
        mist: "#f4efe4",
        leaf: "#4d7c62",
        moss: "#18392b",
        ember: "#f08a5d",
        sky: "#d8efe3"
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        cardPop: {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(16px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        }
      }
    }
  },
  plugins: []
};

export default config;
