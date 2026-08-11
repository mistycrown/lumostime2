import path from 'path';
import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';
import { sentryVitePlugin } from '@sentry/vite-plugin';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';
  const appVersion = JSON.parse(readFileSync(path.resolve(__dirname, 'version.json'), 'utf8')).version as string;
  const sentryRelease = `lumostime@${appVersion}`;
  const shouldUploadSentrySourceMaps = Boolean(
    env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT
  );
  
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
      ...(shouldUploadSentrySourceMaps ? [sentryVitePlugin({
        authToken: env.SENTRY_AUTH_TOKEN,
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        release: {
          name: sentryRelease
        },
        sourcemaps: {
          assets: './dist/**',
          filesToDeleteAfterUpload: ['./dist/**/*.map']
        }
      })] : []),
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
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(sentryRelease)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        buffer: 'buffer', // Force use of buffer package
      }
    },
    build: {
      sourcemap: shouldUploadSentrySourceMaps ? 'hidden' : false,
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
