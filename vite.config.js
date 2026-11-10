import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 0.0.0.0 — reachable from phones on the LAN
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
});
