/// <reference types="vitest" />
import { defineConfig } from 'vite'
import path from 'path'
import dotenv from 'dotenv'
import react from '@vitejs/plugin-react'
import VitePluginSVGSpritemap from '@spiriit/vite-plugin-svg-spritemap'
import vitePluginGCPStorage from './vite-plugin-gcp-storage'
import { createStyleImportPlugin, VantResolve } from 'vite-plugin-style-import'

dotenv.config({ path: '.env' })
const CDN_PATH = process.env.VITE_CDN_PATH || ''
const VITE_MODE = process.env.VITE_MODE || 'production'

export default defineConfig({
  base: CDN_PATH ? `https://s.codatta.io/${CDN_PATH}` : '/m',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  esbuild: {
    drop: VITE_MODE == 'production' ? ['console'] : [],
  },
  build: {
    minify: 'esbuild', // 使用 esbuild 进行代码最小化
    cssCodeSplit: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const libs = ['@dynamic-labs', '@faker-js', '@tonconnect', 'antd-mobile', 'phaser']
            const matches = id.match(/(?:node_modules\/)([^\/]+)/)

            if (matches?.[1] && libs.includes(matches[1])) {
              return matches[1]
            }
          }
          // 动态引入的模块单独打包
          if (id.includes('src/pages')) {
            const dirs = path.relative(path.resolve(__dirname, 'src/pages'), id).split(path.sep)
            const dirName = dirs[dirs.length - 2] || ''
            const fileName = path.parse(dirs[dirs.length - 1]).name
            return `pages_${dirName && dirName !== 'pages' ? dirName + '_' : ''}${fileName}`
          }
        },
        entryFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? path.dirname(chunkInfo.facadeModuleId) : null
          const dirs = facadeModuleId ? facadeModuleId.split(path.sep) : []
          const dirName = dirs.length > 0 ? `${dirs[dirs.length - 1]}` : ''
          return `assets/${dirName && dirName !== 'pages' ? dirName + '_' : ''}[name]-[hash].js`
        },
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      treeshake: {
        moduleSideEffects: 'no-external', // 移除无副作用的外部模块
      },
    },
  },
  server: {
    port: 5175,
    open: false,
    host: '0.0.0.0',
    proxy: {
      '^/api/': {
        // target: 'https://app.b18a.io',
        target: 'https://app.codatta.io',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    vitePluginGCPStorage({
      bucket: 'static-chaintool-ai',
      keyFile: path.resolve(__dirname, './chaintool-etl-32deb09152c3.json'),
      exclude: ['**/*.map', '**/*.html'],
      bucketDomain: 'https://static.codatta.io',
      uploadPath: CDN_PATH,
    }),
    react(),
    createStyleImportPlugin({ resolves: [VantResolve()] }),
    VitePluginSVGSpritemap('./src/assets/icons/svg/*.svg', {
      prefix: 'svg-sprite-',
      svgo: {
        plugins: [
          {
            name: 'removeStyleElement',
          },
        ],
      },
      // styles: 'src/styles/virtual:svg-spritemap.css',
    }),
    {
      name: 'html-transform',
      async transformIndexHtml(html) {
        // 提取所有预加载链接
        const preloads = html.match(/<link rel="modulepreload".*?>/g) || []
        const preloadLinks: string[] = []
        const entryScript = html.match(/<script type="module".*?\/?>(<\/script>)?/g) || []

        // 提取模块预加载链接
        preloads.forEach((preload) => {
          const match = preload.match(/href="([^"]+)"/)
          if (match?.[1]) {
            preloadLinks.push(match[1])
          }
        })

        // 移除预加载链接
        html = html
          .replace(/<link rel="modulepreload".*?>/g, '')
          .replace(/<script type="module".*?\/?>(<\/script>)?/g, '')

        // 插入动态预加载脚本
        const preloadScript = `
<script>
  const preloadLinks = ${JSON.stringify(preloadLinks)};
  preloadLinks.forEach((href) => {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);  // 动态插入到 head 中
  });
</script>
        `
        html = html.replace('</body>', `${entryScript}${preloadScript}\n</body>`)
        // 使用正则表达式去掉标签之间的空格和换行符
        html = html.replace(/\/>\s+</g, '/> <').replace(/\n+/g, '\n')

        return html
      },
      apply: 'build', // 确保只在构建时应用
    },
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: '.vitest/setup',
    include: ['**/test.{ts,tsx}'],
  },
})
