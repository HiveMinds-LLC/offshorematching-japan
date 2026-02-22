import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#eff4fb",
        line: "#d9e3f0",
        brand: {
          DEFAULT: "#1d4ed8",
          dark: "#1e40af",
          soft: "#dbeafe"
        }
      },
      boxShadow: {
        panel: "0 12px 30px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
