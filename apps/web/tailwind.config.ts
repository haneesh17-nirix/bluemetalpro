import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT:  '#0c1f3d',
          darkest:  '#060f20',
          dark:     '#091628',
          mid:      '#112749',
          light:    '#1a3460',
          bright:   '#2563a8',
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
          DEFAULT: '#0c1f3d',
          card:    '#162c52',
          raised:  '#1c3660',
          hover:   '#1c3660',
          border:  '#2a4570',
          'border-subtle': '#1f3659',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs:    ['11px', '16px'],
        sm:    ['13px', '18px'],
        base:  ['14px', '20px'],
        lg:    ['16px', '24px'],
        xl:    ['18px', '26px'],
        '2xl': ['20px', '28px'],
        '3xl': ['24px', '32px'],
      },
      spacing: {
        '4.5': '18px',
        '5.5': '22px',
        '13': '52px',
        '15': '60px',
        '18': '72px',
      },
      borderRadius: {
        sm:   '6px',
        DEFAULT: '8px',
        md:   '10px',
        lg:   '12px',
        xl:   '14px',
        '2xl':'16px',
        '3xl':'20px',
        '4xl':'24px',
      },
      boxShadow: {
        card:      '0 4px 20px rgba(0,0,0,0.35)',
        'card-lg': '0 8px 32px rgba(0,0,0,0.45)',
        gold:      '0 4px 16px rgba(201,168,76,0.35)',
        'gold-lg': '0 6px 24px rgba(201,168,76,0.5)',
        glow:      '0 0 30px rgba(201,168,76,0.2)',
        inset:     'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(175deg, #091628 0%, #0c1f3d 45%, #091628 100%)',
        'gold-gradient':  'linear-gradient(135deg, #9a7a2e 0%, #e8c96a 55%, #c9a84c 100%)',
        'sidebar-gradient': 'linear-gradient(180deg, #060f20 0%, #091628 40%, #0c1f3d 100%)',
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-in-out both',
        'slide-up': 'slideUp 0.25s ease-out both',
        'shimmer':  'shimmer 1.6s infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
      },
    },
  },
  plugins: [],
};

export default config;
