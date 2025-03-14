import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { plugin } from "web-dash-builder";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), plugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/mge": {
        target: "http://192.168.0.101:8180",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mge/, "/mge/"),
      },
    },
  },
});
