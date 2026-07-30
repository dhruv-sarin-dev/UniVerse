import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Uni-Verse | Build the team before you build the project',
        short_name: 'Uni-Verse',
        description: 'Find teammates across every department, check they fit the work, and build somewhere that records who did what.',
        // Matches the Field Manual stock, so the install splash and browser
        // chrome do not flash the old dark theme before the app paints.
        theme_color: '#E6E7E1',
        background_color: '#E6E7E1',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ]
})
