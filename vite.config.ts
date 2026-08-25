import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: {
      clientPort: 443,
    },
    cors: true,
    // @ts-ignore - allowedHosts exists in newer vite
    allowedHosts: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
