import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#2563EB',
          secondary: '#EFF6FF',
          accent: '#F97316',
          danger: '#EF4444',
          success: '#22C55E',
        },
        status: {
          unknown:   '#6B7280',
          normal:    '#9CA3AF',
          scheduled: '#F97316',
          active:    '#EF4444',
          done:      '#22C55E',
          restricted:'#EAB308',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
