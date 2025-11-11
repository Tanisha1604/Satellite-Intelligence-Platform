import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Make environment variables available to the client
    'import.meta.env.VITE_LYZR_API_KEY': JSON.stringify(process.env.VITE_LYZR_API_KEY || ''),
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
