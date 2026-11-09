import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Torna o app instalável no celular. Só as telas ficam guardadas no aparelho;
    // os dados de glicemia sempre vêm do Supabase, nunca de uma cópia antiga.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Glicemia',
        short_name: 'Glicemia',
        description: 'Registro e acompanhamento de glicemia',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f6f6',
        theme_color: '#0f766e',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
