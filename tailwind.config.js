/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 使用系统字体，不依赖网络
        serif: [
          'Noto Serif SC',
          'Source Han Serif SC',
          'Source Han Serif CN',
          'Songti SC',
          'STSong',
          'SimSun',
          'NSimSun',
          'FangSong',
          'KaiTi',
          'Microsoft YaHei',
          'serif'
        ],
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
