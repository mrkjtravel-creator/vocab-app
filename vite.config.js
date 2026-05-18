import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: '英文生詞表',
        short_name: '生詞表',
        description: '個人英文單字學習工具',
        theme_color: '#2563eb',
        background_color: '#f1f5f9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/vocab-app/',
        scope: '/vocab-app/',
        lang: 'zh-TW',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Never cache Anthropic API calls
            urlPattern: /^https:\/\/api\.anthropic\.com\//,
            handler: 'NetworkOnly',
          },
          {
            // Cache dictionary audio for 7 days
            urlPattern: /^https:\/\/api\.dictionaryapi\.dev\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dict-api-cache',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 7, maxEntries: 200 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Cache Google Apps Script responses briefly
            urlPattern: /script\.google\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gas-cache',
              expiration: { maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 8,
            },
          },
        ],
      },
    }),
  ],
  base: '/vocab-app/',
})
