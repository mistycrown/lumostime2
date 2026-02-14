import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';
  
  return {
    server: {
      port: 3002,
      host: '0.0.0.0',
      proxy: {
        '/uv/jianguoyun': {
          target: 'https://dav.jianguoyun.com/dav/',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/uv\/jianguoyun/, ''),
        }
      },
    },
    plugins: [
      react(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: 'electron/main.ts',
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`
          input: 'electron/preload.ts',
        },
        // Ployfill the Electron and Node.js built-in modules for Renderer process
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: {},
      }),
      renderer(),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        buffer: 'buffer', // Force use of buffer package
      }
    },
    build: {
      // 生产环境启用代码混淆
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          // 移除 console.log
          drop_console: false, // 保留 console，方便调试
          drop_debugger: true,
          pure_funcs: ['console.debug'], // 只移除 debug
        },
        mangle: {
          // 混淆变量名
          toplevel: true,
          safari10: true,
          properties: {
            // 混淆属性名（谨慎使用）
            regex: /^_/  // 只混淆以 _ 开头的私有属性
          }
        },
        format: {
          // 移除注释
          comments: false,
        }
      } : undefined,
      rollupOptions: {
        output: {
          // 手动分块，将敏感代码单独打包
          manualChunks: (id) => {
            
            if (id.includes('redemption')) {
              return 'redemption-core';
            }
            // 将常量文件单独打包
            if (id.includes('constants/redemptionHashes')) {
              return 'redemption-core';
            }
          }
        }
      }
    }
  };
});
