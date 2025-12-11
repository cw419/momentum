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
          // 核心 React 库
          'vendor-react': ['react', 'react-dom'],
          // Supabase 客户端
          'vendor-supabase': ['@supabase/supabase-js'],
          // 图标库（较大）
          'vendor-icons': ['lucide-react'],
          // 动画库
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
        drop_console: true, // 生产环境移除 console
        drop_debugger: true,
      },
    },
    // 启用源码映射用于调试（生产可关闭）
    sourcemap: false,
  },
  // 预构建优化
  esbuild: {
    // 移除生产环境的 console 和 debugger
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});
