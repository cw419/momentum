import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 核心 React 库 - 首屏必需
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Supabase 客户端 - 延迟加载
          if (id.includes('@supabase/supabase-js') || id.includes('@supabase/')) {
            return 'vendor-supabase';
          }
          // 图标库 - 单独分块以便tree-shaking
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // 动画库 - 延迟加载
          if (id.includes('animejs')) {
            return 'vendor-animation';
          }
          // Services - 业务逻辑单独分块
          if (id.includes('/services/')) {
            return 'app-services';
          }
          // Utils - 工具函数单独分块
          if (id.includes('/utils/') && !id.includes('chainTree')) {
            return 'app-utils';
          }
        }
      }
    },
    // 调整警告阈值
    chunkSizeWarningLimit: 500,
    // 使用esbuild压缩，比terser更快
    minify: 'esbuild',
    // 禁用源码映射以减小体积
    sourcemap: false,
    // 启用CSS代码分割
    cssCodeSplit: true,
    // 设置目标浏览器以减少polyfill
    target: 'es2020',
    // 资源内联阈值 - 小于4KB的资源内联
    assetsInlineLimit: 4096,
    // 启用 modulePreload polyfill
    modulePreload: {
      polyfill: true,
    },
  },
  // 预构建优化
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
  },
});
