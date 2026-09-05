/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC', // Slate 50 Light Crisp Background
        surface: '#FFFFFF',    // Pure White Card
        card: '#FFFFFF',
        cardHover: '#F0F9FF',  // Sky 50 Hover
        cardBorder: '#E2E8F0', // Slate 200 Border
        cardBorderLight: '#EFF6FF', // Blue 50
        brand: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0284C7', // Sky Blue Primary
          600: '#0369A1',
          700: '#1D4ED8', // Deep Royal Blue
          800: '#1E40AF',
          900: '#0F172A',
        },
        coin: {
          DEFAULT: '#EAB308',
          dark: '#CA8A04',
          light: '#FEF08A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-short': 'bounce 0.8s ease-in-out 1',
        'spin-slow': 'spin 12s linear infinite',
      },
    },
  },
  plugins: [],
};
