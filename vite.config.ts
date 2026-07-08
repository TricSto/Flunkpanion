import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relativer Base-Pfad, damit das Deployment auf GitHub Pages / Unterordnern
  // genauso funktioniert wie auf einer eigenen Domain.
  base: './',
})
