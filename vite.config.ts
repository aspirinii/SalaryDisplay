/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // 상대 경로: 로컬 preview, GitHub Pages(하위 경로), Tauri 모두 그대로 동작
  base: './',
  plugins: [
    react(),
    VitePWA({
      // 등록은 앱에서 직접 (src/components/UpdatePrompt.tsx)
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'SalaryDisplay — 실시간 월급 카운터',
        short_name: '월급 카운터',
        description: '근무시간 동안 오늘·이번 주·이번 달 번 돈이 초 단위로 쌓이는 모습을 보여줍니다.',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#111312',
        theme_color: '#111312',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        // 새 서비스 워커가 바로 넘겨받음 → 다음 새로고침부터 새 버전.
        // 지금 열려 있는 화면에는 앱이 알림을 띄워 새로고침 (UpdatePrompt)
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
