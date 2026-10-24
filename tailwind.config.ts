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
        epson: {
          blue: "#002B49",
          darkBlue: "#001B30",
          lightBlue: "#005587",
          cyan: "#00A3E0",
          accent: "#2272B4",
          surface: "#F4F7F9",
        },
      },
    },
  },
  plugins: [],
};
export default config;
