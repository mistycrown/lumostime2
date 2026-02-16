/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 使用 CSS 变量，允许动态切换字体
        serif: ['var(--font-family)', 'serif'],
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
