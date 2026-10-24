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
        background: '#090D14',
        surface: {
          50: '#161D2B',
          100: '#111722',
          200: '#0E131D',
          300: '#0A0E17',
          border: 'rgba(255, 255, 255, 0.08)'
        },
        brand: {
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444',
          purple: '#8B5CF6',
          blue: '#3B82F6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace', 'Courier New']
      }
    },
  },
  plugins: [],
}
