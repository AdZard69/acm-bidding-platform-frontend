/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0B0B',
        surface: {
          50: '#1C1916',
          100: '#141211',
          200: '#181614',
          300: '#0E0D0C',
          border: 'rgba(255, 255, 255, 0.09)'
        },
        brass: {
          DEFAULT: '#D4AF37',
          light: '#E5C158',
          muted: '#9E8226',
          dark: '#5A3E20'
        },
        burgundy: {
          DEFAULT: '#721426',
          bright: '#941C33',
          dark: '#4A0D19',
          light: '#D45B70'
        },
        ivory: '#F4F0EA',
        sand: '#C4BEB5',
        brand: {
          gold: '#D4AF37',
          cyan: '#D4AF37',
          emerald: '#10B981',
          amber: '#E5C158',
          rose: '#D45B70',
          purple: '#941C33',
          blue: '#D4AF37'
        }
      },
      fontFamily: {
        sans: ['"Inter Tight"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        serif: ['"Cormorant Garamond"', '"Instrument Serif"', 'Georgia', 'serif'],
        editorial: ['"Instrument Serif"', '"Cormorant Garamond"', 'serif']
      }
    },
  },
  plugins: [],
}
