import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class', // Use class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;

