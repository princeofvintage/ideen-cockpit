import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Die App liegt später unter https://princeofvintage.github.io/ideen-cockpit/
export default defineConfig({
  base: '/ideen-cockpit/',
  plugins: [react()],
  server: { port: 5182 },
})
