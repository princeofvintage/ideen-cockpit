import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Die App liegt später unter https://princeofvintage.github.io/ideen-cockpit/
export default defineConfig({
  base: '/ideen-cockpit/',
  plugins: [react()],
  // Versionsnummer = Zeitpunkt des Bauens, damit man auf dem iPhone sieht, welche Version läuft
  define: { __VERSION__: JSON.stringify(new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })) },
  server: { port: 5182 },
})
