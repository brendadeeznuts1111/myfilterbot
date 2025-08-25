/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{tsx,ts,jsx,js,html}",
    "./public/**/*.html",
    "./src/components/**/*.{tsx,ts,jsx,js}",
    "./src/web/**/*.{tsx,ts,jsx,js,html}"
  ],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide': 'slide 30s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      colors: {
        'fantasy': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        }
      }
    },
  },
  plugins: [],
}