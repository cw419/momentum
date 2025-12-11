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
        manualChunks: {
          // 核心 React 库 - 最小化分块
          'vendor-react': ['react', 'react-dom'],
          // Supabase 客户端 - 懒加载优先
          'vendor-supabase': ['@supabase/supabase-js'],
          // 图标库 - 按需加载
          'vendor-icons': ['lucide-react'],
          // 动画库 - 延迟加载
          'vendor-animation': ['animejs'],
        }
      }
    },
    // 调整警告阈值
    chunkSizeWarningLimit: 500,
    // 启用压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    // 禁用源码映射以减小体积
    sourcemap: false,
    // 启用CSS代码分割
    cssCodeSplit: true,
    // 设置目标浏览器以减少polyfill
    target: 'es2020',
    // 资源内联阈值 - 小于4KB的资源内联
    assetsInlineLimit: 4096,
  },
  // 预构建优化
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
  },
});
