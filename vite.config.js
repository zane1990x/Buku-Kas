import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'demo' ? [viteSingleFile()] : [],
  build: mode === 'demo' ? { outDir: 'demo-dist' } : {},
}))
