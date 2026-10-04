import type { Config } from "tailwindcss";
import preset from "@xauconnect/ui/tailwind-preset";

const config: Config = {
  presets: [preset as Config],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
};

export default config;
