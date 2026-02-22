import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mistycrown.lumostime',
  appName: 'LumosTime',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: false,  // 禁用以避免拦截COS SDK的请求
    },
    StatusBar: {
      style: 'Light',  // 或 'Dark'，根据你的主题
      backgroundColor: '#fdfbf7',  // 匹配你的应用背景色
      overlaysWebView: false,  // 关键：不让状态栏覆盖 WebView
    },
  },
  server: {
    // 允许所有外部URL访问
    allowNavigation: [
      'https://*.myqcloud.com',
      'https://*.tencentcos.cn',
      'https://*.cos.ap-*.myqcloud.com'
    ]
  }
};

export default config;
