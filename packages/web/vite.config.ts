import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // REST API proxy
      "/api": {
        target: "http://localhost:3344",
        changeOrigin: true,
        ws: true,
        // Rewrite WebSocket upgrade
        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.log("[Vite Proxy] Error:", err.message);
          });
          proxy.on("proxyReq", (proxyReq, req) => {
            console.log("[Vite Proxy]", req.method, req.url);
          });
        },
      },
    },
  },
});
