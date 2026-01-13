import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Cloudflare Tunnel (trycloudflare) üzerinden gelen hostu kabul et
    // En kolayı: wildcard aç
    allowedHosts: [".trycloudflare.com"],
  },
});
