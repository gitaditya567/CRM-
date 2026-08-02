import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split heavy utility packages to keep the initial boot bundle small
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx') || id.includes('html2pdf.js')) {
              return 'vendor-pdf-excel';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            // Keep all core UI/React packages (react, react-dom, react-router, lucide-react, framer-motion, react-hot-toast, axios)
            // together in a single default vendor bundle to prevent context/boot order issues like "createContext is undefined".
          }
        }
      }
    },
    chunkSizeWarningLimit: 1200
  }
})
