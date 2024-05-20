import glsl from "vite-plugin-glsl";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [glsl()],
  resolve: {
    alias: {
      "@": "/src/",
      "@utils": "/src/utils/",
      "@uses": "/src/uses/",
      "@types": "/src/types/",
    },
  },
});
