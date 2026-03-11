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
      // 使用 esbuild 进行压缩（比 terser 更快，内存占用更少）
      minify: isProduction ? 'esbuild' : false,
      // esbuild 压缩选项
      ...(isProduction && {
        esbuild: {
          drop: ['debugger'],
          pure: ['console.debug'],
        }
      }),
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
            return undefined;
          }
        }
      }
    }
  };
});
