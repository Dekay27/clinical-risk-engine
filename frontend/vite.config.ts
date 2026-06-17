import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/clinical-risk-engine/",
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: "..",
    emptyOutDir: false,
  },
});
