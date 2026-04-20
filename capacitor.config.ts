import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mistycrown.lumostime',
  appName: 'LumosTime',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: false,  // 禁用以避免拦截COS SDK的请求（COS SDK需要直接访问）
    },
    SystemBars: {
      insetsHandling: 'disable',  // 禁用内置的 insets 处理，使用 EdgeToEdge 插件
    },
    EdgeToEdge: {
      backgroundColor: '#fdfbf7',  // 匹配你的应用背景色
    },
  },
  server: {
    // 允许所有外部URL访问
    allowNavigation: [
      'https://*.myqcloud.com',
      'https://*.tencentcos.cn',
      'https://*.cos.ap-*.myqcloud.com',
      'https://*.qiniucs.com',
      'https://*.cloudflarestorage.com',
      'https://dav.jianguoyun.com',
      'https://*.jianguoyun.com'
    ]
  }
};

export default config;
