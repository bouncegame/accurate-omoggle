import { cpSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// MediaPipe's FilesetResolver needs to fetch its WASM artifacts at runtime.
// Loading them from a third-party CDN couples us to (a) the exact published
// version on that CDN and (b) the CDN serving the right MIME type. Both have
// broken in the wild, so instead we copy the WASM bundle that ships with the
// installed @mediapipe/tasks-vision package into `public/mediapipe/` and serve
// it from our own origin. This guarantees the version matches package.json
// and removes any external runtime dependency.
function copyMediapipeWasm(): Plugin {
  const dest = path.resolve(__dirname, 'public/mediapipe')
  const src = path.resolve(__dirname, 'node_modules/@mediapipe/tasks-vision/wasm')
  return {
    name: 'copy-mediapipe-wasm',
    buildStart() {
      rmSync(dest, { recursive: true, force: true })
      mkdirSync(dest, { recursive: true })
      cpSync(src, dest, { recursive: true })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyMediapipeWasm()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
