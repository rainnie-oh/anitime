import { defineConfig } from "vite";
import {cmsPlugin} from "./server/cms.mjs";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "127.0.0.1",
    fs: { deny: ['.env', '.env.*', '**/.git/**', '**/.cms/**', '**/server/**'] },
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(),cmsPlugin()],
});
