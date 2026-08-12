import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isPagesBuild = process.env.GITHUB_PAGES === 'true'
const siteBase = isPagesBuild ? '/flash-card/' : '/'

export default defineConfig({
  base: siteBase,
  build: { outDir: process.env.BUILD_OUTPUT_DIR ?? 'dist' },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '苔卡 Moss Card',
        short_name: '苔卡',
        description: '安静、可靠的间隔重复闪卡',
        theme_color: '#2f5d50',
        background_color: '#f4f0e6',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: siteBase,
        icons: [
          { src: `${siteBase}icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'font-cache' }
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    css: true
  }
})
