/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // Refined type scale with optimal line-heights and letter-spacing
        'xs':   ['0.75rem',   { lineHeight: '1.125rem', letterSpacing: '0.01em' }],   // 12px / 18px
        'sm':   ['0.8125rem', { lineHeight: '1.25rem',  letterSpacing: '0.005em' }],  // 13px / 20px
        'base': ['0.875rem',  { lineHeight: '1.375rem', letterSpacing: '0em' }],       // 14px / 22px
        'lg':   ['1rem',      { lineHeight: '1.5rem',   letterSpacing: '-0.01em' }],   // 16px / 24px
        'xl':   ['1.125rem',  { lineHeight: '1.625rem', letterSpacing: '-0.01em' }],   // 18px / 26px
        '2xl':  ['1.25rem',   { lineHeight: '1.75rem',  letterSpacing: '-0.015em' }],  // 20px / 28px
        '3xl':  ['1.5rem',    { lineHeight: '2rem',     letterSpacing: '-0.02em' }],   // 24px / 32px
        '4xl':  ['1.875rem',  { lineHeight: '2.25rem',  letterSpacing: '-0.025em' }],  // 30px / 36px
      },
      colors: {
        primary: {
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
        },
      },
      borderRadius: {
        'sm': '0.25rem',
        'DEFAULT': '0.375rem',
        'md': '0.5rem',
        'lg': '0.625rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
