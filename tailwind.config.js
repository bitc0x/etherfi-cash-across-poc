/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0D11',
          900: '#0F1318',
          850: '#141921',
          800: '#1A2029',
          700: '#222936',
          600: '#2D3543',
          500: '#3A4354',
        },
        mint: {
          400: '#7BE3CC',
          500: '#48E5C2',
          600: '#2DC8A5',
          700: '#1FA587',
        },
        haze: {
          200: '#E6EAF0',
          300: '#C7CFDB',
          400: '#9AA5B6',
          500: '#6B7588',
          600: '#4A5364',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
};
