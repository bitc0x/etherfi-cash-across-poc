/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          900: '#000000',
          800: '#0A0A0B',
          700: '#101113',
          600: '#16181C',
          500: '#1C1F24',
          400: '#252930',
        },
        gold: {
          200: '#F2DDB0',
          300: '#E5C893',
          400: '#D4B776',
          500: '#C8A876',
          600: '#B79764',
          700: '#9A7E50',
        },
        mint: {
          400: '#7BE3B4',
          500: '#6FE8B0',
          600: '#4FCD92',
        },
        violet: {
          300: '#C9B6FF',
          400: '#B8A0FF',
          500: '#9A82E8',
        },
        cream: {
          50: '#FAFAF7',
          100: '#F0EFEA',
          200: '#D6D4CB',
          300: '#A8A59C',
          400: '#76746C',
          500: '#52514A',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['"Cormorant Garamond"', '"EB Garamond"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
};
