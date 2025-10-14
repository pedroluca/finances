import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [
        // Excluir arquivos de backend do build do frontend
        /^.*\/services\/.*\.service\.ts$/,
        /^.*\/lib\/db\.ts$/,
      ]
    }
  }
})
