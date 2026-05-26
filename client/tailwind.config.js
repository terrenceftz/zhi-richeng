/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rose: '#FFD8D8',
        blue: '#D8F3FF',
        mint: '#E8FFD8',
        cream: '#FFF0D8',
        lavender: '#E8E0FF',
        coral: '#FF8E8E',
        bg: '#FDF8F2',
      },
      fontFamily: {
        sans: ["'PingFang SC'", "'Hiragino Sans GB'", "'Microsoft YaHei'", 'sans-serif'],
        serif: ["'Zilla Slab'", 'serif'],
      },
    },
  },
  plugins: [],
};
