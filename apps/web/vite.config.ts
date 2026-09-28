import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // relative asset paths, so the build also works inside Tauri / Capacitor / Telegram
  base: "./",
});
