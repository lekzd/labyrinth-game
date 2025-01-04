import glsl from "vite-plugin-glsl";
import react from '@vitejs/plugin-react'
import { defineConfig } from "vite";
import path from 'path'

export default defineConfig({
  plugins: [react(), glsl()],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    mainFiles: ['index'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
