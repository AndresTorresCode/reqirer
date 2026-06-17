import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuracion de Vite. El proxy reenvia las llamadas /api al backend
// Express (puerto 4000) durante el desarrollo, evitando problemas de CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
