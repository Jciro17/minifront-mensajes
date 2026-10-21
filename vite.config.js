import { defineConfig, loadEnv } from 'vite'

// dev     -> http://localhost:5176/            (playground para probar el widget)
// preview -> http://localhost:5176/messageucolab.js  (bundle que importan las otras apps)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.MESSAGEUCOLAB_BACKEND || 'http://localhost:8085'

  return {
    root: '.',
    server: {
      port: 5176,
      strictPort: true,
      cors: true,
      proxy: { '^/messageucolab/.*': { target: backend, changeOrigin: true } }
    },
    preview: {
      port: 5176,
      strictPort: true,
      cors: true,
      proxy: {} // el bundle se sirve tal cual, sin reenviar nada
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      lib: {
        entry: 'src/messageucolab.js',
        formats: ['es'],
        fileName: () => 'messageucolab.js'
      }
    }
  }
})
