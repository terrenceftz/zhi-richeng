/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          light: 'var(--color-accent-light)',
          dark: 'var(--color-accent-dark)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          light: 'var(--color-surface-light)',
          dark: 'var(--color-surface-dark)',
        },
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
        muted: 'var(--color-muted)',
        text: 'var(--color-text)',
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
