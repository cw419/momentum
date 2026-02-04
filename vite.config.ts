import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

// 自定义插件：性能优化（预连接 + 首屏样式）
function performanceOptimizations() {
  let supabaseUrl: string | undefined;
  return {
    name: 'performance-optimizations',
    configResolved(config: { env: Record<string, string> }) {
      supabaseUrl = config.env.VITE_SUPABASE_URL;
    },
    transformIndexHtml(html: string) {
      // 1. 预连接放到 <head> 最前面
      const preconnect = supabaseUrl
        ? `<link rel="preconnect" href="${supabaseUrl}" crossorigin>\n    <link rel="dns-prefetch" href="${supabaseUrl}">\n    `
        : '';

      // 2. 首屏背景色 - 根据系统主题自动切换
      const criticalBg = `<style>
      @media(prefers-color-scheme:dark){html,body{background:#0F0F12}}
      @media(prefers-color-scheme:light){html,body{background:#f8fafc}}
    </style>\n    `;

      // 插入到 <meta charset> 之后
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    ${preconnect}${criticalBg}`
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    performanceOptimizations(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
      ],
      manifest: {
        name: 'Momentum - 心理学驱动的专注力应用',
        short_name: 'Momentum',
        description: '帮助您建立高效的工作习惯，通过任务链和专注模式提升生产力',
        lang: 'zh-CN',
        theme_color: '#6366F1',
        background_color: '#0F0F12',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
    // Bundle 分析工具 - 运行 npm run build 后查看 stats.html
    visualizer({
      filename: 'stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      // 优化 lucide-react barrel file 导入
      // 将 import { X } from 'lucide-react' 转换为直接导入
      'lucide-react': 'lucide-react/dist/esm/lucide-react',
    },
  },
  optimizeDeps: {
    include: ['lucide-react'],
    // 强制预构建以避免开发时的延迟
    force: false,
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
