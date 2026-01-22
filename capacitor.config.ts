import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mistycrown.lumostime',
  appName: 'LumosTime',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: false,  // 禁用以避免拦截COS SDK的请求
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
