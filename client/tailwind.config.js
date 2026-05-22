/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#7c3aed', light: '#a78bfa', dark: '#5b21b6' },
        accent: { DEFAULT: '#e2b714', light: '#f0d760', dark: '#b8920f' },
        surface: { DEFAULT: '#1a1a2e', light: '#252547', dark: '#0f0f1a' },
        danger: '#f7768e',
        info: '#7aa2f7',
        muted: '#565f89',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
