import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vue core
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/vue-i18n')) {
            return 'vue-core'
          }
          // Charts
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/vue-chartjs')) {
            return 'charts'
          }
          // Mermaid (very heavy - isolated chunk)
          if (id.includes('node_modules/mermaid') || id.includes('node_modules/cytoscape') || id.includes('node_modules/katex')) {
            return 'mermaid'
          }
          // Markdown editor
          if (id.includes('node_modules/md-editor-v3') || id.includes('node_modules/markdown-it') || id.includes('node_modules/marked')) {
            return 'markdown'
          }
          // Session replay
          if (id.includes('node_modules/rrweb')) {
            return 'rrweb'
          }
          // PDF / export
          if (id.includes('node_modules/html2pdf') || id.includes('node_modules/html-docx') || id.includes('node_modules/file-saver')) {
            return 'export'
          }
          // Emoji
          if (id.includes('node_modules/emoji-picker-element')) {
            return 'emoji'
          }
          // Lottie animations
          if (id.includes('node_modules/vue3-lottie') || id.includes('node_modules/@lottiefiles')) {
            return 'lottie'
          }
          // Drag and drop
          if (id.includes('node_modules/vuedraggable') || id.includes('node_modules/sortablejs')) {
            return 'dnd'
          }
          // Axios + DOMPurify
          if (id.includes('node_modules/axios') || id.includes('node_modules/dompurify')) {
            return 'utils'
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3535',
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: 'http://127.0.0.1:3535',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://localhost:3535',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
