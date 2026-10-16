/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#18392B', 50: '#EEF3F0', 100: '#D5E2DA', 200: '#A9C3B3', 400: '#4C7A62', 600: '#1F4A37', 700: '#18392B', 800: '#122C21', 900: '#0B1D15' },
        olive: { DEFAULT: '#687B55', 100: '#E7EBE1', 300: '#A6B392', 500: '#687B55', 700: '#4B5A3D' },
        gold: { DEFAULT: '#C6A76A', 100: '#F4EDDD', 300: '#DCC594', 500: '#C6A76A', 700: '#9C7F45' },
        sand: { DEFAULT: '#F5F2EA', 200: '#ECE6D7', 300: '#DDD4BF' },
        graphite: { DEFAULT: '#252525', 400: '#6B6B6B', 500: '#4A4A4A' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Manrope Variable"', 'Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(24, 57, 43, 0.18)',
        card: '0 1px 2px rgba(24,57,43,.06), 0 8px 24px -8px rgba(24,57,43,.12)',
      },
      letterSpacing: { luxe: '0.32em' },
    },
  },
  plugins: [],
}
