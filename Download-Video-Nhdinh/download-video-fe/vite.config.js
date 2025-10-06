import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,jpeg,svg}"],
        maximumFileSizeToCacheInBytes: 3000000,
      },
      includeAssets: ["favicon.ico", "logo192.jpg", "logo512.png"],
      manifest: {
        name: "Nhdinh Downloader Pro",
        short_name: "Downloader Pro",
        description:
          "Tải video nhanh, miễn phí từ Facebook, Instagram, TikTok và nhiều nền tảng khác.",
        theme_color: "#ffffff",
        background_color: "#0b1220",
        display: "standalone",
        icons: [
          {
            src: "logo192.jpg",
            sizes: "192x192",
            type: "image/jpeg",
          },
          {
            src: "logo512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@assets": path.resolve(__dirname, "./src/assets"),
      "@layouts": path.resolve(__dirname, "./src/layouts"),
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          ui: ["antd", "@mui/material", "@emotion/react", "@emotion/styled"],
          icons: ["react-icons"],
          animation: ["framer-motion"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "antd",
      "@mui/material",
      "@emotion/react",
      "@emotion/styled",
      "react-icons",
      "framer-motion",
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
    modules: {
      localsConvention: "camelCase",
    },
  },
  define: {
    "process.env": {},
  },
});
