// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "stats.html", // file will be created in project root
      open: true,             // auto-open in browser after build
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          mui: ["@mui/material", "@mui/icons-material"],
          mrt: ["material-react-table"],
        },
      },
    },
  },
});
