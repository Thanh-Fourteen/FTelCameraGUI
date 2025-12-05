import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    // basicSsl()
  ],
  server: {
    host: true,
    port: 5173,
    // allowedHosts: ['app.doca.love'],
    proxy: {
      '/api': {
        target: "http://192.168.1.130:5171",
        changeOrigin: true,
        secure: false,
      },
      '/vec-api': {
        target: "http://192.168.1.130:8686/v1",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/vec-api/, '')
      },
      '/fra-api': {
        target: "http://192.168.1.130:2022",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/fra-api/, '')
      },
      '/det-api': {
        target: "http://192.168.1.130:2468",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/det-api/, '')
      },
    }
  }
})
