import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e6f1fb",
          100: "#b5d4f4",
          500: "#378add",
          600: "#185fa5",
          700: "#0c447c",
          900: "#042c53",
        },
      },
    },
  },
  plugins: [],
};
export default config;
