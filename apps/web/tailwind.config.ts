import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0e2544',
          light:   '#1a3c5e',
          mid:     '#1e4976',
          bright:  '#2563a8',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light:   '#e8c96a',
          bright:  '#f5d678',
          dark:    '#9a7a2e',
          muted:   '#b89840',
        },
        gem: {
          DEFAULT: '#2e7d52',
          light:   '#3da066',
          bright:  '#4ade80',
          dark:    '#1f5c3b',
        },
        surface: {
          DEFAULT: '#0e2544',
          card:    '#152e52',
          hover:   '#1c3a63',
          border:  '#263d5e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:        '0 4px 20px rgba(0,0,0,0.3)',
        'card-gold': '0 4px 20px rgba(201,168,76,0.12)',
        glow:        '0 0 30px rgba(201,168,76,0.18)',
        inner:       'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(160deg, #071530 0%, #0e2544 40%, #1a3c5e 100%)',
        'gold-gradient':  'linear-gradient(135deg, #9a7a2e 0%, #e8c96a 50%, #9a7a2e 100%)',
        'sidebar-gradient': 'linear-gradient(180deg, #0a1e3d 0%, #0e2544 100%)',
      },
      animation: {
        'fade-in':  'fadeIn 0.25s ease-in-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;
