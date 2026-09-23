import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Il service worker si aggiorna da solo; la UI avvisa quando e' pronto.
      registerType: 'autoUpdate',
      includeAssets: [
        'apple-touch-icon.png',
        'favicon-96.png',
        'pwa-192.png',
        'pwa-512.png',
        'pwa-maskable-512.png',
      ],
      manifest: {
        name: 'Spese Casa',
        short_name: 'Spese Casa',
        description: 'Spese condivise di casa e budget personale',
        lang: 'it',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/mesi',
        scope: '/',
        theme_color: '#c4aef7',
        background_color: '#fff4e8',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell in precache: l'avvio funziona anche senza rete.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/index.html',
        // Le rotte API non devono mai cadere nel fallback di navigazione.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Letture delle API: si mostra subito la copia in cache e intanto
            // si riscarica. Offline resta consultabile quel che si e' gia'
            // visitato (periodi, riepiloghi, registri).
            urlPattern: ({ url, request }) =>
              url.pathname.startsWith('/api/') && request.method === 'GET',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-letture',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-file',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // In sviluppo il SW resta spento: eviterebbe di vedere le modifiche.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // In sviluppo il frontend chiama "/api/..." e Vite fa da proxy verso
    // il backend: nessun problema di CORS e nessun URL assoluto nel codice.
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // `vite preview` serve la build vera (service worker incluso): i test della
  // PWA girano li', e hanno bisogno dello stesso proxy dello sviluppo.
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Recharts e' il pacchetto piu' pesante: in un chunk a parte resta
        // in cache fra i deploy e non rallenta il primo caricamento.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers/zod'],
        },
      },
    },
  },
});
