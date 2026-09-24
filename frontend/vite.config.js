import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/get_location.php': {
        target: 'http://localhost/shuttle_tracking',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  status: 'error',
                  message: 'Backend Apache/XAMPP is not reachable (กรุณาเปิด Apache ใน XAMPP Control Panel)'
                })
              );
            }
          });
        }
      }
    }
  }
})
