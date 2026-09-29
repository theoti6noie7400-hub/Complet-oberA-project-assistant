import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/Complet-oberA-project-assistant/",
  plugins: [react()],
  server: {
    host: process.env.VITE_INTERNAL_API === "1" || process.env.VITE_SAV_RECIPE_API === "1" ? "127.0.0.1" : true,
    port: 5173,
    proxy: process.env.VITE_INTERNAL_API === "1" || process.env.VITE_SAV_RECIPE_API === "1"
      ? { "/api": "http://127.0.0.1:3000" }
      : undefined
  },
  preview: { host: true, port: 4173 },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"]
  }
});
