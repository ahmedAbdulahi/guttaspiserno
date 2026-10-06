import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8731,
    // I dev sendes /api til Kotlin-backenden, slik Vercel gjør i prod
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
