import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1a3c5e',
        accent: '#f59e0b',
      },
    },
  },
  plugins: [],
};

export default config;
