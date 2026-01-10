import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 8090,
    allowedHosts: ["finance.zikkis.fr"]
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
