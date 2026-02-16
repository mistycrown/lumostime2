/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 使用 CSS 变量，这样可以动态切换
        serif: ['var(--font-family)', 'Noto Serif SC', 'serif'],
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        handwriting: [
          'Bilbo Swash Caps',
          'Georgia',
          'Times New Roman',
          'cursive',
          'serif'
        ],
      }
    },
  },
  plugins: [],
}
