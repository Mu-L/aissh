import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
        'import.meta.env.VITE_OPENAI_BASE_URL': JSON.stringify(env.OPENAI_BASE_URL),
        'import.meta.env.VITE_OPENAI_MODEL': JSON.stringify(env.OPENAI_MODEL)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-xterm': [
                'xterm',
                'xterm-addon-canvas',
                'xterm-addon-fit',
                'xterm-addon-search',
                'xterm-addon-web-links',
                'xterm-addon-webgl'
              ],
              'vendor-utils': ['socket.io-client', 'zustand', 'i18next', 'react-i18next'],
              'vendor-ai': ['openai', 'react-markdown', 'react-syntax-highlighter'],
              'vendor-ui': ['lucide-react']
            }
          }
        }
      }
    };
});
