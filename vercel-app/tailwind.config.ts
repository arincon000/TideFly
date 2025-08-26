import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  safelist: [
    "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]",
    "from-sky-50",
    "via-white",
    "to-sky-50",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
